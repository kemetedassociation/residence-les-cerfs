// GET ?token=… → iCal feed of the site's confirmed bookings, to import into Airbnb.
import { buildIcal } from '../_shared/ical.js';
import { cors, db, env, todayIso } from '../_shared/common.ts';

Deno.serve(async (req) => {
  if (new URL(req.url).searchParams.get('token') !== env('ICAL_EXPORT_TOKEN')) return new Response('Not found', { status: 404 });
  const client = db();
  const [{ data, error }, { data: manual, error: e2 }] = await Promise.all([
    client.from('bookings').select('ical_uid, checkin, checkout').eq('status', 'confirmed').gte('checkout', todayIso()),
    // dates the owner blocked from the owner space
    client.from('external_blocks').select('id, start_date, end_date').eq('source', 'manual').gte('end_date', todayIso()),
  ]);
  if (error || e2) return new Response('Error', { status: 500 });
  const body = buildIcal(
    [
      ...(data ?? []).map((b) => ({ uid: b.ical_uid, start: b.checkin, end: b.checkout, summary: 'Réservé (site)' })),
      ...(manual ?? []).map((m) => ({ uid: `block-${m.id}@residence-les-cerfs`, start: m.start_date, end: m.end_date, summary: 'Indisponible' })),
    ],
    { name: 'Résidence Les Cerfs — réservations du site' },
  );
  return new Response(body, { headers: { ...cors, 'content-type': 'text/calendar; charset=utf-8', 'cache-control': 'no-cache' } });
});
