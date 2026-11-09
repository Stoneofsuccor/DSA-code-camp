import { DomainError } from './errors.js';
import { mergeSort } from './sorting.js';

export function filterEvents(summaries, criteria) {
  const { q, city, from, to, maxPriceCents, onlyAvailable } = criteria;

  // Validate maxPriceCents
  if (maxPriceCents !== undefined && (!Number.isInteger(maxPriceCents) || maxPriceCents < 0)) {
    throw new DomainError('VALIDATION', 'maxPriceCents must be a whole number.');
  }

  // Validate dates
  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(to) : null;
  if (from && isNaN(fromDate.getTime())) throw new DomainError('VALIDATION', 'Invalid "from" date.');
  if (to && isNaN(toDate.getTime())) throw new DomainError('VALIDATION', 'Invalid "to" date.');

  // A date-only 'to' string (e.g., '2026-12-05') should include the whole day
  if (toDate && to.length === 10) {
    toDate.setUTCHours(23, 59, 59, 999);
  }

  return summaries.filter(event => {
    // 1. Text search (q) - title or venue, case-insensitive
    if (q) {
      const searchLower = q.toLowerCase();
      const matchesTitle = event.title.toLowerCase().includes(searchLower);
      const matchesVenue = event.venue.toLowerCase().includes(searchLower);
      if (!matchesTitle && !matchesVenue) return false;
    }

    // 2. City filter - exact match, case-insensitive
    if (city && event.city.toLowerCase() !== city.toLowerCase()) {
      return false;
    }

    // 3. Date filters (inclusive)
    const eventDate = new Date(event.date);
    if (fromDate && eventDate < fromDate) return false;
    if (toDate && eventDate > toDate) return false;

    // 4. Price filter (compare with cheapest tier)
    if (maxPriceCents !== undefined) {
      if (!event.hasTiers) return false; // Events with no tiers are left out
      if (event.cheapestPriceCents === null || event.cheapestPriceCents > maxPriceCents) {
        return false;
      }
    }

    // 5. Availability filter
    if (onlyAvailable && event.seatsLeft <= 0) {
      return false;
    }

    return true;
  });
}

export function sortEvents(summaries, sortBy) {
  const validSorts = ['date', 'price', 'availability'];
  if (!validSorts.includes(sortBy)) {
    throw new DomainError('VALIDATION', 'Unknown sort option.');
  }

  // Tie-breaker function: Always break ties by title, then id.
  const tieBreaker = (a, b) => {
    if (a.title !== b.title) return a.title.localeCompare(b.title);
    return a.id.localeCompare(b.id);
  };

  const compareFn = (a, b) => {
    if (sortBy === 'date') {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) return dateA - dateB; // Earliest first
    } 
    else if (sortBy === 'price') {
      const priceA = a.cheapestPriceCents;
      const priceB = b.cheapestPriceCents;
      
      // Handle events with no price (no tiers) -> put last
      if (priceA === null && priceB === null) return tieBreaker(a, b);
      if (priceA === null) return 1;
      if (priceB === null) return -1;
      
      if (priceA !== priceB) return priceA - priceB; // Cheapest first
    } 
    else if (sortBy === 'availability') {
      if (a.seatsLeft !== b.seatsLeft) {
        return b.seatsLeft - a.seatsLeft; // Most seats left first
      }
    }
    
    // If the primary sort values are equal, use the tie-breaker
    return tieBreaker(a, b);
  };

  return mergeSort(summaries, compareFn);
}

export function searchEvents(summaries, criteria, sortBy) {
  const filtered = filterEvents(summaries, criteria);
  return sortEvents(filtered, sortBy);
}
