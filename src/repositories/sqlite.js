import { WaitlistQueue } from '../domain/waitlistQueue.js';

export function createSqliteRepository(db) {
  return {
    // --- Events ---
    async saveEvent(event) {
      const stmt = db.prepare(`
        INSERT INTO events (id, title, city, venue, date, status)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET status = excluded.status
      `);
      stmt.run(event.id, event.title, event.city, event.venue, event.date, event.status);
      return event;
    },

    async getEventById(id) {
      const stmt = db.prepare('SELECT * FROM events WHERE id = ?');
      const row = stmt.get(id);
      if (!row) return null;
      
      // Load tiers for this event
      const tiersStmt = db.prepare('SELECT * FROM ticket_tiers WHERE event_id = ?');
      const tiers = tiersStmt.all(id);
      
      return {
        id: row.id,
        title: row.title,
        city: row.city,
        venue: row.venue,
        date: row.date,
        status: row.status,
        tiers: new Map(tiers.map(t => [t.id, t]))
      };
    },

    async getAllEvents() {
      const stmt = db.prepare('SELECT * FROM events');
      const rows = stmt.all();
      // For simplicity in this build, we return events without tiers attached here
      return rows;
    },

    // --- Tiers ---
    async saveTier(tier) {
      const stmt = db.prepare(`
        INSERT INTO ticket_tiers (id, event_id, name, price_in_cents, capacity, sold)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      stmt.run(tier.id, tier.eventId, tier.name, tier.priceInCents, tier.capacity, tier.sold);
      return tier;
    },

    /**
     * THE CRITICAL FIX FOR OVERSELLING:
     * We do a single atomic UPDATE. The database engine guarantees that only ONE 
     * connection will satisfy the WHERE clause at a time.
     * If the changes count is 0, it means someone else got the seat first.
     */
    async reserveSeatAtomic(tierId, quantity) {
      const stmt = db.prepare(`
        UPDATE ticket_tiers 
        SET sold = sold + ? 
        WHERE id = ? AND sold + ? <= capacity
      `);
      const result = stmt.run(quantity, tierId, quantity);
      
      // result.changes is 1 if we successfully reserved, 0 if it was sold out
      return result.changes > 0;
    },

    // --- Bookings ---
    async saveBooking(booking) {
      const stmt = db.prepare(`
        INSERT INTO bookings (reference, event_id, tier_id, user_id, quantity, amount_cents, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        booking.reference, booking.eventId, booking.tierId, 
        booking.userId, booking.quantity, booking.amountCents, booking.status
      );
      return booking;
    },

    async getBookingByReference(reference) {
      const stmt = db.prepare('SELECT * FROM bookings WHERE reference = ?');
      const row = stmt.get(reference);
      if (!row) return null;
      return {
        reference: row.reference,
        eventId: row.event_id,
        tierId: row.tier_id,
        userId: row.user_id,
        quantity: row.quantity,
        amountCents: row.amount_cents,
        status: row.status
      };
    },

    async updateBookingStatus(reference, status) {
      const stmt = db.prepare('UPDATE bookings SET status = ? WHERE reference = ?');
      stmt.run(status, reference);
    }
  };
}