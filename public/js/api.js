const BASE_URL = '/api';

function getToken() {
  return localStorage.getItem('token');
}

export async function listEvents(params = {}) {
  // Remove any keys that are empty strings, undefined, or null
  const cleanParams = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      cleanParams[key] = value;
    }
  }
  
  const query = new URLSearchParams(cleanParams).toString();
  const res = await fetch(`${BASE_URL}/events?${query}`);
  if (!res.ok) throw new Error('Failed to load events');
  return res.json();
}

export async function getEvent(eventId) {
  const res = await fetch(`${BASE_URL}/events/${eventId}`);
  if (!res.ok) throw new Error('Event not found');
  return res.json();
}

export async function createBooking(eventId, tierId, quantity) {
  const res = await fetch(`${BASE_URL}/bookings`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}` 
    },
    body: JSON.stringify({ eventId, tierId, quantity })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Booking failed');
  return data;
}

export async function pay(reference, cardNumber) {
  const res = await fetch(`${BASE_URL}/bookings/${reference}/pay`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${getToken()}` }
  });
  const data = await res.json();
  if (!res.ok) {
    if (data.error?.code === 'PAYMENT_DECLINED') throw new Error('PAYMENT_DECLINED');
    throw new Error(data.error?.message || 'Payment failed');
  }
  return data;
}

export async function login(email, password) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Login failed');
  return data;
}

export async function signup(email, password, role) {
  const res = await fetch(`${BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, role })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Signup failed');
  return data;
}

export async function createEvent(data) {
  const res = await fetch(`${BASE_URL}/events`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}` 
    },
    body: JSON.stringify(data)
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error?.message || 'Failed to create event');
  return result;
}

export async function addTier(eventId, name, priceInCents, capacity) {
  const res = await fetch(`${BASE_URL}/events/${eventId}/tiers`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}` 
    },
    body: JSON.stringify({ name, priceInCents, capacity })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Failed to add tier');
  return data;
}

export async function publishEvent(eventId) {
  const res = await fetch(`${BASE_URL}/events/${eventId}/publish`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${getToken()}` }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Failed to publish');
  return data;
}