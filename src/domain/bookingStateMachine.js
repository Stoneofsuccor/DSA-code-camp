import { DomainError } from './errors.js';

// Define the states as a constant to prevent typos
export const STATES = {
  PENDING: 'pending',
  PAID: 'paid',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
  CHECKED_IN: 'checked_in'
};

// Define the allowed transitions (from -> to)
const ALLOWED_TRANSITIONS = {
  [STATES.PENDING]: [STATES.PAID, STATES.CANCELLED],
  [STATES.PAID]: [STATES.CHECKED_IN, STATES.REFUNDED, STATES.CANCELLED],
  // Final states: empty arrays mean nothing can leave them
  [STATES.CANCELLED]: [],
  [STATES.REFUNDED]: [],
  [STATES.CHECKED_IN]: []
};

/**
 * Checks if a transition is legal. Returns true or false.
 */
export function canTransition(fromState, toState) {
  const allowed = ALLOWED_TRANSITIONS[fromState];
  if (!allowed) return false; // Unknown state
  return allowed.includes(toState);
}

/**
 * Asserts a transition is legal. Throws a DomainError if it is not.
 * We use this in our services to enforce the rules before saving to the database.
 */
export function assertTransition(fromState, toState) {
  if (!canTransition(fromState, toState)) {
    throw new DomainError(
      'INVALID_TRANSITION', 
      `Cannot move booking from "${fromState}" to "${toState}".`
    );
  }
}