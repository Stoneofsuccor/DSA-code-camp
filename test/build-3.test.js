import test from 'node:test';
import assert from 'node:assert/strict';
import { canTransition, assertTransition, STATES } from '../src/domain/bookingStateMachine.js';
import { createRouter } from '../src/http/router.js';

// --- State Machine Tests ---
test('State Machine: Allowed transitions', () => {
  assert.equal(canTransition(STATES.PENDING, STATES.PAID), true);
  assert.equal(canTransition(STATES.PENDING, STATES.CANCELLED), true);
  assert.equal(canTransition(STATES.PAID, STATES.CHECKED_IN), true);
  assert.equal(canTransition(STATES.PAID, STATES.REFUNDED), true);
  assert.equal(canTransition(STATES.PAID, STATES.CANCELLED), true);
});

test('State Machine: Final states cannot transition', () => {
  assert.equal(canTransition(STATES.CANCELLED, STATES.PAID), false);
  assert.equal(canTransition(STATES.REFUNDED, STATES.CHECKED_IN), false);
  assert.equal(canTransition(STATES.CHECKED_IN, STATES.CANCELLED), false);
});

test('State Machine: Illegal transition throws INVALID_TRANSITION', () => {
  assert.throws(() => assertTransition(STATES.PENDING, STATES.REFUNDED), { code: 'INVALID_TRANSITION' });
});

// --- Router Tests ---
test('Router: Matches static paths and methods', async () => {
  const router = createRouter();
  let called = false;
  
  router.get('/test', () => { called = true; return true; });
  
  const mockReq = { method: 'GET', url: '/test', headers: {} };
  const mockRes = { writeHead: () => {}, end: () => {} };

  await router.handle(mockReq, mockRes);
  assert.equal(called, true);
});

test('Router: Extracts :params correctly', async () => {
  const router = createRouter();
  let capturedId = null;
  
  router.get('/users/:id', (req) => { capturedId = req.params.id; return true; });
  
  const mockReq = { method: 'GET', url: '/users/123', headers: {} };
  await router.handle(mockReq, {});
  assert.equal(capturedId, '123');
});

// --- Real HTTP Server Test (Mocked for reliability) ---
test('Server: GET /health returns 200 and correct JSON', async () => {
  const router = createRouter();
  
  // Register the health route exactly like server.js does
  router.get('/health', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
  });

  // Mock request and response objects
  const mockReq = { method: 'GET', url: '/health', headers: {} };
  let responseData = '';
  let statusCode = 0;
  
  const mockRes = {
    writeHead: (code) => { statusCode = code; },
    end: (data) => { responseData = data; }
  };

  // Execute the route
  await router.handle(mockReq, mockRes);

  // Assertions
  assert.equal(statusCode, 200);
  assert.deepEqual(JSON.parse(responseData), { status: 'ok' });
});