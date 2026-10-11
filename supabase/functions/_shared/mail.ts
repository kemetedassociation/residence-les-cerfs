// Guest e-mails, sent from the owner's Gmail through a small Google Apps Script relay
// (same approach as the LUZDOSOL site). Every e-mail is logged once per booking and kind.
import { buildEmail } from './emails.js';
import stay from './stay.json' with { type: 'json' };
import { env, errMsg, pricing } from './common.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

const HOST = 'cerf74390@gmail.com';
// e-mails the owner also receives
const COPY_TO_HOST = new Set(['confirmation', 'cancelled', 'balanceFailed']);

const toHour = (t: string) => t.replace(':00', ' h');

/** Today's date (YYYY-MM-DD) and hour in Châtel. */
export function parisNow() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) % 24 };
}

export const mailConfigured = () => Boolean(env('MAIL_RELAY_URL', false) && env('MAIL_RELAY_SECRET', false));

/**
 * Sends `kind` to the guest unless already sent. Returns 'sent' | 'already' | 'off' | 'error: …'.
 * Never throws: an e-mail problem must not break a payment or a cancellation.
 */
// deno-lint-ignore no-explicit-any
export async function sendGuestEmail(client: SupabaseClient, kind: string, booking: any, extra: Record<string, unknown> = {}) {
  try {
    if (!mailConfigured()) return 'off';
    const { data: done } = await client.from('email_log').select('id').eq('booking_id', booking.id).eq('kind', kind).maybeSingle();
    if (done) return 'already';
    const mail = buildEmail(
      kind,
      { ...booking, checkInTime: toHour(pricing.checkInTime), checkOutTime: toHour(pricing.checkOutTime) },
      stay,
      extra,
    );
    const res = await fetch(env('MAIL_RELAY_URL'), {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: JSON.stringify({
        secret: env('MAIL_RELAY_SECRET'),
        to: booking.guest_email,
        cc: COPY_TO_HOST.has(kind) ? HOST : '',
        replyTo: HOST,
        name: 'Résidence Les Cerfs',
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      }),
    });
    const out = await res.json().catch(() => ({}));
    if (!out.ok) return `error: ${out.error ?? res.status}`;
    // unique (booking_id, kind): a concurrent duplicate simply fails here
    await client.from('email_log').insert({ booking_id: booking.id, kind });
    return 'sent';
  } catch (e) {
    console.error('mail', kind, e);
    return `error: ${errMsg(e)}`;
  }
}

// deno-lint-ignore no-explicit-any
export const skipEmail = (client: SupabaseClient, bookingId: string, kind: string) =>
  client.from('email_log').insert({ booking_id: bookingId, kind, status: 'skipped' });
