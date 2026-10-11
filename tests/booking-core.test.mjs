import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { quote, seasonFor, euros } from '../supabase/functions/_shared/quote.js';
import { parseIcal, buildIcal, mergeRanges } from '../supabase/functions/_shared/ical.js';

const pricing = JSON.parse(readFileSync(new URL('../supabase/functions/_shared/pricing.json', import.meta.url)));
const T = '2026-10-11';
const S = (d) => seasonFor(pricing, d).name;

// school holidays win over the broad seasons
assert.equal(S('2026-12-18'), 'Vacances de Noël');
assert.equal(S('2027-01-03'), 'Vacances de Noël'); // 3 janvier inclus
assert.equal(S('2027-01-04'), "Saison d'hiver");
assert.equal(S('2027-02-06'), "Vacances d'hiver");
assert.equal(S('2027-03-07'), "Vacances d'hiver");
assert.equal(S('2027-03-08'), "Saison d'hiver");
assert.equal(S('2027-04-03'), 'Vacances de printemps');
assert.equal(S('2027-05-02'), 'Vacances de printemps');
assert.equal(S('2027-05-03'), 'Printemps');
assert.equal(S('2027-07-03'), 'Été');
assert.equal(S('2027-09-15'), 'Automne');
assert.equal(S('2026-10-25'), 'Vacances de la Toussaint');
assert.equal(S('2026-11-20'), 'Avant les fêtes');

// a whole week costs exactly the weekly price
let q = quote(pricing, { checkin: '2027-02-06', checkout: '2027-02-13', adults: 6, children: 2 }, T);
assert.ok(q.ok, q.error);
assert.equal(q.total, 300000);
assert.equal(q.lines[0].label.replace(/\s/g, ' '), '1 semaine × 3 000 €');
assert.equal(q.deposit, 90000);
assert.equal(q.balance, 210000);
assert.equal(q.balanceDue, '2027-01-07');
q = quote(pricing, { checkin: '2027-07-03', checkout: '2027-07-17', adults: 4 }, T);
assert.equal(q.total, 400000);

// shorter stay pro rata; stay spanning two seasons is split
q = quote(pricing, { checkin: '2027-05-10', checkout: '2027-05-13', adults: 2 }, T);
assert.ok(q.ok, q.error);
assert.equal(q.total, Math.round((3 * 160000) / 7));
q = quote(pricing, { checkin: '2027-03-04', checkout: '2027-03-12', adults: 2 }, T); // 4 n. vacances + 4 n. saison
assert.ok(q.ok, q.error);
assert.equal(q.lines.length, 2);
assert.equal(q.total, Math.round((4 * 300000) / 7) + Math.round((4 * 250000) / 7));

// arrival within 30 days → pay in full
q = quote(pricing, { checkin: '2026-10-23', checkout: '2026-10-30', adults: 2 }, T);
assert.ok(q.ok, q.error);
assert.equal(q.total, 180000);
assert.equal(q.balance, 0);

// rules
assert.match(quote(pricing, { checkin: '2027-02-06', checkout: '2027-02-10', adults: 2 }, T).error, /7 nuits minimum/);
assert.match(quote(pricing, { checkin: '2027-05-10', checkout: '2027-05-14', adults: 8, children: 3 }, T).error, /10 voyageurs/);
assert.match(quote(pricing, { checkin: '2026-10-11', checkout: '2026-10-14', adults: 2 }, T).error, /plus réservable/);
assert.match(quote(pricing, { checkin: '2027-05-14', checkout: '2027-05-10', adults: 2 }, T).error, /départ/);
assert.equal(euros(300000).replace(/\s/g, ' '), '3 000 €');

// iCal: Airbnb style feed, folded line, single-day event
const feed = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nDTEND;VALUE=DATE:20261215\r\nDTSTART;VALUE=DATE:20261210\r\nUID:abc@airbnb.com\r\nSUMMARY:Reserved\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nDTSTART;VALUE=DATE:20261220\r\nUID:x\r\n y@airbnb.com\r\nSUMMARY:Airbnb (Not available)\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n';
const ev = parseIcal(feed);
assert.deepEqual(ev[0], { end: '2026-12-15', start: '2026-12-10', uid: 'abc@airbnb.com', summary: 'Reserved' });
assert.equal(ev[1].uid, 'xy@airbnb.com');
assert.equal(ev[1].end, '2026-12-21');
assert.deepEqual(parseIcal(buildIcal(ev)).map((e) => [e.start, e.end]), ev.map((e) => [e.start, e.end]));
assert.deepEqual(mergeRanges([{ start: '2026-12-10', end: '2026-12-15' }, { start: '2026-12-15', end: '2026-12-18' }, { start: '2027-01-01', end: '2027-01-03' }]), [{ start: '2026-12-10', end: '2026-12-18' }, { start: '2027-01-01', end: '2027-01-03' }]);

console.log('booking core: all tests passed');
