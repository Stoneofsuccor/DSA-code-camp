import { createStore, createEvent, addTier, bookTickets, findBookingByReference } from '../src/domain/inventory.js';

console.log('--- O(1) Map vs O(n) Array.find Benchmark ---\n');

const store = createStore();
const event = createEvent(store, 'Benchmark Event', '2026-01-01');
// Give it massive capacity just for the benchmark
const tier = addTier(store, event.id, 'General', 100, 200000); 

const BOOKINGS_TO_CREATE = 100000;
console.log(`Generating ${BOOKINGS_TO_CREATE} bookings...`);
const startGen = performance.now();

const allReferences = [];
for (let i = 0; i < BOOKINGS_TO_CREATE; i++) {
  const booking = bookTickets(store, event.id, tier.id, 1, `User ${i}`);
  allReferences.push(booking.reference);
}

// Create an array version of the bookings to test Array.find
const bookingsArray = Array.from(store.bookings.values());

const endGen = performance.now();
console.log(`Generated in ${(endGen - startGen).toFixed(0)}ms\n`);

// We will pick 500 random references to look up
const LOOKUPS = 500;
const randomReferences = [];
for (let i = 0; i < LOOKUPS; i++) {
  // Pick a random reference from our generated list
  const randomIndex = Math.floor(Math.random() * allReferences.length);
  randomReferences.push(allReferences[randomIndex]);
}

// 1. Benchmark Map.get (O(1))
console.log(`Running ${LOOKUPS} lookups using Map.get (O(1))...`);
const startMap = performance.now();
for (const ref of randomReferences) {
  findBookingByReference(store, ref);
}
const endMap = performance.now();
const mapTime = endMap - startMap;
console.log(`Map.get Time: ${mapTime.toFixed(2)}ms\n`);

// 2. Benchmark Array.find (O(n))
console.log(`Running ${LOOKUPS} lookups using Array.find (O(n))...`);
const startArray = performance.now();
for (const ref of randomReferences) {
  // Array.find scans from the beginning until it finds a match. 
  // On average, this scans 50,000 items per lookup!
  bookingsArray.find(b => b.reference === ref);
}
const endArray = performance.now();
const arrayTime = endArray - startArray;
console.log(`Array.find Time: ${arrayTime.toFixed(2)}ms\n`);

console.log(`🏆 Map is roughly ${(arrayTime / mapTime).toFixed(0)}x faster!`);