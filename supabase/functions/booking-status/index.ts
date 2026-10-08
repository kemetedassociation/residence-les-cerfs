// GET ?session_id=cs_… → summary shown on the confirmation screen after Stripe.
import { cors, db, json } from '../_shared/common.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  const sid = new URL(req.url).searchParams.get('session_id') ?? '';
  if (!/^cs_[A-Za-z0-9_]+$/.test(sid)) return json({ error: 'not found' }, 404);
  const { data } = await db()
    .from('bookings')
    .select('status, checkin, checkout, adults, children, guest_name, total_cents, deposit_cents, balance_cents, balance_due')
    .eq('stripe_session_id', sid)
    .maybeSingle();
  if (!data) return json({ error: 'not found' }, 404);
  return json({ ...data, guest_name: data.guest_name.split(' ')[0] });
});
