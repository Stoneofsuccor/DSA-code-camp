import { createDatabaseConnection } from '../src/db/connection.js';
import { createSqliteRepository } from '../src/repositories/sqlite.js';
import { createBookingService } from '../src/services/bookingService.js';
import { DomainError } from '../src/domain/errors.js';
import { randomUUID } from 'node:crypto';

async function run() {
  const db = createDatabaseConnection(':memory:'); // Use memory DB for the demo
  const repo = createSqliteRepository(db);
  const bookingService = createBookingService(repo);

  // 1. Create an event and a tier with EXACTLY 1 seat
  const eventId = randomUUID();
  const tierId = randomUUID();
  
  await repo.saveEvent({ id: eventId, title: 'Gladiator', city: 'Rome', venue: 'Colosseum', date: '2026-01-01', status: 'published' });
  
  // We insert the tier directly so we can force the state
  db.prepare('INSERT INTO ticket_tiers (id, event_id, name, price_in_cents, capacity, sold) VALUES (?, ?, ?, ?, ?, ?)')
    .run(tierId, eventId, 'General', 5000, 1, 0); // Capacity 1, Sold 0

  console.log('🔥 Event created with exactly 1 seat left.');
  console.log('Firing 50 booking requests at the same time...\n');

  // 2. Fire 50 requests simultaneously using Promise.all
  const promises = [];
  for (let i = 0; i < 50; i++) {
    promises.push(
      bookingService.bookTickets(eventId, tierId, 1, `user_${i}`)
        .then(() => 'SUCCESS')
        .catch(err => err instanceof DomainError ? err.code : 'UNKNOWN_ERROR')
    );
  }

  // 3. Wait for all to finish
  const results = await Promise.all(promises);

  // 4. Count the results
  const successes = results.filter(r => r === 'SUCCESS').length;
  const soldOut = results.filter(r => r === 'SOLD_OUT').length;

  console.log(`✅ Successful bookings: ${successes}`);
  console.log(`❌ SOLD_OUT errors:     ${soldOut}`);
  
  // 5. Check the database to ensure it didn't exceed capacity
  const tier = db.prepare('SELECT sold, capacity FROM ticket_tiers WHERE id = ?').get(tierId);
  console.log(`\n📊 Database state: Sold ${tier.sold} out of ${tier.capacity} capacity.`);
  
  if (successes === 1 && tier.sold === 1) {
    console.log('\n🏆 PASS: The last ticket was sold to exactly ONE person.');
  } else {
    console.log('\n🚨 FAIL: Overselling occurred! The database limit was breached.');
  }
}

run().catch(console.error);