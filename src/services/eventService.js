import { DomainError } from '../domain/errors.js';
import { searchEvents } from '../domain/eventSearch.js';

export function createEventService(repository) {
  return {
    // Added ownerId so we know which organizer owns this event
    async createEvent(title, city, venue, date, ownerId) {
      if (!title || !city || !date) throw new DomainError('VALIDATION', 'Missing fields');
      
      const event = {
        id: crypto.randomUUID(),
        title, city, venue, date,
        status: 'draft',
        ownerId, // <-- Save the organizer's ID here
        tiers: new Map()
      };
      
      await repository.saveEvent(event);
      return event;
    },
    async getEvent(eventId) {
      const event = await repository.getEventById(eventId);
      if (!event) throw new DomainError('NOT_FOUND', 'Event not found');
      
      // Convert the Map of tiers to an array so the frontend can easily loop through it
      const tiersArray = Array.from(event.tiers.values()).map(t => ({
        id: t.id,
        name: t.name,
        priceInCents: t.price_in_cents !== undefined ? t.price_in_cents : t.priceInCents,
        capacity: t.capacity,
        sold: t.sold !== undefined ? t.sold : t.booked
      }));

      return {
        ...event,
        tiers: tiersArray // Return as a clean array
      };
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
        eventId: event.id,
        name: tierName,
        priceInCents,
        capacity,
        sold: 0 // <-- CHANGED from booked: 0 to sold: 0 (to match SQLite)
      };
      
      // We save the tier directly to the repository (SQLite) 
      // instead of using event.tiers.set() because SQLite needs a separate table insert.
      await repository.saveTier(tier);
      return tier;
    },

    async publish(eventId) {
      const event = await repository.getEventById(eventId);
      if (!event) throw new DomainError('NOT_FOUND', 'Event not found');
      
      // In SQLite, event.tiers is a Map of the tiers, so we check its size
      if (!event.tiers || event.tiers.size === 0) {
        throw new DomainError('INVALID_STATE', 'Cannot publish with no tiers');
      }
      
      event.status = 'published';
      await repository.saveEvent(event);
      return event;
    },

    async search(queryParams) {
      // 1. Get all events
      const allEvents = await repository.getAllEvents();
      
      // 2. Map to summaries
      const summaries = allEvents.map(e => {
        let cheapest = null;
        let seatsLeft = 0;
        
        // In SQLite, e.tiers is a Map (returned by getEventById), but getAllEvents 
        // might return an array of tiers. Let's handle both just in case.
        const tiers = e.tiers instanceof Map ? Array.from(e.tiers.values()) : (e.tiers || []);
        
        for (const tier of tiers) {
          // Note: SQLite uses 'sold' and 'price_in_cents', memory uses 'booked' and 'priceInCents'
          const sold = tier.sold !== undefined ? tier.sold : tier.booked;
          const price = tier.price_in_cents !== undefined ? tier.price_in_cents : tier.priceInCents;
          
          seatsLeft += (tier.capacity - sold);
          if (cheapest === null || price < cheapest) cheapest = price;
        }
        
        return {
          id: e.id, title: e.title, city: e.city, venue: e.venue, date: e.date,
          cheapestPriceCents: cheapest, seatsLeft, hasTiers: tiers.length > 0,
          status: e.status // Keep status so we can filter drafts
        };
      });

      // 3. Filter out drafts
      const published = summaries.filter(s => s.status === 'published');

      // 4. Use domain search
      return searchEvents(published, queryParams, queryParams.sortBy || 'date');
    }
  };
}