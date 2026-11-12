document.getElementById('checkin-btn').addEventListener('click', async () => {
  const btn = document.getElementById('checkin-btn');
  const result = document.getElementById('result-msg');
  const token = document.getElementById('token-input').value.trim();
  
  result.textContent = 'Verifying...';
  result.style.color = 'black';
  btn.disabled = true;

  try {
    const res = await fetch('/api/checkin', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ ticketToken: token })
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed');
    
    result.style.color = 'green';
    result.textContent = '✅ ' + data.message;
  } catch (err) {
    result.style.color = 'red';
    result.textContent = '❌ ' + err.message;
  } finally {
    btn.disabled = false;
  }
});