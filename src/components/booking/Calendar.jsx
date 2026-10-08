import { addDays, diffDays, seasonFor } from '../../../supabase/functions/_shared/quote.js';
import Icon from '../Icon.jsx';

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export const nightTaken = (ranges, d) => ranges.some((r) => d >= r.start && d < r.end);

/** Last possible check-out after `checkin`: the first night already taken. */
export function checkoutLimit(ranges, checkin, maxDate) {
  const next = ranges.filter((r) => r.start > checkin).map((r) => r.start).sort()[0];
  return next && next < maxDate ? next : maxDate;
}

export default function Calendar({ month, onMonth, ranges, checkin, checkout, onPick, pricing, today, minMonth, maxMonth }) {
  const [y, m] = month.split('-').map(Number);
  const first = `${month}-01`;
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const offset = (new Date(first + 'T00:00:00Z').getUTCDay() + 6) % 7; // Monday first
  const firstBookable = addDays(today, pricing.minLeadDays);
  const lastDate = addDays(today, pricing.bookingWindowDays);
  const choosingCheckout = checkin && !checkout;
  const limit = choosingCheckout ? checkoutLimit(ranges, checkin, lastDate) : null;

  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(<span key={`e${i}`} className="cal__cell" aria-hidden="true" />);
  for (let d = 1; d <= days; d++) {
    const date = `${month}-${String(d).padStart(2, '0')}`;
    const taken = nightTaken(ranges, date);
    const outside = date < firstBookable || date > lastDate;
    let disabled;
    if (choosingCheckout && date > checkin) disabled = date > limit; // the check-out day itself may be a taken night
    else disabled = outside || taken;
    const inRange = checkin && checkout && date > checkin && date < checkout;
    const isStart = date === checkin;
    const isEnd = date === checkout;
    const season = seasonFor(pricing, date);
    const tooShort = choosingCheckout && date > checkin && diffDays(checkin, date) < seasonFor(pricing, checkin).minNights;
    const label = new Date(date + 'T00:00:00Z').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
    cells.push(
      <button
        key={date}
        type="button"
        className={[
          'cal__cell cal__day',
          taken && !(choosingCheckout && date > checkin && !disabled) ? 'is-taken' : '',
          disabled ? 'is-disabled' : '',
          inRange ? 'is-range' : '',
          isStart ? 'is-start' : '',
          isEnd ? 'is-end' : '',
          tooShort && !disabled ? 'is-short' : '',
        ].join(' ')}
        disabled={disabled}
        onClick={() => onPick(date)}
        aria-label={`${label}${taken ? ' — indisponible' : ''}`}
        aria-pressed={isStart || isEnd}
      >
        <span className="cal__num">{d}</span>
        {!taken && !outside && <span className="cal__price">{Math.round(season.nightly / 100)}</span>}
      </button>,
    );
  }

  const shift = (n) => {
    const dt = new Date(Date.UTC(y, m - 1 + n, 1));
    onMonth(dt.toISOString().slice(0, 7));
  };

  return (
    <div className="cal">
      <div className="cal__head">
        <button type="button" className="cal__nav" onClick={() => shift(-1)} disabled={month <= minMonth} aria-label="Mois précédent">
          <Icon name="arrowLeft" size={16} />
        </button>
        <p className="cal__month" aria-live="polite">
          {MONTHS[m - 1]} {y}
        </p>
        <button type="button" className="cal__nav" onClick={() => shift(1)} disabled={month >= maxMonth} aria-label="Mois suivant">
          <Icon name="arrow" size={16} />
        </button>
      </div>
      <div className="cal__grid" role="grid">
        {WEEKDAYS.map((w, i) => (
          <span key={i} className="cal__cell cal__wd" aria-hidden="true">
            {w}
          </span>
        ))}
        {cells}
      </div>
    </div>
  );
}
