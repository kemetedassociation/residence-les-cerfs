import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { buildEmail, TEMPLATES, scheduledFor, makeRef } from '../supabase/functions/_shared/emails.js';
import { quote } from '../supabase/functions/_shared/quote.js';

const pricing = JSON.parse(readFileSync(new URL('../supabase/functions/_shared/pricing.json', import.meta.url)));
const stay = JSON.parse(readFileSync(new URL('../supabase/functions/_shared/stay.json', import.meta.url)));
const q = quote(pricing, { checkin: '2027-02-06', checkout: '2027-02-13', adults: 6, children: 2 }, '2026-10-11');
const b = {
  ref: makeRef('2027-02-06'), guest_name: 'Jeanne Martin', checkin: '2027-02-06', checkout: '2027-02-13', adults: 6, children: 2,
  total_cents: q.total, deposit_cents: q.deposit, balance_cents: q.balance, balance_due: q.balanceDue, quote: q,
  checkInTime: pricing.checkInTime.replace(':00', ' h'), checkOutTime: pricing.checkOutTime.replace(':00', ' h'),
};
assert.match(b.ref, /^CERF-20270206-[A-Z2-9]{4}$/);

const out = process.env.PREVIEW_DIR;
if (out) mkdirSync(out, { recursive: true });
for (const kind of Object.keys(TEMPLATES)) {
  const m = buildEmail(kind, b, stay, { url: 'https://checkout.stripe.com/c/pay/exemple', refunded: 90000 });
  for (const part of ['subject', 'text']) assert.doesNotMatch(m[part], /[—–·✦]/, `${kind} ${part} contient un tiret long ou un séparateur`);
  assert.doesNotMatch(m.html.replace(/<[^>]+>/g, ''), /[—–·✦]/, `${kind} html`);
  assert.ok(m.text.includes(stay.signature));
  if (out) writeFileSync(`${out}/${kind}.html`, m.html);
}
assert.match(buildEmail('confirmation', b, stay).text, /Dossier : CERF-/);
assert.match(buildEmail('confirmation', b, stay).text.replace(/\s/g, ' '), /Taxe de séjour \(6 adultes × 7 nuits × 2,68 €\) : 112,56 € Total du séjour : 3 112,56 € Acompte réglé ce jour : 933,77 € Solde : 2 178,79 €, prélevé automatiquement le jeudi 7 janvier 2027/);

// schedule: a week from 6 to 13 Feb
const S = (today, sent = []) => scheduledFor(b, today, new Set(sent));
assert.equal(S('2027-02-05').send, 'dayBefore');
assert.equal(S('2027-02-06').send, 'welcome');
assert.equal(S('2027-02-07').send, 'checkIn');
assert.equal(S('2027-02-11').send, 'midStay');
assert.equal(S('2027-02-12').send, 'departure');
assert.equal(S('2027-02-14').send, 'thanks');
assert.equal(S('2027-02-09').send, null);
assert.equal(S('2027-02-06', ['welcome']).send, null);
// 2-night stay: day after arrival is also the eve of departure → departure only, J+1 skipped
const short = { ...b, checkin: '2027-05-10', checkout: '2027-05-12' };
const r = scheduledFor(short, '2027-05-11', new Set());
assert.equal(r.send, 'departure');
assert.deepEqual(r.skip, ['checkIn']);
console.log('emails: all tests passed');
