import { WaitlistQueue } from '../domain/waitlistQueue.js';

/**
 * An in-memory repository.
 * Services receive this as an argument (Dependency Injection) so they don't 
 * import it directly. This makes it easy to swap for SQLite in Build 5.
 */
export function createMemoryRepository() {
  const events = new Map();
  const bookings = new Map();
  const waitlists = new Map(); // We are changing this from a Queue to a Map for Build 8
  
  // New in Build 8: A store for waitlist entries
  const waitlistEntries = new Map(); 

  return {
    // --- Events ---
    async saveEvent(event) {
      events.set(event.id, event);
      return event;
    },
    async getEventById(id) {
      return events.get(id) || null;
    },
    async getAllEvents() {
      return Array.from(events.values());
    },

    // --- Tiers ---
    async getTierById(tierId) {
      // Loop through all events to find the tier
      for (const event of events.values()) {
        if (event.tiers && event.tiers.has(tierId)) {
          return event.tiers.get(tierId);
        }
      }
      return null;
    },
    
    async releaseSeats(tierId, quantity) {
      const tier = await this.getTierById(tierId);
      if (tier) {
        tier.sold = Math.max(0, tier.sold - quantity);
      }
    },

    // --- Bookings ---
    async saveBooking(booking) {
      bookings.set(booking.reference, booking);
      return booking;
    },
    async getBookingByReference(reference) {
      return bookings.get(reference) || null;
    },
    
    // New: Needed for the maintenance job
    async getExpiredPendingBookings(cutoffTime) {
      const results = [];
      for (const booking of bookings.values()) {
        // If it is pending AND was created before the cutoff time
        if (booking.status === 'pending' && booking.createdAt && booking.createdAt < cutoffTime) {
          results.push(booking);
        }
      }
      return results;
    },
    
    async updateBookingStatus(reference, status) {
      const booking = bookings.get(reference);
      if (booking) {
        booking.status = status;
      }
    },

    // --- Waitlist (Build 8) ---
    async addToWaitlist(entry) {
      waitlistEntries.set(entry.id, entry);
    },

    async getWaitlistEntry(tierId, userId) {
      for (const entry of waitlistEntries.values()) {
        if (entry.tierId === tierId && entry.userId === userId && entry.status === 'waiting') {
          return entry;
        }
      }
      return null;
    },

    async getWaitlistById(waitlistId) {
      return waitlistEntries.get(waitlistId) || null;
    },

    async getNextInWaitlist(tierId) {
      let next = null;
      for (const entry of waitlistEntries.values()) {
        if (entry.tierId === tierId && entry.status === 'waiting') {
          // If we haven't found one yet, or this entry is older, it's the new "next"
          if (!next || entry.createdAt < next.createdAt) {
            next = entry;
          }
        }
      }
      return next;
    },

    async updateWaitlistStatus(waitlistId, status, offerExpiresAt = null) {
      const entry = waitlistEntries.get(waitlistId);
      if (entry) {
        entry.status = status;
        if (offerExpiresAt) entry.offerExpiresAt = offerExpiresAt;
      }
    },

    // New: Needed for the maintenance job to pass expired offers on
    async getExpiredWaitlistOffers(now) {
      const results = [];
      for (const entry of waitlistEntries.values()) {
        if (entry.status === 'offered' && entry.offerExpiresAt && entry.offerExpiresAt <= now) {
          results.push(entry);
        }
      }
      return results;
    },
    
    // Keep the old getWaitlist for backwards compatibility if anything still uses it
    async getWaitlist(eventId) {
      return waitlists.get(eventId) || null;
    }
  };
}