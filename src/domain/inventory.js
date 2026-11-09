import { DomainError } from './errors.js';
import { newId, newReference } from './ids.js';
import { WaitlistQueue } from './waitlistQueue.js';

/**
 * Creates the central store that holds all events, bookings, and waitlists.
 * We use Maps for O(1) lookups.
 */
export function createStore() {
  return {
    events: new Map(),      // eventId -> event object
    bookings: new Map(),    // reference -> booking object
    waitlists: new Map(),   // eventId -> WaitlistQueue
  };
}

// UPDATED in Build 2: Now includes title, city, venue, and status
export function createEvent(store, title, city, venue, date) {
  if (!title || typeof title !== 'string') {
    throw new DomainError('VALIDATION', 'Title is required.');
  }
  if (!city || typeof city !== 'string') {
    throw new DomainError('VALIDATION', 'City is required.');
  }
  
  // Basic date validation (ISO string check)
  if (!date || isNaN(Date.parse(date))) {
    throw new DomainError('VALIDATION', 'A valid ISO date is required.');
  }

  const event = {
    id: newId(),
    title,
    city,
    venue,
    date: new Date(date).toISOString(),
    status: 'draft', // S02: Saved as draft initially
    tiers: new Map(), // tierId -> tier object
  };
  
  store.events.set(event.id, event);
  store.waitlists.set(event.id, new WaitlistQueue()); // Initialize the queue
  return event;
}

export function addTier(store, eventId, tierName, priceInCents, capacity) {
  const event = store.events.get(eventId);
  if (!event) throw new DomainError('NOT_FOUND', 'Event not found.');
  
  // Rule: Money must be whole cents
  if (!Number.isInteger(priceInCents) || priceInCents < 0) {
    throw new DomainError('VALIDATION', 'Price must be a whole positive integer.');
  }
  if (!Number.isInteger(capacity) || capacity < 1) {
    throw new DomainError('VALIDATION', 'Capacity must be a positive integer.');
  }

  const tier = {
    id: newId(),
    name: tierName,
    priceInCents,
    capacity,
    booked: 0 // Track how many are sold
  };
  
  event.tiers.set(tier.id, tier);
  return tier;
}

export function bookTickets(store, eventId, tierId, quantity, buyerName) {
  const event = store.events.get(eventId);
  if (!event) throw new DomainError('NOT_FOUND', 'Event not found.');
  
  const tier = event.tiers.get(tierId);
  if (!tier) throw new DomainError('NOT_FOUND', 'Tier not found.');

  // Rule: Validate every input
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
    throw new DomainError('VALIDATION', 'You can only book between 1 and 10 tickets.');
  }

  const seatsLeft = tier.capacity - tier.booked;
  
  // Rule: If not enough seats, throw SOLD_OUT and change nothing.
  // We check this BEFORE modifying any state to ensure atomicity.
  if (quantity > seatsLeft) {
    throw new DomainError('SOLD_OUT', `Not enough seats. Only ${seatsLeft} left.`);
  }

  // Generate a unique reference, ensuring it doesn't accidentally collide.
  let reference;
  do {
    reference = newReference();
  } while (store.bookings.has(reference));

  // Create the booking
  const booking = {
    reference,
    eventId,
    tierId,
    quantity,
    buyerName,
    status: 'CONFIRMED'
  };

  // Apply changes ONLY after all validations pass
  tier.booked += quantity;
  store.bookings.set(reference, booking); // O(1) insertion
  
  return booking;
}

export function cancelBooking(store, reference) {
  const booking = store.bookings.get(reference);
  if (!booking) throw new DomainError('NOT_FOUND', 'Booking not found.');

  // Rule: Cancelling twice is an error
  if (booking.status === 'CANCELLED') {
    throw new DomainError('VALIDATION', 'This booking is already cancelled.');
  }

  const event = store.events.get(booking.eventId);
  const tier = event.tiers.get(booking.tierId);

  // Release the seats
  tier.booked -= booking.quantity;
  booking.status = 'CANCELLED';
  
  return booking;
}

/**
 * Rule: Find a booking by its reference in O(1) with a Map.
 */
export function findBookingByReference(store, reference) {
  const booking = store.bookings.get(reference); // O(1) time complexity
  if (!booking) throw new DomainError('NOT_FOUND', 'Booking not found.');
  return booking;
}

export function joinWaitlist(store, eventId, buyerName) {
  const queue = store.waitlists.get(eventId);
  if (!queue) throw new DomainError('NOT_FOUND', 'Event not found.');
  
  queue.enqueue(buyerName);
  return queue.size;
}

// ==========================================
// BUILD 2 ADDITIONS BELOW
// ==========================================

// NEW: S04 Publish Event
export function publishEvent(store, eventId) {
  const event = store.events.get(eventId);
  if (!event) throw new DomainError('NOT_FOUND', 'Event not found.');

  // Rule: Cannot publish an event with no tiers
  if (event.tiers.size === 0) {
    throw new DomainError('INVALID_STATE', 'Cannot publish an event with no ticket tiers.');
  }

  event.status = 'published';
  return event;
}

// NEW: Summaries for Search/Filter
export function listEventSummaries(store, { publishedOnly = true } = {}) {
  const summaries = [];
  
  for (const event of store.events.values()) {
    if (publishedOnly && event.status !== 'published') continue;

    // Calculate price and availability from tiers
    let cheapestPriceCents = null;
    let totalSeatsLeft = 0;
    const prices = [];

    for (const tier of event.tiers.values()) {
      const seatsLeft = tier.capacity - tier.booked;
      totalSeatsLeft += seatsLeft;
      prices.push(tier.priceInCents);
    }

    if (prices.length > 0) {
      cheapestPriceCents = Math.min(...prices);
    }

    summaries.push({
      id: event.id,
      title: event.title,
      city: event.city,
      venue: event.venue,
      date: event.date,
      cheapestPriceCents,
      seatsLeft: totalSeatsLeft,
      hasTiers: event.tiers.size > 0
    });
  }
  
  return summaries;
}