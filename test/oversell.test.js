import test from 'node:test';
import assert from 'node:assert/strict';
import { createDatabaseConnection } from '../src/db/connection.js';
import { createSqliteRepository } from '../src/repositories/sqlite.js';
import { createBookingService } from '../src/services/bookingService.js';
import { DomainError } from '../src/domain/errors.js';
import { randomUUID } from 'node:crypto';

test('Oversell: 50 simultaneous bookings for 1 seat', async () => {
  const db = createDatabaseConnection(':memory:');
  const repo = createSqliteRepository(db);
  const bookingService = createBookingService(repo);

  const eventId = randomUUID();
  const tierId = randomUUID();
  
  await repo.saveEvent({ id: eventId, title: 'Gladiator', city: 'Rome', venue: 'Colosseum', date: '2026-01-01', status: 'published' });
  db.prepare('INSERT INTO ticket_tiers (id, event_id, name, price_in_cents, capacity, sold) VALUES (?, ?, ?, ?, ?, ?)')
    .run(tierId, eventId, 'General', 5000, 1, 0);

  const promises = [];
  for (let i = 0; i < 50; i++) {
    promises.push(
      bookingService.bookTickets(eventId, tierId, 1, `user_${i}`)
        .then(() => 'SUCCESS')
        .catch(err => err.code)
    );
  }

  const results = await Promise.all(promises);

  const successes = results.filter(r => r === 'SUCCESS').length;
  const soldOutErrors = results.filter(r => r === 'SOLD_OUT').length;

  // Assertions
  assert.equal(successes, 1, 'Exactly 1 booking should succeed');
  assert.equal(soldOutErrors, 49, '49 bookings should fail with SOLD_OUT');
  
  // Check the DB constraint physically held
  const tier = db.prepare('SELECT sold, capacity FROM ticket_tiers WHERE id = ?').get(tierId);
  assert.equal(tier.sold, 1, 'Database should show exactly 1 ticket sold');
});