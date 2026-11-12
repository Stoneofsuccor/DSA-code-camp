import { randomUUID } from 'node:crypto';
import { clock } from '../lib/clock.js';

export function createSeatService(repository) {
  return {
    /**
     * Releases seats back to the tier. 
     * Then checks if anyone is waiting and offers them the seat.
     */
    async releaseSeatsAndOffer(tierId, quantity) {
      // 1. Release the seats
      await repository.releaseSeats(tierId, quantity);

      // 2. Check the waitlist for the next person
      const nextPerson = await repository.getNextInWaitlist(tierId);
      
      if (nextPerson) {
        // 3. Create a timed offer (e.g., 10 minutes)
        const offerExpiry = clock.now() + (10 * 60 * 1000); 
        await repository.updateWaitlistStatus(nextPerson.id, 'offered', offerExpiry);
      }
    }
  };
}