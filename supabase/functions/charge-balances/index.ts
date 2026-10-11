// Daily (pg_cron): charges every balance that is due with the card saved at booking time.
// Success → receipt e-mail. Refused (e.g. the bank asks for authentication) → the guest
// automatically receives a payment link, the owner gets a copy and an alert in the owner space.
import { db, env, errMsg, json, todayIso } from '../_shared/common.ts';
import { balanceLink, chargeBalance } from '../_shared/balance.ts';
import { sendGuestEmail } from '../_shared/mail.ts';

Deno.serve(async (req) => {
  if (req.headers.get('x-cron-secret') !== env('CRON_SECRET')) return json({ error: 'forbidden' }, 403);
  const client = db();
  const { data: due, error } = await client
    .from('bookings')
    .select('*')
    .eq('status', 'confirmed')
    .eq('balance_status', 'scheduled')
    .lte('balance_due', todayIso());
  if (error) return json({ error: error.message }, 500);

  const results = [];
  for (const b of due ?? []) {
    let failure = '';
    try {
      const pi = await chargeBalance(b, `balance-${b.id}`);
      if (pi.status === 'succeeded') {
        await client.from('bookings').update({ balance_status: 'paid', balance_paid_at: new Date().toISOString(), balance_error: null, balance_payment_intent: pi.id }).eq('id', b.id);
        results.push({ ref: b.ref, status: 'paid', mail: await sendGuestEmail(client, 'balancePaid', b) });
        continue;
      }
      failure = `Statut Stripe : ${pi.status}`;
    } catch (e) {
      failure = errMsg(e);
    }
    await client.from('bookings').update({ balance_status: 'failed', balance_error: failure }).eq('id', b.id);
    let mail = 'no link';
    try {
      mail = await sendGuestEmail(client, 'balanceFailed', b, { url: await balanceLink(b) });
    } catch (e) {
      mail = errMsg(e);
    }
    results.push({ ref: b.ref, status: 'failed', failure, mail });
  }
  return json({ processed: results.length, results });
});
