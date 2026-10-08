// Price of a stay — the single implementation used by the website (display)
// and by the server (what is actually charged). Plain JS: runs in Vite and Deno.
// Dates are 'YYYY-MM-DD' strings; amounts are integer cents.

const DAY = 86400000;
export const toDate = (s) => new Date(s + 'T00:00:00Z');
export const iso = (d) => d.toISOString().slice(0, 10);
export const addDays = (s, n) => iso(new Date(toDate(s).getTime() + n * DAY));
export const diffDays = (a, b) => Math.round((toDate(b) - toDate(a)) / DAY);
export const todayIso = () => iso(new Date());
export const overlaps = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd;

/** Season of the night starting on `date` (recurring MM-DD windows, `to` excluded). */
export function seasonFor(pricing, date) {
  const md = date.slice(5);
  for (const s of pricing.seasons) {
    const inside = s.from <= s.to ? md >= s.from && md < s.to : md >= s.from || md < s.to;
    if (inside) return s;
  }
  return pricing.defaultSeason;
}

export const euros = (cents) =>
  (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: cents % 100 ? 2 : 0 });

/**
 * @typedef {{ label: string, detail?: string, amount: number }} QuoteLine
 * @typedef {{ ok: boolean, error?: string, nights: number, minNights: number, adults: number, children: number,
 *   lines: QuoteLine[], total: number, deposit: number, balance: number, payNow: number, balanceDue: string | null }} Quote
 * @returns {Quote}
 */
export function quote(pricing, { checkin, checkout, adults = 1, children = 0 }, today = todayIso()) {
  const fail = (error, extra = {}) => ({ ok: false, error, ...extra });
  const re = /^\d{4}-\d{2}-\d{2}$/;
  if (!re.test(checkin || '') || !re.test(checkout || '')) return fail('Choisissez vos dates.');
  const nights = diffDays(checkin, checkout);
  if (!(nights > 0)) return fail("La date de départ doit suivre la date d'arrivée.");
  if (diffDays(today, checkin) < pricing.minLeadDays) return fail('Cette date d’arrivée n’est plus réservable en ligne.');
  if (diffDays(today, checkout) > pricing.bookingWindowDays) return fail('Ces dates ne sont pas encore ouvertes à la réservation.');
  adults = Number(adults);
  children = Number(children);
  if (!Number.isInteger(adults) || adults < 1) return fail('Au moins un adulte.');
  if (!Number.isInteger(children) || children < 0) return fail('Nombre d’enfants invalide.');
  if (adults + children > pricing.maxGuests) return fail(`${pricing.maxGuests} voyageurs maximum.`);

  const minNights = seasonFor(pricing, checkin).minNights;
  if (nights < minNights) return fail(`Séjour de ${minNights} nuits minimum à ces dates.`, { nights, minNights });

  // group consecutive nights by season for a readable breakdown
  const groups = [];
  for (let i = 0; i < nights; i++) {
    const s = seasonFor(pricing, addDays(checkin, i));
    const g = groups.at(-1);
    if (g && g.name === s.name && g.nightly === s.nightly) g.count += 1;
    else groups.push({ name: s.name, nightly: s.nightly, count: 1 });
  }
  const lines = groups.map((g) => ({
    label: `${g.count} nuit${g.count > 1 ? 's' : ''} × ${euros(g.nightly)}`,
    detail: g.name,
    amount: g.count * g.nightly,
  }));
  if (pricing.cleaningFee) lines.push({ label: 'Ménage de fin de séjour', amount: pricing.cleaningFee });
  const tax = pricing.touristTax?.perAdultPerNight || 0;
  if (tax) lines.push({ label: 'Taxe de séjour', detail: `${adults} adulte${adults > 1 ? 's' : ''} × ${nights} nuits`, amount: tax * adults * nights });

  const total = lines.reduce((s, l) => s + l.amount, 0);
  const daysBefore = pricing.deposit.balanceDaysBefore;
  // close to the arrival: everything is paid at once
  const payInFull = diffDays(today, checkin) <= daysBefore || !pricing.deposit.percent;
  const deposit = payInFull ? total : Math.round((total * pricing.deposit.percent) / 100);
  const balance = total - deposit;
  return {
    ok: true,
    nights,
    minNights,
    adults,
    children,
    lines,
    total,
    deposit,
    balance,
    payNow: deposit,
    balanceDue: balance ? addDays(checkin, -daysBefore) : null,
  };
}
