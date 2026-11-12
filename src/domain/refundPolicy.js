import { DomainError } from './errors.js';

export function calculateRefund({ amountCents, startsAt, now }) {
  const startMs = new Date(startsAt).getTime();
  
  if (now >= startMs) {
    throw new DomainError('EVENT_STARTED', 'Cannot refund an event that has already started.');
  }

  const msUntilStart = startMs - now;
  const daysUntilStart = msUntilStart / (1000 * 60 * 60 * 24);

  let refundPercentage = 0;
  
  // Rule: 7 days or more = 100%, 2 days or more = 50%, under 2 days = 0%
  if (daysUntilStart >= 7) {
    refundPercentage = 1.0; 
  } else if (daysUntilStart >= 2) {
    refundPercentage = 0.5;
  } else {
    refundPercentage = 0;
  }

  return Math.floor(amountCents * refundPercentage);
}