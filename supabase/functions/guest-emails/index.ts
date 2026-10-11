// Hourly (pg_cron): sends the e-mails of each stay (J-1, J, J+1, J+5, eve of departure, thanks)
// between 9:00 and 20:00 in Châtel, and catches up any confirmation that could not be sent.
import { db, env, json } from '../_shared/common.ts';
import { scheduledFor } from '../_shared/emails.js';
import { addDays } from '../_shared/quote.js';
import { mailConfigured, parisNow, sendGuestEmail, skipEmail } from '../_shared/mail.ts';

Deno.serve(async (req) => {
  if (req.headers.get('x-cron-secret') !== env('CRON_SECRET')) return json({ error: 'forbidden' }, 403);
  if (!mailConfigured()) return json({ skipped: 'mail relay not configured' });
  const client = db();
  const { date: today, hour } = parisNow();

  const { data: bookings, error } = await client
    .from('bookings')
    .select('*, email_log(kind)')
    .eq('status', 'confirmed')
    .gte('checkout', addDays(today, -2))
    .lte('checkin', addDays(today, 400));
  if (error) return json({ error: error.message }, 500);

  const results: Record<string, string>[] = [];
  for (const b of bookings ?? []) {
    const sent = new Set<string>((b.email_log ?? []).map((l: { kind: string }) => l.kind));
    if (!sent.has('confirmation')) results.push({ ref: b.ref, kind: 'confirmation', r: await sendGuestEmail(client, 'confirmation', b) });
    if (hour < 9 || hour >= 20) continue;
    const { send, skip } = scheduledFor(b, today, sent);
    for (const k of skip) await skipEmail(client, b.id, k);
    if (send) results.push({ ref: b.ref, kind: send, r: await sendGuestEmail(client, send, b) });
  }
  return json({ today, hour, results });
});
