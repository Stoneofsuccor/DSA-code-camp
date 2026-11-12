// Import the custom error class so we can throw specific business errors (e.g., SOLD_OUT, FORBIDDEN)
import { DomainError } from '../domain/errors.js';

// Import the state machine rules (e.g., pending -> paid) and the constants (STATES.PAID)
import { assertTransition, STATES } from '../domain/bookingStateMachine.js';

// Import the fake payment processor
import { mockPaymentGateway } from '../lib/mockPaymentGateway.js';

// Import the refund rules (100% if >7 days, 50% if >2 days, etc.)
import { calculateRefund } from '../domain/refundPolicy.js';

export function createBookingService(repository) {
  return {
    
    // ==========================================
    // 1. BOOK TICKETS
    // ==========================================
    async bookTickets(eventId, tierId, quantity, userId) {
      // Find the event in the database
      const event = await repository.getEventById(eventId);
      if (!event) throw new DomainError('NOT_FOUND', 'Event not found');
      
      // Rule: You cannot book tickets for a draft event
      if (event.status !== 'published') throw new DomainError('INVALID_STATE', 'Event is not published');

      // Find the specific ticket tier (e.g., General or VIP)
      const tier = event.tiers.get(tierId);
      if (!tier) throw new DomainError('NOT_FOUND', 'Tier not found');
      
      // Rule: A single booking can only be for 1 to 10 tickets
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
        throw new DomainError('VALIDATION', 'Quantity must be 1-10');
      }

      // Rule: We do an atomic UPDATE in the database. 
      // This checks if seats are available AND deducts them in one step to stop overselling.
      const reserved = await repository.reserveSeatAtomic(tierId, quantity);
      if (!reserved) {
        // If the database returns false, it means the seats were taken by someone else a millisecond before.
        throw new DomainError('SOLD_OUT', 'Not enough seats');
      }

      // Generate a 6-character booking code (e.g., "A1B2C3")
      const reference = crypto.randomUUID().slice(0, 6).toUpperCase();
      
      // Create the booking object
      const booking = {
        reference,
        eventId,
        tierId,
        quantity,
        userId,
        status: STATES.PENDING, // It starts as 'pending' until paid
        amountCents: tier.price_in_cents * quantity, // e.g., 5000 * 2 = 10000 cents
        
        // 👇 THIS IS THE LINE YOU ASKED ABOUT 👇
        // We add a timestamp. The background maintenance job will later check this
        // to cancel unpaid bookings if they are older than 15 minutes.
        createdAt: Date.now() 
      };

      // Save the booking to the database
      await repository.saveBooking(booking);
      return booking;
    },

    // ==========================================
    // 2. PAY BOOKING
    // ==========================================
    async payBooking(reference, userId) {
      // Find the booking by its reference code (e.g., "A1B2C3")
      const booking = await repository.getBookingByReference(reference);
      if (!booking) throw new DomainError('NOT_FOUND', 'Booking not found');
      
      // Rule: You can only pay for a booking that YOU made
      if (booking.userId !== userId) {
        throw new DomainError('FORBIDDEN', 'You do not own this booking');
      }

      // Rule: Check the state machine. Can we go from 'pending' to 'paid'? (Yes)
      // If the booking is already 'cancelled', this will throw an error.
      assertTransition(booking.status, STATES.PAID);

      // Call the mock payment gateway to charge the card
      const paymentResult = await mockPaymentGateway.charge(booking.amountCents);
      
      // Rule: If the mock card is declined, throw an error and leave it as 'pending'
      if (!paymentResult.success) {
        throw new DomainError('PAYMENT_DECLINED', 'Card declined');
      }

      // Update the status to PAID
      booking.status = STATES.PAID;
      await repository.updateBookingStatus(reference, STATES.PAID);
      return booking;
    },

    // ==========================================
    // 3. GET REFUND PREVIEW (New in Build 8)
    // ==========================================
    async getBookingForRefund(reference, userId) {
      const booking = await repository.getBookingByReference(reference);
      if (!booking) throw new DomainError('NOT_FOUND', 'Booking not found');
      
      // Rule: You can only preview your own refunds
      if (booking.userId !== userId) throw new DomainError('FORBIDDEN', 'You do not own this booking');
      
      // Rule: You cannot refund an already cancelled booking
      if (booking.status === STATES.CANCELLED) throw new DomainError('INVALID_STATE', 'Already cancelled');
      
      const event = await repository.getEventById(booking.eventId);
      
      let refundAmountCents = 0;
      
      // If the booking is already paid, calculate the refund based on how many days away the event is
      if (booking.status === STATES.PAID) {
        refundAmountCents = calculateRefund({
          amountCents: booking.amountCents,
          startsAt: event.date, // The event's start date
          now: Date.now()       // Current time
        });
      }

      // Return just the amount so the frontend can show a confirm dialog
      return { refundAmountCents };
    },

    // ==========================================
    // 4. CANCEL BOOKING (Updated for Build 8)
    // ==========================================
    async cancelBooking(reference, userId) {
      const booking = await repository.getBookingByReference(reference);
      if (!booking) throw new DomainError('NOT_FOUND', 'Booking not found');
      
      // Rule: You can only cancel your own booking
      if (booking.userId !== userId) throw new DomainError('FORBIDDEN', 'You do not own this booking');

      // Rule: You cannot cancel twice
      if (booking.status === STATES.CANCELLED) {
        throw new DomainError('INVALID_TRANSITION', 'This booking is already cancelled.');
      }
      
      // Rule: You cannot cancel if you've already checked in or been refunded
      if (booking.status === STATES.CHECKED_IN || booking.status === STATES.REFUNDED) {
        throw new DomainError('INVALID_TRANSITION', `Cannot cancel a booking that is ${booking.status}.`);
      }

      const event = await repository.getEventById(booking.eventId);
      let refundAmountCents = 0;

      // If the booking was PAID, we must calculate the refund
      if (booking.status === STATES.PAID) {
        refundAmountCents = calculateRefund({
          amountCents: booking.amountCents,
          startsAt: event.date,
          now: Date.now()
        });

        // If the refund policy says they get money back (e.g., > 0 cents), process it
        if (refundAmountCents > 0) {
          await mockPaymentGateway.refund(booking.reference, refundAmountCents);
        }
      }

      // 1. Release the seats back to the ticket tier (so others can buy them)
      await repository.releaseSeats(booking.tierId, booking.quantity);
      
      // 2. Figure out the new status (REFUNDED if they paid, CANCELLED if they didn't)
      const newStatus = booking.status === STATES.PAID ? STATES.REFUNDED : STATES.CANCELLED;
      
      // 3. Update the database
      await repository.updateBookingStatus(reference, newStatus);
      
      // 4. Update the local object so the API response reflects the change
      booking.status = newStatus;
      booking.refundedAmountCents = refundAmountCents;
      
      return booking;
    }
  };
}