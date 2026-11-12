import { DomainError } from '../domain/errors.js';
import { STATES } from '../domain/bookingStateMachine.js';
import { clock } from '../lib/clock.js';

export function createCheckinService(repository) {
  return {
    async checkIn(bookingReference) {
      const booking = await repository.getBookingByReference(bookingReference);
      if (!booking) throw new DomainError('NOT_FOUND', 'Booking not found');

      if (booking.status === STATES.CANCELLED || booking.status === STATES.REFUNDED) {
        throw new DomainError('INVALID_STATE', `Cannot check in a booking that is ${booking.status}.`);
      }

      if (booking.status === STATES.CHECKED_IN) {
        const time = new Date(booking.checkedInAt).toLocaleString();
        throw new DomainError('DUPLICATE_SCAN', `This ticket was already scanned at ${time}.`);
      }

      if (booking.status !== STATES.PAID) {
        throw new DomainError('INVALID_STATE', `Cannot check in a booking that is ${booking.status}.`);
      }

      const now = clock.now();
      const success = await repository.atomicCheckIn(bookingReference, now);
      
      if (!success) {
        throw new DomainError('DUPLICATE_SCAN', 'This ticket was just scanned by another staff member.');
      }

      return { success: true, message: 'Check-in successful' };
    }
  };
}