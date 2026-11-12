import { createEvent, addTier, publishEvent } from '../api.js';

if (!localStorage.getItem('token')) {
  window.location.href = '/login.html';
}

let currentEventId = null;

document.getElementById('logout-btn').addEventListener('click', () => {
  localStorage.clear();
  window.location.href = '/login.html';
});

// 1. Create Event
document.getElementById('create-event-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const errorEl = document.getElementById('event-error');
  errorEl.textContent = '';

  try {
    const dateValue = document.getElementById('date').value;
    const eventData = {
      title: document.getElementById('title').value,
      city: document.getElementById('city').value,
      venue: document.getElementById('venue').value,
      date: new Date(dateValue).toISOString()
    };

    const result = await createEvent(eventData);
    currentEventId = result.id;
    
    // Show manage section
    document.getElementById('manage-section').classList.remove('hidden');
    document.getElementById('event-success').textContent = `Event created! ID: ${currentEventId} (Draft)`;
    
    // Hide the create form
    document.getElementById('create-event-form').style.display = 'none';
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

// 2. Add Tier
document.getElementById('add-tier-btn').addEventListener('click', async () => {
  const errorEl = document.getElementById('manage-error');
  errorEl.textContent = '';

  try {
    const name = document.getElementById('tier-name').value;
    const price = parseInt(document.getElementById('tier-price').value);
    const capacity = parseInt(document.getElementById('tier-capacity').value);

    await addTier(currentEventId, name, price, capacity);
    alert('Tier added successfully!');
    
    // Clear inputs
    document.getElementById('tier-name').value = '';
    document.getElementById('tier-price').value = '';
    document.getElementById('tier-capacity').value = '';
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

// 3. Publish Event
document.getElementById('publish-btn').addEventListener('click', async () => {
  const errorEl = document.getElementById('manage-error');
  errorEl.textContent = '';

  try {
    await publishEvent(currentEventId);
    alert('Event published! You can now see it on the home page.');
    window.location.href = '/';
  } catch (err) {
    errorEl.textContent = err.message; // Will fail if no tiers are added first!
  }
});