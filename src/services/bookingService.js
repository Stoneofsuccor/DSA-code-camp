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

      const seatsLeft = tier.capacity - tier.booked;
      if (quantity > seatsLeft) throw new DomainError('SOLD_OUT', 'Not enough seats');

      // All validations passed. Create the booking.
      const reference = crypto.randomUUID().slice(0, 6).toUpperCase();
      const booking = {
        reference,
        eventId,
        tierId,
        quantity,
        userId, // Track who made the booking
        status: STATES.PENDING, // Uses the state machine constants
        amountCents: tier.priceInCents * quantity
      };

      // Mutate state
      tier.booked += quantity;
      await repository.saveEvent(event); // Save mutated event
      await repository.saveBooking(booking);
      
      return booking;
    },

    async payBooking(reference, userId) {
      const booking = await repository.getBookingByReference(reference);
      if (!booking) throw new DomainError('NOT_FOUND', 'Booking not found');
      
      // Rule: Only the person who made it can pay
      if (booking.userId !== userId) {
        throw new DomainError('FORBIDDEN', 'You do not own this booking');
      }

      // Rule: State machine check (e.g., can't pay a cancelled booking)
      assertTransition(booking.status, STATES.PAID);

      // Call the mock gateway
      const paymentResult = await mockPaymentGateway.charge(booking.amountCents);
      
      if (!paymentResult.success) {
        // Rule: Declined card leaves booking pending
        throw new DomainError('PAYMENT_DECLINED', 'Card declined');
      }

      booking.status = STATES.PAID;
      await repository.saveBooking(booking);
      return booking;
    },

    async cancelBooking(reference, userId) {
      const booking = await repository.getBookingByReference(reference);
      if (!booking) throw new DomainError('NOT_FOUND', 'Booking not found');
      
      if (booking.userId !== userId) throw new DomainError('FORBIDDEN', 'You do not own this booking');

      // Rule: For Build 4, only unpaid (pending) bookings can be cancelled
      if (booking.status !== STATES.PENDING) {
        throw new DomainError('INVALID_TRANSITION', 'Only pending bookings can be cancelled');
      }

      const event = await repository.getEventById(booking.eventId);
      const tier = event.tiers.get(booking.tierId);

      // Release seats
      tier.booked -= booking.quantity;
      booking.status = STATES.CANCELLED;
      
      await repository.saveEvent(event);
      await repository.saveBooking(booking);
      return booking;
    }
  };
}