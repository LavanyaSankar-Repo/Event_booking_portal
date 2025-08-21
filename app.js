const API_BASE = window.location.origin.replace(/:\d+$/, ':3000'); // assume backend on 3000 in dev

async function fetchEvents() {
  const res = await fetch(`${API_BASE}/api/events`);
  const data = await res.json();
  const list = document.getElementById('events-list');
  list.innerHTML = data.map(ev => `
    <div class="card">
      <h3>${ev.title}</h3>
      <p><strong>ID:</strong> ${ev.id}</p>
      <p>${ev.description}</p>
      <p><strong>Date:</strong> ${new Date(ev.date).toLocaleString()}</p>
      <p><strong>Venue:</strong> ${ev.venue}</p>
      <p><strong>Seats Left:</strong> ${ev.seatsLeft}</p>
    </div>
  `).join('');
}

async function submitBooking(e) {
  e.preventDefault();
  const status = document.getElementById('status');
  status.textContent = 'Submitting...';

  const payload = {
    eventId: document.getElementById('eventId').value.trim(),
    name: document.getElementById('name').value.trim(),
    email: document.getElementById('email').value.trim(),
  };

  const res = await fetch(`${API_BASE}/api/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (res.ok) {
    const data = await res.json();
    status.textContent = `Booked! Ref: ${data.reference}`;
    fetchEvents();
  } else {
    const err = await res.json().catch(() => ({ message: 'Unknown error' }));
    status.textContent = `Error: ${err.message}`;
  }
}

document.getElementById('booking-form').addEventListener('submit', submitBooking);
fetchEvents();
