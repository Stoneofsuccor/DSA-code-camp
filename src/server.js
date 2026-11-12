import { createServer } from 'node:http';
import { createRouter } from './http/router.js';
import { sendError, serveStatic, readJsonBody } from './http/app.js';
import { config } from './config.js';
import { DomainError } from './domain/errors.js';

// --- SQLITE SETUP ---
import { createDatabaseConnection } from './db/connection.js';
import { createSqliteRepository } from './repositories/sqlite.js';

// --- SERVICES SETUP ---
import { createEventService } from './services/eventService.js';
import { createBookingService } from './services/bookingService.js';
import { createAuthService } from './services/authService.js'; // Build 7
import { createWaitlistService } from './services/waitlistService.js'; // Build 8
import { requireUser, requireRole } from './http/guards.js'; // Build 7
import { createMaintenanceJob } from './jobs/maintenance.js'; // Build 8

// Initialize DB and Services
const db = createDatabaseConnection('database.sqlite');
const repo = createSqliteRepository(db);
const eventService = createEventService(repo);
const bookingService = createBookingService(repo);
const authService = createAuthService(repo); // Build 7
const waitlistService = createWaitlistService(repo); // Build 8

const router = createRouter();

// --- API ROUTES ---

router.get('/health', (req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok' }));
});

// --- BUILD 7: AUTH ROUTES ---
router.post('/api/auth/signup', async (req, res) => {
  const body = await readJsonBody(req);
  const result = await authService.signup(body.email, body.password, body.role);
  res.writeHead(201, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(result));
});

router.post('/api/auth/login', async (req, res) => {
  const body = await readJsonBody(req);
  const result = await authService.login(body.email, body.password);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(result));
});

router.get('/api/events/:id', async (req, res) => {
  const event = await eventService.getEvent(req.params.id);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(event));
});

router.get('/api/auth/me', async (req, res) => {
  const user = requireUser(req);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(user));
});

// --- BUILD 4: EVENT ROUTES ---
router.post('/api/events', async (req, res) => {
  const user = requireRole(req, ['organizer']); // Only organizers can create
  const body = await readJsonBody(req);
  // Note: we are passing user.id to link the event to the organizer
  const event = await eventService.createEvent(body.title, body.city, body.venue, body.date, user.id);
  res.writeHead(201, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(event));
});

router.post('/api/events/:id/tiers', async (req, res) => {
  const user = requireRole(req, ['organizer']);
  const body = await readJsonBody(req);
  const tier = await eventService.addTier(req.params.id, body.name, body.priceInCents, body.capacity);
  res.writeHead(201, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(tier));
});

router.post('/api/events/:id/publish', async (req, res) => {
  const user = requireRole(req, ['organizer']);
  const event = await eventService.publish(req.params.id);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(event));
});

router.get('/api/events', async (req, res) => {
  const results = await eventService.search(req.query);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(results));
});

// --- BUILD 4 & 8: BOOKING ROUTES ---
router.post('/api/bookings', async (req, res) => {
  const user = requireUser(req); // Replaces x-user-id
  const body = await readJsonBody(req);
  const booking = await bookingService.bookTickets(body.eventId, body.tierId, body.quantity, user.id);
  res.writeHead(201, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(booking));
});

router.post('/api/bookings/:reference/pay', async (req, res) => {
  const user = requireUser(req);
  const booking = await bookingService.payBooking(req.params.reference, user.id);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(booking));
});

router.get('/api/bookings/:reference/refund-preview', async (req, res) => {
  const user = requireUser(req);
  const preview = await bookingService.getBookingForRefund(req.params.reference, user.id);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(preview));
});

router.post('/api/bookings/:reference/cancel', async (req, res) => {
  const user = requireUser(req);
  const booking = await bookingService.cancelBooking(req.params.reference, user.id);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(booking));
});

// --- BUILD 8: WAITLIST ROUTES ---
router.post('/api/waitlist', async (req, res) => {
  const user = requireUser(req);
  const body = await readJsonBody(req);
  await waitlistService.joinWaitlist(body.tierId, user.id);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ success: true }));
});

router.post('/api/waitlist/:id/accept', async (req, res) => {
  const user = requireUser(req);
  await waitlistService.acceptOffer(req.params.id, user.id);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ success: true }));
});


// --- SERVER STARTUP ---

// Start the background maintenance job (Build 8)
const maintenanceJob = createMaintenanceJob(repo);
setInterval(() => {
  maintenanceJob.run().catch(console.error);
}, 60 * 1000); // Run every minute

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
        let status = 400;
        if (error.code === 'NOT_FOUND') status = 404;
        if (error.code === 'FORBIDDEN') status = 403;
        if (error.code === 'SOLD_OUT') status = 409;
        if (error.code === 'PAYMENT_DECLINED') status = 402;
        if (error.code === 'UNAUTHENTICATED') status = 401;
        
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