import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, createEvent, addTier, bookTickets, publishEvent, listEventSummaries } from '../src/domain/inventory.js';
import { filterEvents, sortEvents } from '../src/domain/eventSearch.js';
import { DomainError } from '../src/domain/errors.js';

// --- S02: Create Event ---
test('S02: Creates event as draft, not on public list', () => {
  const store = createStore();
  const event = createEvent(store, 'Tech Meetup', 'Lagos', 'Hall', '2026-12-05T17:00:00Z');
  
  assert.equal(event.status, 'draft');
  const publicList = listEventSummaries(store, { publishedOnly: true });
  assert.equal(publicList.length, 0);
});

test('S02: Missing title/city or bad date is VALIDATION error', () => {
  const store = createStore();
  assert.throws(() => createEvent(store, '', 'Lagos', 'Hall', '2026-12-05'), { code: 'VALIDATION' });
  assert.throws(() => createEvent(store, 'Tech', '', 'Hall', '2026-12-05'), { code: 'VALIDATION' });
  assert.throws(() => createEvent(store, 'Tech', 'Lagos', 'Hall', 'not-a-date'), { code: 'VALIDATION' });
});

// --- S03: Add Ticket Tier ---
test('S03: Add tier saves correctly', () => {
  const store = createStore();
  const event = createEvent(store, 'Tech', 'Lagos', 'Hall', '2026-12-05');
  const tier = addTier(store, event.id, 'General', 500000, 100);
  assert.equal(tier.priceInCents, 500000);
  assert.equal(tier.capacity, 100);
});

test('S03: Bad price or capacity throws VALIDATION', () => {
  const store = createStore();
  const event = createEvent(store, 'Tech', 'Lagos', 'Hall', '2026-12-05');
  assert.throws(() => addTier(store, event.id, 'General', 50.5, 100), { code: 'VALIDATION' }); // Not whole number
  assert.throws(() => addTier(store, event.id, 'General', 5000, 0), { code: 'VALIDATION' }); // Capacity < 1
});

test('S03: Add tier to missing event throws NOT_FOUND', () => {
  const store = createStore();
  assert.throws(() => addTier(store, 'fake-id', 'General', 5000, 100), { code: 'NOT_FOUND' });
});

// --- S05: Search, Filter, Sort ---
test('S05: Filter by text matches title or venue, case-insensitive', () => {
  const store = createStore();
  createEvent(store, 'Lagos Tech Meetup', 'Lagos', 'Hall A', '2026-12-05');
  createEvent(store, 'Abuja Jazz Night', 'Abuja', 'Hall B', '2026-12-06');
  const summaries = listEventSummaries(store, { publishedOnly: false });
  
  const filtered = filterEvents(summaries, { q: 'JAZZ' });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].title, 'Abuja Jazz Night');
});

test('S05: Filter by city matches exactly, case-insensitive', () => {
  const store = createStore();
  createEvent(store, 'A', 'Lagos', 'Hall', '2026-12-05');
  createEvent(store, 'B', 'Abuja', 'Hall', '2026-12-05');
  const summaries = listEventSummaries(store, { publishedOnly: false });
  
  const filtered = filterEvents(summaries, { city: 'lagos' });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].city, 'Lagos');
});

test('S05: Filter includes date-only "to" for the whole day', () => {
  const store = createStore();
  createEvent(store, 'A', 'Lagos', 'Hall', '2026-12-05T17:00:00Z'); // 5 PM
  const summaries = listEventSummaries(store, { publishedOnly: false });
  
  const filtered = filterEvents(summaries, { to: '2026-12-05' });
  assert.equal(filtered.length, 1);
});

test('S05: Sort by date, tie-break by title', () => {
  const store = createStore();
  createEvent(store, 'B Event', 'Lagos', 'Hall', '2026-12-05T10:00:00Z');
  createEvent(store, 'A Event', 'Lagos', 'Hall', '2026-12-05T10:00:00Z'); // Same day
  const summaries = listEventSummaries(store, { publishedOnly: false });
  
  const sorted = sortEvents(summaries, 'date');
  assert.equal(sorted[0].title, 'A Event'); // A before B
});

test('S05: Original list is unchanged after sort/filter', () => {
  const store = createStore();
  createEvent(store, 'B Event', 'Lagos', 'Hall', '2026-12-05T10:00:00Z');
  createEvent(store, 'A Event', 'Lagos', 'Hall', '2026-12-05T10:00:00Z');
  const summaries = listEventSummaries(store, { publishedOnly: false });
  const originalCopy = JSON.stringify(summaries);
  
  sortEvents(summaries, 'date');
  filterEvents(summaries, { q: 'Event' });
  assert.equal(JSON.stringify(summaries), originalCopy); // Must be identical
});

test('S05: Unknown sort option throws VALIDATION', () => {
  assert.throws(() => sortEvents([], 'bad-sort'), { code: 'VALIDATION' });
});

// --- S06: Book Tickets ---
test('S06: Book 2 tickets leaves 1 seat left', () => {
  const store = createStore();
  const event = createEvent(store, 'Tech', 'Lagos', 'Hall', '2026-12-05');
  const tier = addTier(store, event.id, 'General', 5000, 3);
  
  bookTickets(store, event.id, tier.id, 2, 'Ada');
  const summaries = listEventSummaries(store, { publishedOnly: false });
  assert.equal(summaries[0].seatsLeft, 1);
});

test('S06: Overbooking throws SOLD_OUT and changes nothing', () => {
  const store = createStore();
  const event = createEvent(store, 'Tech', 'Lagos', 'Hall', '2026-12-05');
  const tier = addTier(store, event.id, 'General', 5000, 1); // Only 1 seat
  
  assert.throws(() => bookTickets(store, event.id, tier.id, 2, 'Bayo'), { code: 'SOLD_OUT' });
  const summaries = listEventSummaries(store, { publishedOnly: false });
  assert.equal(summaries[0].seatsLeft, 1); // Still 1, nothing changed
});

test('S06: Invalid quantity throws VALIDATION', () => {
  const store = createStore();
  const event = createEvent(store, 'Tech', 'Lagos', 'Hall', '2026-12-05');
  const tier = addTier(store, event.id, 'General', 5000, 100);
  
  assert.throws(() => bookTickets(store, event.id, tier.id, 0, 'A'), { code: 'VALIDATION' });
  assert.throws(() => bookTickets(store, event.id, tier.id, -1, 'A'), { code: 'VALIDATION' });
  assert.throws(() => bookTickets(store, event.id, tier.id, 11, 'A'), { code: 'VALIDATION' });
  assert.throws(() => bookTickets(store, event.id, tier.id, 1.5, 'A'), { code: 'VALIDATION' });
});

// --- S04: Publish Event ---
test('S04: Publish event with no tiers throws INVALID_STATE', () => {
  const store = createStore();
  const event = createEvent(store, 'Tech', 'Lagos', 'Hall', '2026-12-05');
  assert.throws(() => publishEvent(store, event.id), { code: 'INVALID_STATE' });
});

test('S04: Publish event with tiers moves it to public list', () => {
  const store = createStore();
  const event = createEvent(store, 'Tech', 'Lagos', 'Hall', '2026-12-05');
  addTier(store, event.id, 'General', 5000, 100);
  
  publishEvent(store, event.id);
  const publicList = listEventSummaries(store, { publishedOnly: true });
  assert.equal(publicList.length, 1);
  assert.equal(publicList[0].id, event.id);
});