import { createServer } from 'node:http';
import { createRouter } from './http/router.js';
import { sendError, serveStatic, readJsonBody } from './http/app.js';
import { config } from './config.js';
import { DomainError } from './domain/errors.js';

// Database and Repositories
import { createDatabaseConnection } from './db/connection.js';
import { createSqliteRepository } from './repositories/sqlite.js';

// Services
import { createEventService } from './services/eventService.js';
import { createBookingService } from './services/bookingService.js';
import { createAuthService } from './services/authService.js';
import { createWaitlistService } from './services/waitlistService.js';
import { createCheckinService } from './services/checkinService.js';

// Guards, Jobs, and Tokens
import { requireUser, requireRole } from './http/guards.js';
import { createMaintenanceJob } from './jobs/maintenance.js';
import { signTicket, verifyTicket } from './lib/ticketToken.js';

const db = createDatabaseConnection('database.sqlite');
const repo = createSqliteRepository(db);

const eventService = createEventService(repo);
const bookingService = createBookingService(repo);
const authService = createAuthService(repo);
const waitlistService = createWaitlistService(repo);
const checkinService = createCheckinService(repo);

const router = createRouter();

// --- API ROUTES ---

router.get('/health', (req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok' }));
});

// Auth
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

router.get('/api/auth/me', async (req, res) => {
  const user = requireUser(req);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(user));
});

// Events
router.get('/api/events/:id', async (req, res) => {
  const event = await eventService.getEvent(req.params.id);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(event));
});

router.post('/api/events', async (req, res) => {
  const user = requireRole(req, ['organizer']);
  const body = await readJsonBody(req);
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

// Bookings
router.post('/api/bookings', async (req, res) => {
  const user = requireUser(req);
  const body = await readJsonBody(req);
  const booking = await bookingService.bookTickets(body.eventId, body.tierId, body.quantity, user.id);
  res.writeHead(201, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(booking));
});

router.get('/api/bookings/my', async (req, res) => {
  const user = requireUser(req);
  const bookings = await bookingService.getUserBookings(user.id);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(bookings));
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

// Ticket Token & Check-in
router.get('/api/bookings/:reference/ticket-token', async (req, res) => {
  const user = requireUser(req);
  // Ensure the user owns the booking
  await bookingService.getBookingForRefund(req.params.reference, user.id); 
  
  // Generate the secure token
  const ticketToken = signTicket(req.params.reference);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ticketToken }));
});

router.post('/api/checkin', async (req, res) => {
  const user = requireRole(req, ['staff']);
  const body = await readJsonBody(req);
  
  const reference = verifyTicket(body.ticketToken);
  const result = await checkinService.checkIn(reference);
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(result));
});

// Waitlist
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
const maintenanceJob = createMaintenanceJob(repo);
setInterval(() => {
  maintenanceJob.run().catch(console.error);
}, 60 * 1000);

const server = createServer(async (req, res) => {
  try {
    // Security Headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self' 'unsafe-inline';");

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