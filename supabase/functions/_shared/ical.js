// Minimal iCalendar (RFC 5545) reading/writing for availability sync with Airbnb.
// Events are whole days: { uid, start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' (excluded), summary }.

const dateOf = (v) => {
  const m = /^(\d{4})(\d{2})(\d{2})/.exec(v.trim());
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
};

/**
 * @param {string} text
 * @returns {{ uid?: string, start: string, end: string, summary?: string }[]}
 */
export function parseIcal(text) {
  // unfold continuation lines (CRLF followed by a space or tab)
  const lines = text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
  const events = [];
  let ev = null;
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') ev = {};
    else if (line === 'END:VEVENT') {
      if (ev?.start) {
        if (!ev.end || ev.end <= ev.start) {
          const d = new Date(ev.start + 'T00:00:00Z');
          d.setUTCDate(d.getUTCDate() + 1);
          ev.end = d.toISOString().slice(0, 10);
        }
        events.push(ev);
      }
      ev = null;
    } else if (ev) {
      const i = line.indexOf(':');
      if (i < 0) continue;
      const name = line.slice(0, i).split(';')[0].toUpperCase();
      const value = line.slice(i + 1);
      if (name === 'DTSTART') ev.start = dateOf(value);
      else if (name === 'DTEND') ev.end = dateOf(value);
      else if (name === 'UID') ev.uid = value.trim();
      else if (name === 'SUMMARY') ev.summary = value.trim();
    }
  }
  return events;
}

const esc = (s) => String(s).replace(/[\;,]/g, (c) => '\\' + c).replace(/\n/g, '\\n');
const compact = (d) => d.replaceAll('-', '');

export function buildIcal(events, { name = 'Calendrier', stamp = new Date() } = {}) {
  const dtstamp = stamp.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const out = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Residence Les Cerfs//Reservations//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${esc(name)}`];
  for (const e of events) {
    out.push(
      'BEGIN:VEVENT',
      `UID:${esc(e.uid)}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${compact(e.start)}`,
      `DTEND;VALUE=DATE:${compact(e.end)}`,
      `SUMMARY:${esc(e.summary || 'Réservé')}`,
      'END:VEVENT',
    );
  }
  out.push('END:VCALENDAR');
  return out.join('\r\n') + '\r\n';
}

/** Sorted, merged list of [start, end) ranges. */
export function mergeRanges(ranges) {
  const sorted = ranges.filter((r) => r.start < r.end).sort((a, b) => (a.start < b.start ? -1 : 1));
  const out = [];
  for (const r of sorted) {
    const last = out.at(-1);
    if (last && r.start <= last.end) last.end = r.end > last.end ? r.end : last.end;
    else out.push({ start: r.start, end: r.end });
  }
  return out;
}
