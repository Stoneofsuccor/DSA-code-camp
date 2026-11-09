import { 
  createStore, createEvent, addTier, bookTickets, 
  cancelBooking, findBookingByReference, joinWaitlist 
} from '../src/domain/inventory.js';
import { DomainError } from '../src/domain/errors.js';

console.log('--- Event Ticketing Demo ---\n');

const store = createStore();

// 1. Setup Event
const event = createEvent(store, 'Tech Conference 2026', '2026-05-10');
const tier = addTier(store, event.id, 'General', 5000, 3); // 3 seats, 50.00
console.log(`Created Event: ${event.name} | Capacity: 3\n`);

// 2. Ada books 2 of 3 seats
const adaBooking = bookTickets(store, event.id, tier.id, 2, 'Ada');
console.log(`✅ Ada booked ${adaBooking.quantity} seats. Reference: ${adaBooking.reference}`);

// 3. Bayo refused for asking for 2 when only 1 is left
try {
  bookTickets(store, event.id, tier.id, 2, 'Bayo');
} catch (error) {
  console.log(`❌ Bayo refused: [${error.code}] ${error.message}`);
}

// 4. Event sells out (someone buys the last 1 seat)
const lastSeatBooking = bookTickets(store, event.id, tier.id, 1, 'Chidi');
console.log(`✅ Chidi booked the last seat. Reference: ${lastSeatBooking.reference}`);
console.log(`Sold out: Capacity is ${tier.capacity}, Booked is ${tier.booked}\n`);

// 5. Two people join the waitlist
console.log(`📝 Bayo joined waitlist. Position: ${joinWaitlist(store, event.id, 'Bayo')}`);
console.log(`📝 Dayo joined waitlist. Position: ${joinWaitlist(store, event.id, 'Dayo')}\n`);

// 6. Find a booking by its reference
const found = findBookingByReference(store, adaBooking.reference);
console.log(`🔍 Lookup successful: Found booking for ${found.buyerName} (${found.reference})\n`);

// 7. Ada cancels, freeing seats
cancelBooking(store, adaBooking.reference);
console.log(`🔄 Ada cancelled booking ${adaBooking.reference}. Seats released.\n`);

// 8. Waitlist shows who is next
const waitlist = store.waitlists.get(event.id);
console.log(`🔔 A seat is free! The next person in line is: ${waitlist.peek()}`);

// Clean up: Dequeue to demonstrate it works
const nextPerson = waitlist.dequeue();
console.log(`🎟️ Seat offered to: ${nextPerson}`);