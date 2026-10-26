// Balance helpers shared by the daily job and the owner space.
import { env, frDate, stripe } from './common.ts';

// deno-lint-ignore no-explicit-any
const label = (b: any) => `Solde, séjour du ${frDate(b.checkin)} au ${frDate(b.checkout)}, dossier ${b.ref ?? ''}`.trim();

/** Off-session charge of the balance with the card saved at booking time. */
// deno-lint-ignore no-explicit-any
export const chargeBalance = (b: any, idempotencyKey: string) =>
  stripe().paymentIntents.create(
    {
      amount: b.balance_cents,
      currency: 'eur',
      customer: b.stripe_customer_id,
      payment_method: b.stripe_payment_method_id,
      off_session: true,
      confirm: true,
      description: `${label(b)}, Résidence Les Cerfs`,
      metadata: { booking_id: b.id, kind: 'balance', dossier: b.ref ?? '' },
      receipt_email: b.guest_email,
    },
    { idempotencyKey },
  );

/** Stripe Checkout page (23 h) for the guest to pay the balance by hand. */
// deno-lint-ignore no-explicit-any
export async function balanceLink(b: any) {
  const site = env('SITE_URL').replace(/\/$/, '') + '/';
  const session = await stripe().checkout.sessions.create({
    ui_mode: 'hosted',
    mode: 'payment',
    billing_address_collection: 'auto',
    phone_number_collection: { enabled: true },
    automatic_tax: { enabled: false },
    allow_promotion_codes: false,
    submit_type: 'auto',
    name_collection: {
      individual: { enabled: true, optional: true },
      business: { enabled: true, optional: true },
    },
    saved_payment_method_options: { payment_method_save: 'enabled' },
    integration_identifier: 'hosted_mobile_app_0001',
    origin_context: 'web',
    locale: 'fr',
    payment_method_types: ['card'],
    customer: b.stripe_customer_id ?? undefined,
    customer_email: b.stripe_customer_id ? undefined : b.guest_email,
    line_items: [{ quantity: 1, price_data: { currency: 'eur', unit_amount: b.balance_cents, product_data: { name: label(b), description: 'Résidence Les Cerfs, Châtel' } } }],
    payment_intent_data: { description: `${label(b)}, Résidence Les Cerfs`, receipt_email: b.guest_email, metadata: { booking_id: b.id, kind: 'balance', dossier: b.ref ?? '' } },
    metadata: { booking_id: b.id, kind: 'balance' },
    expires_at: Math.floor(Date.now() / 1000) + 23 * 3600,
    success_url: `${site}?reservation=solde#reserver`,
    cancel_url: site,
  });
  return session.url as string;
}
