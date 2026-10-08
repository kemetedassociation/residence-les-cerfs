import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { quote, seasonFor, euros } from '../supabase/functions/_shared/quote.js';
import { parseIcal, buildIcal, mergeRanges } from '../supabase/functions/_shared/ical.js';

const pricing = JSON.parse(readFileSync(new URL('../supabase/functions/_shared/pricing.json', import.meta.url)));
const T = '2026-10-08';

// seasons, including the one wrapping over New Year
assert.equal(seasonFor(pricing, '2026-12-25').name, "Fêtes de fin d'année");
assert.equal(seasonFor(pricing, '2027-01-02').name, "Fêtes de fin d'année");
assert.equal(seasonFor(pricing, '2027-01-04').name, 'Hiver');
assert.equal(seasonFor(pricing, '2027-05-10').name, 'Basse saison');

// basic stay far ahead: 30 % deposit, balance due 30 days before
let q = quote(pricing, { checkin: '2027-02-01', checkout: '2027-02-06', adults: 4, children: 2 }, T);
assert.ok(q.ok, q.error);
assert.equal(q.nights, 5);
assert.equal(q.total, 5 * 35000 + 15000);
assert.equal(q.deposit, Math.round(q.total * 0.3));
assert.equal(q.deposit + q.balance, q.total);
assert.equal(q.balanceDue, '2027-01-02');

// stay spanning two seasons is split in two lines
q = quote(pricing, { checkin: '2027-04-17', checkout: '2027-04-23', adults: 2 }, T);
assert.ok(q.ok, q.error);
assert.equal(q.lines[0].amount, 3 * 35000);
assert.equal(q.lines[1].amount, 3 * 22000);

// arrival within 30 days → pay in full
q = quote(pricing, { checkin: '2026-10-20', checkout: '2026-10-23', adults: 2 }, T);
assert.ok(q.ok, q.error);
assert.equal(q.balance, 0);
assert.equal(q.payNow, q.total);

// rules
assert.match(quote(pricing, { checkin: '2027-02-01', checkout: '2027-02-03', adults: 2 }, T).error, /4 nuits minimum/);
assert.match(quote(pricing, { checkin: '2027-02-01', checkout: '2027-02-08', adults: 8, children: 3 }, T).error, /10 voyageurs/);
assert.match(quote(pricing, { checkin: '2026-10-08', checkout: '2026-10-12', adults: 2 }, T).error, /plus réservable/);
assert.match(quote(pricing, { checkin: '2027-02-05', checkout: '2027-02-01', adults: 2 }, T).error, /départ/);
assert.equal(euros(35000).replace(/\s/g, ' '), '350 €');

// iCal: Airbnb style feed, folded line, single-day event
const feed = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nDTEND;VALUE=DATE:20261215\r\nDTSTART;VALUE=DATE:20261210\r\nUID:abc@airbnb.com\r\nSUMMARY:Reserved\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nDTSTART;VALUE=DATE:20261220\r\nUID:x\r\n y@airbnb.com\r\nSUMMARY:Airbnb (Not available)\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n';
const ev = parseIcal(feed);
assert.deepEqual(ev[0], { end: '2026-12-15', start: '2026-12-10', uid: 'abc@airbnb.com', summary: 'Reserved' });
assert.equal(ev[1].uid, 'xy@airbnb.com');
assert.equal(ev[1].end, '2026-12-21');
// round trip
assert.deepEqual(parseIcal(buildIcal(ev)).map((e) => [e.start, e.end]), ev.map((e) => [e.start, e.end]));
// merge
assert.deepEqual(mergeRanges([{ start: '2026-12-10', end: '2026-12-15' }, { start: '2026-12-15', end: '2026-12-18' }, { start: '2027-01-01', end: '2027-01-03' }]), [{ start: '2026-12-10', end: '2026-12-18' }, { start: '2027-01-01', end: '2027-01-03' }]);

console.log('booking core: all tests passed');
