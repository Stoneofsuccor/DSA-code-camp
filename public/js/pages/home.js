import { listEvents } from '../api.js';
import { el, formatMoney } from '../ui.js';

const listContainer = document.getElementById('event-list');
const searchInput = document.getElementById('search');
const cityInput = document.getElementById('city');
const maxPriceInput = document.getElementById('max-price');
const sortSelect = document.getElementById('sort');
// Check login state for navigation
const userStr = localStorage.getItem('user');
const navLinks = document.getElementById('nav-links');

if (userStr) {
  const user = JSON.parse(userStr);
  navLinks.innerHTML = `
    <a href="/tickets.html" style="color: white; margin-right: 1rem; text-decoration: none;">My Tickets</a>
    <a href="/organizer.html" style="color: white; margin-right: 1rem; text-decoration: none;">Dashboard</a>
    <span style="color: #93c5fd; margin-right: 1rem;">Hi, ${user.email.split('@')[0]}</span>
    <button id="logout-btn" style="background: transparent; border: 1px solid white; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; cursor: pointer;">Logout</button>
  `;
  
  document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.clear();
    window.location.href = '/login.html';
  });
}

async function loadEvents() {
  const criteria = {
    q: searchInput.value || '',
    city: cityInput.value || '',
    sortBy: sortSelect.value || 'date'
  };

  // Only add maxPriceCents if the input actually has a value
  if (maxPriceInput.value) {
    criteria.maxPriceCents = parseInt(maxPriceInput.value, 10);
  }

  try {
    const events = await listEvents(criteria);
    renderEvents(events);
  } catch (err) {
    listContainer.textContent = 'Failed to load events. ' + err.message;
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