import { mockEvents } from './mockData.js';

// Simulate network delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export async function listEvents(criteria) {
  await delay(200);
  // Basic filtering for the mock data
  let results = mockEvents.filter(e => e.status === 'published');
  
  if (criteria.q) {
    const q = criteria.q.toLowerCase();
    results = results.filter(e => e.title.toLowerCase().includes(q) || e.venue.toLowerCase().includes(q));
  }
  if (criteria.city) {
    results = results.filter(e => e.city.toLowerCase() === criteria.city.toLowerCase());
  }
  
  // Map to summaries
  return results.map(e => {
    let cheapest = Math.min(...e.tiers.map(t => t.priceInCents));
    let seatsLeft = e.tiers.reduce((sum, t) => sum + (t.capacity - t.sold), 0);
    return {
      id: e.id, title: e.title, city: e.city, venue: e.venue, date: e.date,
      cheapestPriceCents: cheapest, seatsLeft
    };
  });
}

export async function getEvent(eventId) {
  await delay(200);
  const event = mockEvents.find(e => e.id === eventId);
  if (!event) throw new Error('Event not found');
  
  // Add calculated fields
  return {
    ...event,
    tiers: event.tiers.map(t => ({
      ...t,
      seatsLeft: t.capacity - t.sold
    }))
  };
}

export async function createBooking(eventId, tierId, quantity) {
  await delay(300);
  return { reference: 'REF' + Math.floor(Math.random() * 10000), quantity };
}

export async function pay(reference, cardNumber) {
  await delay(500);
  // Rule: Declined mock card
  if (cardNumber.endsWith('0000')) {
    throw new Error('PAYMENT_DECLINED');
  }
  return { status: 'paid', reference };
}