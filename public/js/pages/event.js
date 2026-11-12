import { getEvent, createBooking, pay } from '../api.js';
import { el, formatMoney } from '../ui.js';

// Get event ID from URL query string
const urlParams = new URLSearchParams(window.location.search);
const eventId = urlParams.get('id');

const titleEl = document.getElementById('event-title');
const metaEl = document.getElementById('event-meta');
const tierList = document.getElementById('tier-list');
const checkoutSection = document.getElementById('checkout-section');
const countdownEl = document.getElementById('countdown');
const checkoutTotal = document.getElementById('checkout-total');
const payBtn = document.getElementById('pay-btn');
const paymentError = document.getElementById('payment-error');

let currentBooking = null;
let countdownInterval = null;

async function init() {
  if (!eventId) {
    titleEl.textContent = 'Event not found';
    return;
  }

  try {
    const event = await getEvent(eventId);
    titleEl.textContent = event.title;
    metaEl.textContent = `${event.venue}, ${event.city} | ${new Date(event.date).toLocaleString()}`;
    renderTiers(event.tiers);
  } catch (err) {
    titleEl.textContent = 'Error loading event';
  }
}

// Inside public/js/pages/event.js

function renderTiers(tiers) {
  tierList.innerHTML = '';
  
  // The API sends an object/array of tiers depending on how it's serialized
  // We need to make sure we loop through them correctly
  const tierArray = Array.isArray(tiers) ? tiers : Object.values(tiers || {});

  tierArray.forEach(tier => {
    // The database uses 'capacity' and 'sold'. We calculate 'seatsLeft' here.
    const sold = tier.sold || 0;
    const seatsLeft = tier.capacity - sold;
    const isSoldOut = seatsLeft <= 0;
    
    // The database uses 'price_in_cents' (snake_case). 
    // If it's memory, it might be 'priceInCents'. We handle both.
    const price = tier.price_in_cents !== undefined ? tier.price_in_cents : tier.priceInCents;
    
    const container = el('div', { className: `tier-card ${isSoldOut ? 'sold-out' : ''}` }, [
      el('h3', { textContent: tier.name }),
      el('p', { textContent: formatMoney(price) }),
      el('p', { textContent: isSoldOut ? 'Sold Out' : `${seatsLeft} seats left` }),
    ]);

    if (!isSoldOut) {
      const btn = el('button', { textContent: 'Book Tickets' });
      btn.addEventListener('click', () => handleBook({ ...tier, priceInCents: price }));
      container.appendChild(btn);
    } else {
      container.appendChild(el('button', { disabled: 'true', textContent: 'Sold Out' }));
    }

    tierList.appendChild(container);
  });
}

async function handleBook(tier) {
  // For simplicity, we just book 1 ticket here. 
  // A real app would have a quantity picker.
  try {
    currentBooking = await createBooking(eventId, tier.id, 1);
    
    // Show checkout
    tierList.parentElement.classList.add('hidden');
    checkoutSection.classList.remove('hidden');
    checkoutTotal.textContent = formatMoney(tier.priceInCents * currentBooking.quantity);
    
    // Start countdown (e.g., 5 minutes)
    startCountdown(5 * 60);
  } catch (err) {
    alert('Booking failed: ' + err.message);
  }
}

function startCountdown(seconds) {
  let timeLeft = seconds;
  
  countdownInterval = setInterval(() => {
    timeLeft--;
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    countdownEl.textContent = `Seats held for: ${mins}:${secs.toString().padStart(2, '0')}`;
    
    if (timeLeft <= 0) {
      clearInterval(countdownInterval);
      checkoutSection.classList.add('hidden');
      alert('Time expired. Please book again.');
      window.location.reload();
    }
  }, 1000);
}

payBtn.addEventListener('click', async () => {
  paymentError.classList.add('hidden');
  payBtn.disabled = true;
  payBtn.textContent = 'Processing...';

  try {
    await pay(currentBooking.reference, '4242 4242 4242 1111');
    clearInterval(countdownInterval);
    alert('Payment Successful! Booking Reference: ' + currentBooking.reference);
    window.location.href = '/';
  } catch (err) {
    // Rule: Declined card shows error and lets them try again
    paymentError.textContent = 'Payment declined. Please check your card and try again.';
    paymentError.classList.remove('hidden');
  } finally {
    payBtn.disabled = false;
    payBtn.textContent = 'Pay Now';
  }
});

init();