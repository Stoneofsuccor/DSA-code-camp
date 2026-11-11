import { createServer } from 'node:http';
import { createRouter } from './http/router.js';
import { sendError, serveStatic, readJsonBody } from './http/app.js';
import { config } from './config.js';
import { DomainError } from './domain/errors.js';
import { createMemoryRepository } from './repositories/memory.js';
import { createEventService } from './services/eventService.js';
import { createBookingService } from './services/bookingService.js';

const repo = createMemoryRepository();
const eventService = createEventService(repo);
const bookingService = createBookingService(repo);

const router = createRouter();

// --- API ROUTES ---

router.get('/health', (req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok' }));
});

// 1. Create Event
router.post('/api/events', async (req, res) => {
  const body = await readJsonBody(req);
  const event = await eventService.createEvent(body.title, body.city, body.venue, body.date);
  res.writeHead(201, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(event));
});

// 2. Add Tier
router.post('/api/events/:id/tiers', async (req, res) => {
  const body = await readJsonBody(req);
  const tier = await eventService.addTier(req.params.id, body.name, body.priceInCents, body.capacity);
  res.writeHead(201, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(tier));
});

// 3. Publish Event
router.post('/api/events/:id/publish', async (req, res) => {
  const event = await eventService.publish(req.params.id);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(event));
});

// 4. Search Events
router.get('/api/events', async (req, res) => {
  const results = await eventService.search(req.query);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(results));
});

// 5. Book Tickets
router.post('/api/bookings', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) throw new DomainError('VALIDATION', 'x-user-id header required');
  
  const body = await readJsonBody(req);
  const booking = await bookingService.bookTickets(body.eventId, body.tierId, body.quantity, userId);
  res.writeHead(201, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(booking));
});

// 6. Pay Booking
router.post('/api/bookings/:reference/pay', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) throw new DomainError('VALIDATION', 'x-user-id header required');
  
  const booking = await bookingService.payBooking(req.params.reference, userId);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(booking));
});

// 7. Cancel Booking
router.post('/api/bookings/:reference/cancel', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) throw new DomainError('VALIDATION', 'x-user-id header required');
  
  const booking = await bookingService.cancelBooking(req.params.reference, userId);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(booking));
});

// --- SERVER STARTUP ---

const server = createServer(async (req, res) => {
  try {
    const handledByApi = await router.handle(req, res);
    if (handledByApi !== false) return;

    const handledByStatic = serveStatic(req, res, config.publicDir);
    if (handledByStatic) return;

    if (!res.headersSent) sendError(res, 404, 'NOT_FOUND', 'Page not found');
  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      if (error instanceof DomainError) {
        // Map error codes to HTTP status codes
        let status = 400;
        if (error.code === 'NOT_FOUND') status = 404;
        if (error.code === 'FORBIDDEN') status = 403;
        if (error.code === 'SOLD_OUT') status = 409;
        if (error.code === 'PAYMENT_DECLINED') status = 402; // Payment Required
        
        sendError(res, status, error.code, error.message);
      } else {
        sendError(res, 500, 'INTERNAL_ERROR', 'Something went wrong.');
      }
    }
  }
});

server.listen(config.port, () => {
  console.log(`Server running at http://localhost:${config.port}`);
});
