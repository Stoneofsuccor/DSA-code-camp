import { DomainError } from '../domain/errors.js';
import { randomUUID } from 'node:crypto';
import { clock } from '../lib/clock.js';

export function createWaitlistService(repository) {
  return {
    async joinWaitlist(tierId, userId) {
      const tier = await repository.getTierById(tierId);
      if (!tier) throw new DomainError('NOT_FOUND', 'Tier not found');
      
      if (tier.capacity - tier.sold > 0) {
        throw new DomainError('NOT_SOLD_OUT', 'Seats are still available');
      }

      const existing = await repository.getWaitlistEntry(tierId, userId);
      if (existing) throw new DomainError('ALREADY_ON_WAITLIST', 'You are already on the waitlist');

      await repository.addToWaitlist({
        id: randomUUID(),
        eventId: tier.event_id, // Note: sqlite returns snake_case
        tierId,
        userId,
        createdAt: clock.now(),
        status: 'waiting'
      });
    },

    async acceptOffer(waitlistId, userId) {
      const entry = await repository.getWaitlistById(waitlistId);
      if (!entry || entry.userId !== userId) throw new DomainError('NOT_FOUND', 'Offer not found');
      
      if (entry.status !== 'offered') throw new DomainError('INVALID_STATE', 'No active offer');
      
      if (clock.now() > entry.offerExpiresAt) {
        await repository.updateWaitlistStatus(waitlistId, 'expired');
        throw new DomainError('OFFER_EXPIRED', 'The offer has expired');
      }

      await repository.updateWaitlistStatus(waitlistId, 'accepted');
      return { success: true };
    }
  };
}