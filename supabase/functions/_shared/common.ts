// Shared helpers for the booking Edge Functions.
import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@17';
import pricing from './pricing.json' with { type: 'json' };
import { parseIcal, mergeRanges } from './ical.js';
import { todayIso, addDays } from './quote.js';

export { pricing };

export const env = (name: string, required = true) => {
  const v = Deno.env.get(name);
  if (required && !v) throw new Error(`Missing secret ${name}`);
  return v ?? '';
};

/** Readable message of anything thrown. */
export const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

export const db = () => createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });

export const stripe = () =>
  new Stripe(env('STRIPE_SECRET_KEY'), { apiVersion: '2025-02-24.acacia', httpClient: Stripe.createFetchHttpClient() });

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json', ...extra } });

type Db = ReturnType<typeof db>;

/** Pull the Airbnb iCal feed into external_blocks if the last sync is older than `maxAgeMin`. */
export async function syncAirbnb(client: Db, maxAgeMin = 10) {
  const url = env('AIRBNB_ICAL_URL', false);
  if (!url) return { skipped: 'no AIRBNB_ICAL_URL' };
  const { data: st } = await client.from('sync_state').select('last_sync').eq('source', 'airbnb').maybeSingle();
  if (st?.last_sync && Date.now() - new Date(st.last_sync).getTime() < maxAgeMin * 60000) return { fresh: true };
  try {
    const res = await fetch(url, { headers: { 'user-agent': 'ResidenceLesCerfs/1.0' } });
    if (!res.ok) throw new Error(`Airbnb iCal HTTP ${res.status}`);
    const text = await res.text();
    if (!text.includes('BEGIN:VCALENDAR')) throw new Error('Airbnb iCal: unexpected content');
    const rows = parseIcal(text).filter((e) => e.end >= todayIso());
    const { error } = await client.rpc('replace_external_blocks', { p_source: 'airbnb', p_rows: rows });
    if (error) throw error;
    return { synced: rows.length };
  } catch (e) {
    // keep the previous blocks: a failed sync must never open dates
    await client.from('sync_state').upsert({ source: 'airbnb', last_error: errMsg(e) });
    return { error: errMsg(e) };
  }
}

/** Every unavailable [start, end) range from today on: live site bookings + other platforms. */
export async function unavailableRanges(client: Db) {
  const today = todayIso();
  const now = new Date().toISOString();
  const [{ data: b, error: e1 }, { data: x, error: e2 }] = await Promise.all([
    client
      .from('bookings')
      .select('checkin, checkout, status, hold_until')
      .in('status', ['pending', 'confirmed'])
      .gte('checkout', today),
    client.from('external_blocks').select('start_date, end_date').gte('end_date', today),
  ]);
  if (e1 || e2) throw e1 || e2;
  const ranges = [
    ...(b ?? [])
      .filter((r) => r.status === 'confirmed' || (r.hold_until && r.hold_until > now))
      .map((r) => ({ start: r.checkin, end: r.checkout })),
    ...(x ?? []).map((r) => ({ start: r.start_date, end: r.end_date })),
  ];
  return mergeRanges(ranges);
}

/** Pending bookings whose payment window is over no longer block anything. */
export const expireHolds = (client: Db) =>
  client.from('bookings').update({ status: 'expired' }).eq('status', 'pending').lt('hold_until', new Date().toISOString());

export const frDate = (d: string) =>
  new Date(d + 'T00:00:00Z').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export { addDays, todayIso };
