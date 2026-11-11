import { listEvents } from '../api.js';
import { el, formatMoney } from '../ui.js';

const listContainer = document.getElementById('event-list');
const searchInput = document.getElementById('search');
const cityInput = document.getElementById('city');
const maxPriceInput = document.getElementById('max-price');
const sortSelect = document.getElementById('sort');

async function loadEvents() {
  const criteria = {
    q: searchInput.value,
    city: cityInput.value,
    maxPriceCents: maxPriceInput.value ? parseInt(maxPriceInput.value) : undefined,
    sortBy: sortSelect.value
  };

  try {
    const events = await listEvents(criteria);
    renderEvents(events);
  } catch (err) {
    listContainer.textContent = 'Failed to load events.';
  }
}

function renderEvents(events) {
  listContainer.innerHTML = ''; // Clear current list
  
  if (events.length === 0) {
    listContainer.appendChild(el('p', { textContent: 'No events found.' }));
    return;
  }

  events.forEach(event => {
    const card = el('article', { className: 'event-card' }, [
      el('h3', { textContent: event.title }),
      el('p', { textContent: `${event.venue}, ${event.city}` }),
      el('p', { textContent: new Date(event.date).toLocaleDateString() }),
      el('p', { className: 'price', textContent: `From ${formatMoney(event.cheapestPriceCents)}` }),
      el('p', { textContent: `${event.seatsLeft} seats left` }),
      el('a', { href: `/event.html?id=${event.id}`, className: 'btn', textContent: 'View Event' })
    ]);
    listContainer.appendChild(card);
  });
}

// Add event listeners to filters
[searchInput, cityInput, maxPriceInput, sortSelect].forEach(input => {
  input.addEventListener('input', loadEvents);
});

// Initial load
loadEvents();