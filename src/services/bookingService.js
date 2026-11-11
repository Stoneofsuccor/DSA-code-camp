import { DomainError } from '../domain/errors.js';
import { assertTransition, STATES } from '../domain/bookingStateMachine.js';
import { mockPaymentGateway } from '../lib/mockPaymentGateway.js';

export function createBookingService(repository) {
  return {
    async bookTickets(eventId, tierId, quantity, userId) {
      const event = await repository.getEventById(eventId);
      if (!event) throw new DomainError('NOT_FOUND', 'Event not found');
      if (event.status !== 'published') throw new DomainError('INVALID_STATE', 'Event is not published');

      const tier = event.tiers.get(tierId);
      if (!tier) throw new DomainError('NOT_FOUND', 'Tier not found');
      
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
        throw new DomainError('VALIDATION', 'Quantity must be 1-10');
      }

      // REPLACED JS CHECK WITH ATOMIC DB UPDATE
      const reserved = await repository.reserveSeatAtomic(tierId, quantity);
      if (!reserved) {
        throw new DomainError('SOLD_OUT', 'Not enough seats');
      }

      const reference = crypto.randomUUID().slice(0, 6).toUpperCase();
      const booking = {
        reference,
        eventId,
        tierId,
        quantity,
        userId,
        status: STATES.PENDING,
        amountCents: tier.price_in_cents * quantity // Note: SQLite returns snake_case!
      };

      await repository.saveBooking(booking);
      return booking;
    },

    async payBooking(reference, userId) {
      const booking = await repository.getBookingByReference(reference);
      if (!booking) throw new DomainError('NOT_FOUND', 'Booking not found');
      
      if (booking.userId !== userId) {
        throw new DomainError('FORBIDDEN', 'You do not own this booking');
      }

      assertTransition(booking.status, STATES.PAID);

      const paymentResult = await mockPaymentGateway.charge(booking.amountCents);
      
      if (!paymentResult.success) {
        throw new DomainError('PAYMENT_DECLINED', 'Card declined');
      }

      booking.status = STATES.PAID;
      await repository.updateBookingStatus(reference, STATES.PAID);
      return booking;
    },

    async cancelBooking(reference, userId) {
      const booking = await repository.getBookingByReference(reference);
      if (!booking) throw new DomainError('NOT_FOUND', 'Booking not found');
      
      if (booking.userId !== userId) throw new DomainError('FORBIDDEN', 'You do not own this booking');

      if (booking.status !== STATES.PENDING) {
        throw new DomainError('INVALID_TRANSITION', 'Only pending bookings can be cancelled');
      }

      // In Build 5, we just update the booking status. 
      // In Build 8, we will write the code to add the seats back to the tier.
      await repository.updateBookingStatus(reference, STATES.CANCELLED);
      booking.status = STATES.CANCELLED;
      return booking;
    }
  };
}