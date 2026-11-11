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

function renderTiers(tiers) {
  tierList.innerHTML = '';
  
  tiers.forEach(tier => {
    const isSoldOut = tier.seatsLeft <= 0;
    
    const container = el('div', { className: `tier-card ${isSoldOut ? 'sold-out' : ''}` }, [
      el('h3', { textContent: tier.name }),
      el('p', { textContent: formatMoney(tier.priceInCents) }),
      el('p', { textContent: isSoldOut ? 'Sold Out' : `${tier.seatsLeft} seats left` }),
    ]);

    if (!isSoldOut) {
      const btn = el('button', { textContent: 'Book Tickets' });
      btn.addEventListener('click', () => handleBook(tier));
      container.appendChild(btn);
    } else {
      // Rule: Sold-out button is disabled
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
    await pay(currentBooking.reference, '4242 4242 4242 0000');
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