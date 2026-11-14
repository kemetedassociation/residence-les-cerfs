import { BOOKING_API } from '../data/site.js';

const call = async (path, opts) => {
  const res = await fetch(`${BOOKING_API.replace(/\/$/, '')}/${path}`, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Erreur réseau, réessayez.'), { code: data.code });
  return data;
};

export async function fetchAvailability() {
  return call('availability');
}

export async function createBooking(payload) {
  return call('book', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
}

export async function fetchBookingStatus(sessionId) {
  return call(`booking-status?session_id=${encodeURIComponent(sessionId)}`);
}

export const openBooking = () => window.dispatchEvent(new CustomEvent('booking:open'));
