import { clock } from '../lib/clock.js';
import { createSeatService } from '../services/seatService.js';

export function createMaintenanceJob(repository) {
  const seatService = createSeatService(repository);
  const HOLD_TIME_MS = 15 * 60 * 1000; // 15 minutes

  return {
    async run() {
      const now = clock.now();

      // 1. Expire unpaid bookings
      const expiredBookings = await repository.getExpiredPendingBookings(now - HOLD_TIME_MS);
      for (const booking of expiredBookings) {
        await repository.updateBookingStatus(booking.reference, 'cancelled');
        await seatService.releaseSeatsAndOffer(booking.tierId, booking.quantity);
      }

      // 2. Expire waitlist offers
      const expiredOffers = await repository.getExpiredWaitlistOffers(now);
      for (const offer of expiredOffers) {
        await repository.updateWaitlistStatus(offer.id, 'expired');
        // Pass the offer to the next person
        const next = await repository.getNextInWaitlist(offer.tierId);
        if (next) {
          const newExpiry = now + (10 * 60 * 1000);
          await repository.updateWaitlistStatus(next.id, 'offered', newExpiry);
        }
      }
    }
  };
}