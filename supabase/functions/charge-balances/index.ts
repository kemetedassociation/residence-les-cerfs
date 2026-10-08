// Daily (pg_cron): charges every balance that is due with the card saved at booking time.
import { db, env, errMsg, frDate, json, stripe, todayIso } from '../_shared/common.ts';

Deno.serve(async (req) => {
  if (req.headers.get('x-cron-secret') !== env('CRON_SECRET')) return json({ error: 'forbidden' }, 403);
  const client = db();
  const s = stripe();
  const { data: due, error } = await client
    .from('bookings')
    .select('id, checkin, checkout, balance_cents, stripe_customer_id, stripe_payment_method_id')
    .eq('status', 'confirmed')
    .eq('balance_status', 'scheduled')
    .lte('balance_due', todayIso());
  if (error) return json({ error: error.message }, 500);

  const results = [];
  for (const b of due ?? []) {
    try {
      const pi = await s.paymentIntents.create(
        {
          amount: b.balance_cents,
          currency: 'eur',
          customer: b.stripe_customer_id,
          payment_method: b.stripe_payment_method_id,
          off_session: true,
          confirm: true,
          description: `Solde — séjour du ${frDate(b.checkin)} au ${frDate(b.checkout)} — Résidence Les Cerfs`,
          metadata: { booking_id: b.id, kind: 'balance' },
        },
        { idempotencyKey: `balance-${b.id}` },
      );
      const paid = pi.status === 'succeeded';
      await client
        .from('bookings')
        .update(paid ? { balance_status: 'paid', balance_paid_at: new Date().toISOString(), balance_error: null } : { balance_status: 'failed', balance_error: `Statut Stripe : ${pi.status}` })
        .eq('id', b.id);
      results.push({ id: b.id, status: pi.status });
    } catch (e) {
      // e.g. the bank asks for authentication: the owner follows up with the guest
      await client.from('bookings').update({ balance_status: 'failed', balance_error: errMsg(e) }).eq('id', b.id);
      results.push({ id: b.id, error: errMsg(e) });
    }
  }
  return json({ processed: results.length, results });
});
