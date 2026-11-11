export const mockEvents = [
  {
    id: 'evt_1',
    title: 'Lagos Tech Meetup',
    city: 'Lagos',
    venue: 'Landmark Centre',
    date: '2026-11-15T17:00:00Z',
    status: 'published',
    tiers: [
      { id: 'tier_1', name: 'General', priceInCents: 500000, capacity: 100, sold: 20 },
      { id: 'tier_2', name: 'VIP', priceInCents: 1500000, capacity: 20, sold: 20 } // Sold out
    ]
  },
  {
    id: 'evt_2',
    title: 'Abuja Jazz Night',
    city: 'Abuja',
    venue: 'Transcorp Hilton',
    date: '2026-12-05T19:00:00Z',
    status: 'published',
    tiers: [
      { id: 'tier_3', name: 'Standard', priceInCents: 250000, capacity: 50, sold: 10 }
    ]
  }
];