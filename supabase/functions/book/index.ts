// POST { checkin, checkout, adults, children, name, email, phone, message, acceptTerms }
// → holds the dates for 30 min and returns a Stripe Checkout URL for the deposit (or full amount).
import { quote, overlaps } from '../_shared/quote.js';
import { cors, db, env, expireHolds, frDate, json, pricing, stripe, syncAirbnb, unavailableRanges } from '../_shared/common.ts';

const HOLD_MIN = 30;
const emailOk = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
const clean = (s: unknown, max: number) => String(s ?? '').trim().slice(0, max);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405);
  try {
    const body = await req.json().catch(() => ({}));
    const name = clean(body.name, 120);
    const email = clean(body.email, 160).toLowerCase();
    const phone = clean(body.phone, 40);
    const message = clean(body.message, 1500);
    if (name.length < 2) return json({ error: 'Indiquez votre nom.' }, 400);
    if (!emailOk(email)) return json({ error: 'Adresse e-mail invalide.' }, 400);
    if (body.acceptTerms !== true) return json({ error: 'Merci d’accepter les conditions de réservation.' }, 400);

    // price is always recomputed here — never trusted from the browser
    const q = quote(pricing, { checkin: body.checkin, checkout: body.checkout, adults: body.adults, children: body.children });
    if (!q.ok) return json({ error: q.error }, 400);
    const { checkin, checkout } = body as { checkin: string; checkout: string };

    const client = db();
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '';
    await expireHolds(client);
    if (ip) {
      const since = new Date(Date.now() - 3600000).toISOString();
      const { count } = await client.from('bookings').select('id', { count: 'exact', head: true }).eq('client_ip', ip).eq('status', 'pending').gte('created_at', since);
      if ((count ?? 0) >= 3) return json({ error: 'Trop de tentatives. Réessayez dans une heure ou contactez-nous.' }, 429);
    }

    await syncAirbnb(client, 5);
    const taken = (await unavailableRanges(client)).some((r) => overlaps(checkin, checkout, r.start, r.end));
    if (taken) return json({ error: 'Ces dates viennent d’être réservées. Choisissez d’autres dates.', code: 'unavailable' }, 409);

    const holdUntil = new Date(Date.now() + (HOLD_MIN + 2) * 60000).toISOString();
    const { data: booking, error } = await client
      .from('bookings')
      .insert({
        checkin, checkout, adults: q.adults, children: q.children,
        guest_name: name, guest_email: email, guest_phone: phone || null, message: message || null,
        total_cents: q.total, deposit_cents: q.deposit, balance_cents: q.balance, balance_due: q.balanceDue,
        quote: q, hold_until: holdUntil, client_ip: ip || null,
      })
      .select('id')
      .single();
    if (error) {
      // exclusion constraint: someone else took these nights a moment ago
      if (error.code === '23P01') return json({ error: 'Ces dates viennent d’être réservées. Choisissez d’autres dates.', code: 'unavailable' }, 409);
      throw error;
    }

    const site = env('SITE_URL').replace(/\/$/, '') + '/';
    const stay = `Séjour du ${frDate(checkin)} au ${frDate(checkout)}`;
    const guests = q.adults + q.children;
    const session = await stripe().checkout.sessions.create({
      mode: 'payment',
      locale: 'fr',
      customer_email: email,
      customer_creation: 'always',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: pricing.currency,
            unit_amount: q.payNow,
            product_data: {
              name: q.balance ? `Acompte ${pricing.deposit.percent} % — ${stay}` : stay,
              description: `Résidence Les Cerfs, Châtel · ${q.nights} nuits · ${guests} voyageur${guests > 1 ? 's' : ''}` +
                (q.balance && q.balanceDue ? ` · solde de ${(q.balance / 100).toFixed(2).replace('.', ',')} € prélevé le ${frDate(q.balanceDue)}` : ''),
            },
          },
        },
      ],
      payment_intent_data: {
        description: `${stay} — Résidence Les Cerfs`,
        metadata: { booking_id: booking.id, kind: q.balance ? 'deposit' : 'full' },
        // keep the card for the automatic balance payment
        ...(q.balance ? { setup_future_usage: 'off_session' as const } : {}),
      },
      metadata: { booking_id: booking.id },
      expires_at: Math.floor(Date.now() / 1000) + HOLD_MIN * 60,
      success_url: `${site}?reservation=confirmee&session_id={CHECKOUT_SESSION_ID}#reserver`,
      cancel_url: `${site}?reservation=annulee#reserver`,
    });

    await client.from('bookings').update({ stripe_session_id: session.id }).eq('id', booking.id);
    return json({ url: session.url });
  } catch (e) {
    console.error(e);
    return json({ error: 'La réservation n’a pas pu être créée. Réessayez ou contactez-nous.' }, 500);
  }
});
