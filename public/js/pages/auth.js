// Import the specific functions, not a generic "api" object
import { login, signup } from '../api.js';

const errorEl = document.getElementById('auth-error');
const emailEl = document.getElementById('email');
const passwordEl = document.getElementById('password');
const roleEl = document.getElementById('role');

// Handle Login
document.getElementById('login-btn').addEventListener('click', async (e) => {
  e.preventDefault();
  errorEl.textContent = '';
  
  try {
    const data = await login(emailEl.value, passwordEl.value);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    // Redirect based on role
    if (data.user.role === 'organizer') {
      window.location.href = '/organizer.html';
    } else {
      window.location.href = '/';
    }
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

// Handle Signup
document.getElementById('signup-btn').addEventListener('click', async (e) => {
  e.preventDefault();
  errorEl.textContent = '';
  
  try {
    const data = await signup(emailEl.value, passwordEl.value, roleEl.value);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    // Redirect based on role
    if (data.user.role === 'organizer') {
      window.location.href = '/organizer.html';
    } else {
      window.location.href = '/';
    }
  } catch (err) {
    errorEl.textContent = err.message;
  }
});