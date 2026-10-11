// Owner space API. POST { action, ... } — every action except `login` needs `Authorization: Bearer <token>`.
import { cors, db, env, errMsg, json, pricing, stripe, todayIso } from '../_shared/common.ts';
import { guestCancellationRefund } from '../_shared/policy.js';
import { balanceLink, chargeBalance } from '../_shared/balance.ts';
import { sendGuestEmail } from '../_shared/mail.ts';

const SESSION_H = 12;
const enc = new TextEncoder();
const b64url = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const hmac = async (data: string) => {
  const key = await crypto.subtle.importKey('raw', enc.encode(env('ADMIN_PASSWORD')), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
};
/** constant-time string comparison */
const same = (a: string, b: string) => {
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
};
const issueToken = async () => {
  const exp = String(Date.now() + SESSION_H * 3600000);
  return `${exp}.${await hmac(exp)}`;
};
const validToken = async (req: Request) => {
  const t = (req.headers.get('authorization') ?? '').replace(/^Bearer /, '');
  const [exp, sig] = t.split('.');
  return Boolean(exp && sig && Number(exp) > Date.now() && same(sig, await hmac(exp)));
};
const isoOk = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: { ...cors, 'Access-Control-Allow-Headers': 'content-type, authorization' } });
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405);
  const client = db();
  const body = await req.json().catch(() => ({}));
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '';

  try {
    // ── login ──────────────────────────────────────────
    if (body.action === 'login') {
      const since = new Date(Date.now() - 15 * 60000).toISOString();
      const { count } = await client.from('admin_attempts').select('id', { count: 'exact', head: true }).eq('ip', ip).gte('at', since);
      if ((count ?? 0) >= 5) return json({ error: 'Trop de tentatives. Réessayez dans 15 minutes.' }, 429);
      if (!same(String(body.password ?? ''), env('ADMIN_PASSWORD'))) {
        await client.from('admin_attempts').insert({ ip });
        return json({ error: 'Mot de passe incorrect.' }, 401);
      }
      return json({ token: await issueToken() });
    }

    if (!(await validToken(req))) return json({ error: 'Session expirée, reconnectez-vous.', code: 'auth' }, 401);

    // ── dashboard data ─────────────────────────────────
    if (body.action === 'list') {
      const [{ data: bookings, error }, { data: blocks }, { data: sync }] = await Promise.all([
        client
          .from('bookings')
          .select('*')
          .in('status', ['confirmed', 'cancelled', 'pending'])
          .order('checkin', { ascending: true })
          .limit(500),
        client.from('external_blocks').select('id, source, start_date, end_date, summary, note').gte('end_date', todayIso()).order('start_date'),
        client.from('sync_state').select('*'),
      ]);
      if (error) throw error;
      const now = new Date().toISOString();
      return json({
        bookings: (bookings ?? [])
          .filter((b) => b.status !== 'pending' || (b.hold_until && b.hold_until > now))
          .map(({ quote: _q, client_ip: _ip, stripe_payment_method_id: _pm, ...b }) => b),
        blocks: blocks ?? [],
        sync: sync ?? [],
        icalExport: `${env('SUPABASE_URL')}/functions/v1/ical?token=${env('ICAL_EXPORT_TOKEN')}`,
      });
    }

    // ── cancel a booking, with the refund chosen by the owner ─
    if (body.action === 'cancel' || body.action === 'cancel-preview') {
      const { data: b } = await client.from('bookings').select('*').eq('id', body.id).single();
      if (!b || b.status !== 'confirmed') return json({ error: 'Réservation introuvable ou déjà annulée.' }, 404);
      const paid = (b.deposit_paid_at ? b.deposit_cents : 0) + (b.balance_status === 'paid' ? b.balance_cents : 0) - b.refunded_cents;
      const policy = guestCancellationRefund(pricing.cancellation, pricing.deposit.balanceDaysBefore, { checkin: b.checkin, paid });
      if (body.action === 'cancel-preview') return json({ paid, policy });

      const mode = body.refund as 'policy' | 'full' | 'none' | 'amount';
      const refund = mode === 'full' ? paid : mode === 'none' ? 0 : mode === 'amount' ? Math.round(Number(body.amount) * 100) : policy.refund;
      if (!Number.isInteger(refund) || refund < 0 || refund > paid) return json({ error: `Montant de remboursement invalide (maximum ${(paid / 100).toFixed(2)} €).` }, 400);

      // refund the balance payment first, then the deposit
      const s = stripe();
      let left = refund;
      for (const pi of [b.balance_status === 'paid' ? b.balance_payment_intent : null, b.deposit_payment_intent]) {
        if (!left || !pi) continue;
        const intent = await s.paymentIntents.retrieve(pi, { expand: ['latest_charge'] });
        const refundable = intent.amount_received - (intent.latest_charge && typeof intent.latest_charge !== 'string' ? intent.latest_charge.amount_refunded : 0);
        const amount = Math.min(left, refundable);
        if (amount > 0) {
          await s.refunds.create({ payment_intent: pi, amount, reason: 'requested_by_customer' }, { idempotencyKey: `cancel-${b.id}-${pi}-${amount}` });
          left -= amount;
        }
      }
      if (left > 0) return json({ error: 'Remboursement partiel uniquement : vérifiez dans Stripe.' }, 500);
      await client
        .from('bookings')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancel_reason: String(body.reason ?? '').slice(0, 300) || null,
          refunded_cents: b.refunded_cents + refund,
          balance_status: b.balance_status === 'scheduled' || b.balance_status === 'failed' ? 'none' : b.balance_status,
        })
        .eq('id', b.id);
      const mail = body.notify === false ? 'not sent' : await sendGuestEmail(client, 'cancelled', b, { refunded: refund });
      return json({ ok: true, refunded: refund, mail });
    }

    // ── owner blocks dates (exported to Airbnb too) ────
    if (body.action === 'block') {
      if (!isoOk(body.start) || !isoOk(body.end) || body.end <= body.start) return json({ error: 'Dates invalides.' }, 400);
      const { error } = await client.from('external_blocks').insert({ source: 'manual', start_date: body.start, end_date: body.end, note: String(body.note ?? '').slice(0, 200) || null, summary: 'Bloqué par le propriétaire' });
      if (error) throw error;
      return json({ ok: true });
    }
    if (body.action === 'unblock') {
      await client.from('external_blocks').delete().eq('id', body.id).eq('source', 'manual');
      return json({ ok: true });
    }

    // ── balance: payment link, retry, or paid outside Stripe ─
    if (body.action === 'balance-link' || body.action === 'balance-retry' || body.action === 'balance-paid') {
      const { data: b } = await client.from('bookings').select('*').eq('id', body.id).single();
      if (!b || b.status !== 'confirmed' || b.balance_cents <= 0 || b.balance_status === 'paid') return json({ error: 'Aucun solde à régler pour cette réservation.' }, 400);
      if (body.action === 'balance-paid') {
        await client.from('bookings').update({ balance_status: 'paid', balance_paid_at: new Date().toISOString(), balance_error: 'Réglé hors site (indiqué par le propriétaire)' }).eq('id', b.id);
        return json({ ok: true });
      }
      if (body.action === 'balance-retry') {
        try {
          const pi = await chargeBalance(b, `balance-retry-${b.id}-${Date.now()}`);
          const paid = pi.status === 'succeeded';
          await client.from('bookings').update(paid ? { balance_status: 'paid', balance_paid_at: new Date().toISOString(), balance_error: null, balance_payment_intent: pi.id } : { balance_status: 'failed', balance_error: `Statut Stripe : ${pi.status}` }).eq('id', b.id);
          if (paid) await sendGuestEmail(client, 'balancePaid', b);
          return json({ ok: paid, status: pi.status });
        } catch (e) {
          await client.from('bookings').update({ balance_status: 'failed', balance_error: errMsg(e) }).eq('id', b.id);
          return json({ error: `Prélèvement refusé : ${errMsg(e)}` }, 402);
        }
      }
      return json({ url: await balanceLink(b), expires: '23 heures' });
    }

    return json({ error: 'Action inconnue' }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: `Erreur : ${errMsg(e)}` }, 500);
  }
});
