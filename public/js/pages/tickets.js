async function loadTickets() {
  const container = document.getElementById('tickets-list');
  
  if (!localStorage.getItem('token')) {
    window.location.href = '/login.html';
    return;
  }

  try {
    const res = await fetch('/api/bookings/my', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    
    if (!res.ok) throw new Error('Server returned ' + res.status);
    
    const bookings = await res.json();
    
    container.innerHTML = '';
    if (bookings.length === 0) {
      container.innerHTML = '<p>No tickets yet. Go book an event!</p>';
      return;
    }
    
    for (const b of bookings) {
      const div = document.createElement('div');
      div.className = 'ticket-card';
      div.style.background = 'white';
      div.style.padding = '1rem';
      div.style.marginBottom = '1rem';
      div.style.borderRadius = '8px';
      
      // 1. Show basic booking details
      div.innerHTML = '<h3>Booking: ' + b.reference + '</h3>' +
                      '<p>Status: <strong>' + b.status + '</strong></p>' +
                      '<p>Total: N' + (b.amountCents / 100).toLocaleString() + '</p>';

      // 2. If paid, get the token
      if (b.status === 'paid') {
        try {
          const qrRes = await fetch('/api/bookings/' + b.reference + '/ticket-token', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          
          if (qrRes.ok) {
            const qrData = await qrRes.json();
            
            // Show the token in a grey box
            div.innerHTML += '<div style="margin-top: 1rem; padding: 1rem; background: #f3f4f6; border-radius: 4px;">' +
                             '<strong>Show this to Staff at the door:</strong><br>' +
                             '<code style="font-size: 0.8rem; word-break: break-all; display: block; margin-top: 0.5rem; color: #2563eb;">' + qrData.ticketToken + '</code>' +
                             '</div>';
          }
        } catch (e) {
          console.error("Could not load QR", e);
        }
      }
      
      container.appendChild(div);
    }
  } catch (err) {
    container.innerHTML = '<p class="error-text">Error: ' + err.message + '</p>';
    console.error("Tickets Error:", err);
  }
}

loadTickets();