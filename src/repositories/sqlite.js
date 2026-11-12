export function createSqliteRepository(db) {
  return {
    // --- Events ---
    async saveEvent(event) {
      const stmt = db.prepare(`
        INSERT INTO events (id, title, city, venue, date, status, owner_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET status = excluded.status
      `);
      stmt.run(event.id, event.title, event.city, event.venue, event.date, event.status, event.ownerId || null);
      return event;
    },

    async getEventById(id) {
      const stmt = db.prepare('SELECT * FROM events WHERE id = ?');
      const row = stmt.get(id);
      if (!row) return null;
      
      const tiersStmt = db.prepare('SELECT * FROM ticket_tiers WHERE event_id = ?');
      const tiers = tiersStmt.all(id);
      
      return {
        id: row.id,
        title: row.title,
        city: row.city,
        venue: row.venue,
        date: row.date,
        status: row.status,
        ownerId: row.owner_id,
        tiers: new Map(tiers.map(t => [t.id, t]))
      };
    },

    async getAllEvents() {
      const stmt = db.prepare('SELECT * FROM events');
      return stmt.all();
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

    async getTierById(tierId) {
      const stmt = db.prepare('SELECT * FROM ticket_tiers WHERE id = ?');
      return stmt.get(tierId);
    },

    async reserveSeatAtomic(tierId, quantity) {
      const stmt = db.prepare(`
        UPDATE ticket_tiers 
        SET sold = sold + ? 
        WHERE id = ? AND sold + ? <= capacity
      `);
      const result = stmt.run(quantity, tierId, quantity);
      return result.changes > 0;
    },

    async releaseSeats(tierId, quantity) {
      const stmt = db.prepare('UPDATE ticket_tiers SET sold = MAX(0, sold - ?) WHERE id = ?');
      stmt.run(quantity, tierId);
    },

    // --- Bookings ---
    async saveBooking(booking) {
      const stmt = db.prepare(`
        INSERT INTO bookings (reference, event_id, tier_id, user_id, quantity, amount_cents, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        booking.reference, booking.eventId, booking.tierId, 
        booking.userId, booking.quantity, booking.amountCents, booking.status, booking.createdAt
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
        status: row.status,
        createdAt: row.created_at
      };
    },

    async updateBookingStatus(reference, status) {
      const stmt = db.prepare('UPDATE bookings SET status = ? WHERE reference = ?');
      stmt.run(status, reference);
    },

    async getExpiredPendingBookings(cutoffTime) {
      const stmt = db.prepare(`
        SELECT * FROM bookings 
        WHERE status = 'pending' AND created_at < ?
      `);
      const rows = stmt.all(cutoffTime);
      return rows.map(row => ({
        reference: row.reference,
        eventId: row.event_id,
        tierId: row.tier_id,
        userId: row.user_id,
        quantity: row.quantity,
        amountCents: row.amount_cents,
        status: row.status,
        createdAt: row.created_at
      }));
    },

    // --- Users ---
    async saveUser(user) {
      const stmt = db.prepare(`
        INSERT INTO users (id, email, password_hash, role)
        VALUES (?, ?, ?, ?)
      `);
      stmt.run(user.id, user.email, user.passwordHash, user.role);
      return user;
    },

    async getUserByEmail(email) {
      const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
      const row = stmt.get(email);
      if (!row) return null;
      return {
        id: row.id,
        email: row.email,
        passwordHash: row.password_hash,
        role: row.role
      };
    },

    // --- Waitlist ---
    async addToWaitlist(entry) {
      const stmt = db.prepare(`
        INSERT INTO waitlist (id, event_id, tier_id, user_id, created_at, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      stmt.run(entry.id, entry.eventId, entry.tierId, entry.userId, entry.createdAt, entry.status);
    },

    async getWaitlistEntry(tierId, userId) {
      const stmt = db.prepare('SELECT * FROM waitlist WHERE tier_id = ? AND user_id = ? AND status = ?');
      return stmt.get(tierId, userId, 'waiting');
    },

    async getWaitlistById(id) {
      const stmt = db.prepare('SELECT * FROM waitlist WHERE id = ?');
      const row = stmt.get(id);
      if (!row) return null;
      return {
        id: row.id, tierId: row.tier_id, userId: row.user_id, 
        createdAt: row.created_at, status: row.status, offerExpiresAt: row.offer_expires_at
      };
    },

    async getNextInWaitlist(tierId) {
      const stmt = db.prepare(`
        SELECT * FROM waitlist 
        WHERE tier_id = ? AND status = 'waiting' 
        ORDER BY created_at ASC LIMIT 1
      `);
      const row = stmt.get(tierId);
      if (!row) return null;
      return {
        id: row.id, tierId: row.tier_id, userId: row.user_id, 
        createdAt: row.created_at, status: row.status
      };
    },

    async updateWaitlistStatus(id, status, offerExpiresAt = null) {
      const stmt = db.prepare('UPDATE waitlist SET status = ?, offer_expires_at = ? WHERE id = ?');
      stmt.run(status, offerExpiresAt, id);
    },

    async getExpiredWaitlistOffers(now) {
      const stmt = db.prepare(`
        SELECT * FROM waitlist 
        WHERE status = 'offered' AND offer_expires_at <= ?
      `);
      const rows = stmt.all(now);
      return rows.map(row => ({
        id: row.id,
        eventId: row.event_id,
        tierId: row.tier_id,
        userId: row.user_id,
        createdAt: row.created_at,
        status: row.status,
        offerExpiresAt: row.offer_expires_at
      }));
    }
  };
}