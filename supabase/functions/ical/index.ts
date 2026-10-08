// GET ?token=… → iCal feed of the site's confirmed bookings, to import into Airbnb.
import { buildIcal } from '../_shared/ical.js';
import { cors, db, env, todayIso } from '../_shared/common.ts';

Deno.serve(async (req) => {
  if (new URL(req.url).searchParams.get('token') !== env('ICAL_EXPORT_TOKEN')) return new Response('Not found', { status: 404 });
  const { data, error } = await db()
    .from('bookings')
    .select('ical_uid, checkin, checkout')
    .eq('status', 'confirmed')
    .gte('checkout', todayIso());
  if (error) return new Response('Error', { status: 500 });
  const body = buildIcal(
    (data ?? []).map((b) => ({ uid: b.ical_uid, start: b.checkin, end: b.checkout, summary: 'Réservé (site)' })),
    { name: 'Résidence Les Cerfs — réservations du site' },
  );
  return new Response(body, { headers: { ...cors, 'content-type': 'text/calendar; charset=utf-8', 'cache-control': 'no-cache' } });
});
