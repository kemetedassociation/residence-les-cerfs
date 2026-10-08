import { BOOKING_API } from '../data/site.js';
import { addDays, todayIso } from '../../supabase/functions/_shared/quote.js';

const call = async (path, opts) => {
  const res = await fetch(`${BOOKING_API.replace(/\/$/, '')}/${path}`, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Erreur réseau, réessayez.'), { code: data.code });
  return data;
};

// demo mode: a few fake bookings so the calendar looks real
const demoRanges = () => {
  const t = todayIso();
  return [
    { start: addDays(t, 6), end: addDays(t, 11) },
    { start: addDays(t, 24), end: addDays(t, 31) },
    { start: addDays(t, 52), end: addDays(t, 56) },
  ];
};

export async function fetchAvailability(mode) {
  if (mode === 'demo') return { ranges: demoRanges() };
  return call('availability');
}

export async function createBooking(mode, payload) {
  if (mode === 'demo') {
    await new Promise((r) => setTimeout(r, 700));
    return { demo: true };
  }
  return call('book', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
}

export async function fetchBookingStatus(sessionId) {
  return call(`booking-status?session_id=${encodeURIComponent(sessionId)}`);
}

export const openBooking = () => window.dispatchEvent(new CustomEvent('booking:open'));
