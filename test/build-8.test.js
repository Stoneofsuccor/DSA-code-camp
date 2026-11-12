import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRefund } from '../src/domain/refundPolicy.js';
import { clock } from '../src/lib/clock.js';
import { createMaintenanceJob } from '../src/jobs/maintenance.js';
import { createMemoryRepository } from '../src/repositories/memory.js';

test('Refund Policy: Boundary Cases', () => {
  const startsAt = '2026-12-10T00:00:00Z';
  const startMs = new Date(startsAt).getTime();
  const amount = 10000; // 100.00

  // 1. Exactly 7 days before (100% refund)
  let now = startMs - (7 * 24 * 60 * 60 * 1000);
  assert.equal(calculateRefund({ amountCents: amount, startsAt, now }), 10000);

  // 2. 6 days 23 hours (50% refund)
  now = startMs - ((6 * 24 * 60 * 60 * 1000) + (23 * 60 * 60 * 1000));
  assert.equal(calculateRefund({ amountCents: amount, startsAt, now }), 5000);

  // 3. Exactly 2 days (50% refund)
  now = startMs - (2 * 24 * 60 * 60 * 1000);
  assert.equal(calculateRefund({ amountCents: amount, startsAt, now }), 5000);

  // 4. 1 day 23 hours (0% refund)
  now = startMs - ((1 * 24 * 60 * 60 * 1000) + (23 * 60 * 60 * 1000));
  assert.equal(calculateRefund({ amountCents: amount, startsAt, now }), 0);
});

test('Maintenance Job: Expires unpaid bookings and releases seats', async () => {
  const repo = createMemoryRepository();
  
  // Setup a mock tier with 10 capacity, 2 sold.
  const tierId = 'tier_1';
  const eventId = 'event_1';
  repo.saveEvent({ id: eventId, status: 'published', tiers: new Map([[tierId, { id: tierId, capacity: 10, sold: 2, priceInCents: 5000 }]]) });

  // Create a pending booking created 20 minutes ago
  const twentyMinsAgo = Date.now() - (20 * 60 * 1000);
  repo.saveBooking({
    reference: 'REF123',
    eventId,
    tierId,
    quantity: 2,
    userId: 'user_1',
    status: 'pending',
    createdAt: twentyMinsAgo
  });

  const job = createMaintenanceJob(repo);
  
  // Run the job
  await job.run();

  // Assertions
  const booking = await repo.getBookingByReference('REF123');
  assert.equal(booking.status, 'cancelled', 'Booking should be cancelled');
  
  const tier = (await repo.getEventById(eventId)).tiers.get(tierId);
  assert.equal(tier.sold, 0, '2 seats should be released back to the tier');
});