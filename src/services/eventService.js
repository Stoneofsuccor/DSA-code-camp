import { DomainError } from '../domain/errors.js';
import { createEvent, addTier, publishEvent, listEventSummaries } from '../domain/inventory.js';
import { searchEvents } from '../domain/eventSearch.js';

export function createEventService(repository) {
  return {
    async createEvent(title, city, venue, date) {
      // We can't easily use the old createEvent because it expects the whole store.
      // So we build the event object manually here using domain validation rules.
      if (!title || !city || !date) throw new DomainError('VALIDATION', 'Missing fields');
      
      const event = {
        id: crypto.randomUUID(), // Using built-in crypto
        title, city, venue, date,
        status: 'draft',
        tiers: new Map()
      };
      
      await repository.saveEvent(event);
      return event;
    },

    async addTier(eventId, tierName, priceInCents, capacity) {
      const event = await repository.getEventById(eventId);
      if (!event) throw new DomainError('NOT_FOUND', 'Event not found');
      
      if (!Number.isInteger(priceInCents) || priceInCents < 0) {
        throw new DomainError('VALIDATION', 'Price must be whole cents');
      }
      if (!Number.isInteger(capacity) || capacity < 1) {
        throw new DomainError('VALIDATION', 'Capacity must be at least 1');
      }

      const tier = {
        id: crypto.randomUUID(),
        name: tierName,
        priceInCents,
        capacity,
        booked: 0
      };
      event.tiers.set(tier.id, tier);
      
      await repository.saveEvent(event);
      return tier;
    },

    async publish(eventId) {
      const event = await repository.getEventById(eventId);
      if (!event) throw new DomainError('NOT_FOUND', 'Event not found');
      if (event.tiers.size === 0) throw new DomainError('INVALID_STATE', 'Cannot publish with no tiers');
      
      event.status = 'published';
      await repository.saveEvent(event);
      return event;
    },

    async search(queryParams) {
      // 1. Get all events and convert to summaries (like we did in Build 2)
      const allEvents = await repository.getAllEvents();
      // We reuse the domain logic for summaries, but we need to adapt it slightly 
      // since our domain function expects the old store format.
      // For simplicity, we'll do a quick summary generation here.
      const summaries = allEvents.map(e => {
        let cheapest = null;
        let seatsLeft = 0;
        for (const tier of e.tiers.values()) {
          seatsLeft += (tier.capacity - tier.booked);
          if (cheapest === null || tier.priceInCents < cheapest) cheapest = tier.priceInCents;
        }
        return {
          id: e.id, title: e.title, city: e.city, venue: e.venue, date: e.date,
          cheapestPriceCents: cheapest, seatsLeft, hasTiers: e.tiers.size > 0
        };
      });

      // 2. Filter out drafts
      const published = summaries.filter(s => {
        const originalEvent = allEvents.find(e => e.id === s.id);
        return originalEvent.status === 'published';
      });

      // 3. Use domain search
      return searchEvents(published, queryParams, queryParams.sortBy || 'date');
    }
  };
}