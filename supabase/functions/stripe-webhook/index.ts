// Stripe → confirms a booking once the deposit is paid, frees the dates if the payment is abandoned.
import { db, env, errMsg, json, stripe } from '../_shared/common.ts';
import Stripe from 'npm:stripe@17';

Deno.serve(async (req) => {
  const s = stripe();
  let event: Stripe.Event;
  try {
    event = await s.webhooks.constructEventAsync(
      await req.text(),
      req.headers.get('stripe-signature') ?? '',
      env('STRIPE_WEBHOOK_SECRET'),
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
  } catch (e) {
    return json({ error: `Signature invalide: ${errMsg(e)}` }, 400);
  }

  const client = db();
  const session = event.data.object as Stripe.Checkout.Session;
  const id = session.metadata?.booking_id;
  if (!id) return json({ ignored: true });

  if (event.type === 'checkout.session.expired') {
    await client.from('bookings').update({ status: 'expired' }).eq('id', id).eq('status', 'pending');
    return json({ ok: true });
  }

  if (event.type === 'checkout.session.completed' && session.payment_status === 'paid') {
    const pi = await s.paymentIntents.retrieve(session.payment_intent as string);
    const { data: b } = await client.from('bookings').select('status, balance_cents').eq('id', id).single();
    if (b?.status === 'confirmed') return json({ ok: true, already: true });

    const { error } = await client
      .from('bookings')
      .update({
        status: 'confirmed',
        deposit_paid_at: new Date().toISOString(),
        hold_until: null,
        stripe_customer_id: (session.customer as string) ?? null,
        stripe_payment_method_id: (pi.payment_method as string) ?? null,
        balance_status: b && b.balance_cents > 0 ? 'scheduled' : 'none',
      })
      .eq('id', id);

    if (error?.code === '23P01') {
      // paid after the hold ran out and the nights were taken meanwhile: refund at once
      await s.refunds.create({ payment_intent: pi.id, reason: 'duplicate' }, { idempotencyKey: `refund-${id}` });
      await client.from('bookings').update({ status: 'cancelled', balance_error: 'Dates prises entre-temps — remboursé automatiquement' }).eq('id', id);
      return json({ ok: true, refunded: true });
    }
    if (error) throw error;
    return json({ ok: true });
  }
  return json({ ignored: event.type });
});
