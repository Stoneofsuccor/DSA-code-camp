import { WaitlistQueue } from '../domain/waitlistQueue.js';

/**
 * An in-memory repository.
 * Services receive this as an argument (Dependency Injection) so they don't 
 * import it directly. This makes it easy to swap for SQLite in Build 5.
 */
export function createMemoryRepository() {
  const events = new Map();
  const bookings = new Map();
  const waitlists = new Map();

  return {
    // --- Events ---
    async saveEvent(event) {
      events.set(event.id, event);
      if (!waitlists.has(event.id)) {
        waitlists.set(event.id, new WaitlistQueue());
      }
      return event;
    },
    async getEventById(id) {
      return events.get(id) || null;
    },
    async getAllEvents() {
      return Array.from(events.values());
    },

    // --- Bookings ---
    async saveBooking(booking) {
      bookings.set(booking.reference, booking);
      return booking;
    },
    async getBookingByReference(reference) {
      return bookings.get(reference) || null;
    },
    
    // --- Waitlists ---
    async getWaitlist(eventId) {
      return waitlists.get(eventId) || null;
    }
  };
}