// GET → unavailable night ranges for the booking calendar (site bookings + Airbnb, Booking.com).
import { cors, db, json, syncCalendars, unavailableRanges } from '../_shared/common.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    const client = db();
    const sync = await syncCalendars(client);
    const ranges = await unavailableRanges(client);
    return json({ ranges, sync: 'error' in sync ? 'stale' : 'ok' }, 200, { 'cache-control': 'public, max-age=60' });
  } catch (e) {
    console.error(e);
    return json({ error: 'Calendrier momentanément indisponible.' }, 500);
  }
});
