// Guest e-mails: plain JS templates (subject + text + HTML), used by the Edge Functions
// and by the local preview/tests. Wording rule: no long dashes, no "·" separators.
import { diffDays, euros } from './quote.js';

const SITE = 'https://kemetedassociation.github.io/residence-les-cerfs/';
const LOGO = SITE + 'logo-full.png';

export const frDay = (d, withYear = true) =>
  new Date(d + 'T00:00:00Z').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', ...(withYear ? { year: 'numeric' } : {}), timeZone: 'UTC' });
const first = (name) => String(name || '').trim().split(/\s+/)[0] || '';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const plural = (n, w) => `${n} ${w}${n > 1 ? 's' : ''}`;
const guests = (b) => plural(b.adults + b.children, 'voyageur');

/** File number shown to the guest, e.g. CERF-20270206-A3F9 */
export function makeRef(checkin, rand = Math.random) {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 4; i++) s += abc[Math.floor(rand() * abc.length)];
  return `CERF-${checkin.replaceAll('-', '')}-${s}`;
}

// ── layout ─────────────────────────────────────────────
// blocks: { p } paragraph | { h } heading | { list: [] } | { rows: [[label, value, strong?]] } | { button: [label, url] } | { note }
function render({ title, preheader, blocks }, stay) {
  const html = [];
  const text = [];
  for (const b of blocks) {
    if (b.p) {
      html.push(`<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#2b2724">${b.p}</p>`);
      text.push(b.p.replace(/<[^>]+>/g, ''), '');
    } else if (b.h) {
      html.push(`<p style="margin:26px 0 10px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8b6a4a">${esc(b.h)}</p>`);
      text.push(b.h.toUpperCase(), '');
    } else if (b.list) {
      html.push(`<ul style="margin:0 0 16px;padding-left:18px">${b.list.map((li) => `<li style="margin:0 0 8px;font-size:14px;line-height:1.55;color:#2b2724">${esc(li)}</li>`).join('')}</ul>`);
      text.push(...b.list.map((li) => `- ${li}`), '');
    } else if (b.rows) {
      html.push(
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;border-collapse:collapse;border-top:1px solid #e3dccf">${b.rows
          .map(
            ([l, v, strong]) =>
              `<tr><td style="padding:9px 0;border-bottom:1px solid #e3dccf;font-size:14px;color:#6b635b">${esc(l)}</td><td align="right" style="padding:9px 0;border-bottom:1px solid #e3dccf;font-size:14px;color:#1d1a17;${strong ? 'font-weight:bold' : ''}">${esc(v)}</td></tr>`,
          )
          .join('')}</table>`,
      );
      text.push(...b.rows.map(([l, v]) => `${l} : ${v}`), '');
    } else if (b.button) {
      html.push(
        `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 22px"><tr><td style="background:#d7c3a3"><a href="${esc(b.button[1])}" style="display:inline-block;padding:14px 26px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#080808;text-decoration:none;font-weight:bold">${esc(b.button[0])}</a></td></tr></table>`,
      );
      text.push(`${b.button[0]} : ${b.button[1]}`, '');
    } else if (b.note) {
      html.push(`<p style="margin:0 0 14px;font-size:12px;line-height:1.5;color:#8a837a">${b.note}</p>`);
      text.push(b.note.replace(/<[^>]+>/g, ''), '');
    }
  }
  const sig = esc(stay.signature);
  text.push(stay.signature, ...(stay.hostPhone ? [`Tél. ${stay.hostPhone}`] : []), SITE);
  return {
    text: text.filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n').trim(),
    html: `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#efe9df">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader || '')}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#efe9df"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
<tr><td align="center" style="background:#080808;padding:28px 24px"><img src="${LOGO}" width="150" alt="Résidence Les Cerfs" style="display:block;width:150px;max-width:60%;height:auto;border:0"></td></tr>
<tr><td style="padding:34px 32px 10px"><h1 style="margin:0 0 22px;font-size:22px;font-weight:normal;letter-spacing:1px;text-transform:uppercase;color:#1d1a17">${esc(title)}</h1>
${html.join('\n')}
<p style="margin:26px 0 0;font-size:15px;line-height:1.6;color:#2b2724">${sig}${stay.hostPhone ? `<br><a href="tel:${esc(stay.hostPhone.replace(/\s/g, ''))}" style="color:#8b6a4a">${esc(stay.hostPhone)}</a>` : ''}</p></td></tr>
<tr><td style="padding:22px 32px 30px;font-size:11px;line-height:1.6;color:#8a837a;border-top:1px solid #efe9df">Résidence Les Cerfs, Châtel (Haute-Savoie). Meublé de tourisme n° 74063001813VP.<br>
<a href="${SITE}" style="color:#8b6a4a">Site de la résidence</a> &nbsp; <a href="${SITE}conditions/" style="color:#8b6a4a">Conditions de location</a></td></tr>
</table></td></tr></table></body></html>`,
  };
}

const stayRows = (b) => [
  ['Dossier', b.ref, true],
  ['Arrivée', `${frDay(b.checkin)}, dès ${b.checkInTime}`],
  ['Départ', `${frDay(b.checkout)}, avant ${b.checkOutTime}`],
  ['Durée', plural(diffDays(b.checkin, b.checkout), 'nuit')],
  ['Voyageurs', `${plural(b.adults, 'adulte')}${b.children ? `, ${plural(b.children, 'enfant')}` : ''}`],
];

const arrivalBlocks = (stay) => {
  const a = stay.arrival;
  const rows = [
    ['Adresse', a.address],
    ['Accès et clés', a.access],
    ['Stationnement', a.parking],
    ['Wifi', a.wifi],
  ].filter(([, v]) => v);
  return rows.length
    ? [{ rows }]
    : [{ p: 'Nous vous appellerons pour organiser votre arrivée et la remise des clés. Vous pouvez aussi répondre simplement à cet e-mail.' }];
};

// ── templates ──────────────────────────────────────────
// b = booking row + { checkInTime, checkOutTime } ; extra = template specific data
export const TEMPLATES = {
  confirmation: (b, stay) => {
    const lines = (b.quote?.lines ?? []).map((l) => [`${l.label}${l.detail ? ` (${l.detail})` : ''}`, euros(l.amount)]);
    const paidNow = b.deposit_cents;
    return {
      subject: `Réservation confirmée, dossier ${b.ref}`,
      title: 'Réservation confirmée',
      preheader: `${frDay(b.checkin, false)} au ${frDay(b.checkout, false)}, merci de votre confiance.`,
      blocks: [
        { p: `Bonjour ${esc(first(b.guest_name))},` },
        { p: `Merci pour votre réservation à la Résidence Les Cerfs, à Châtel. Votre paiement est bien reçu et votre séjour est <strong>confirmé</strong>. Conservez ce message : il vaut reçu.` },
        { h: 'Votre séjour' },
        { rows: stayRows(b) },
        { h: 'Détail du prix' },
        {
          rows: [
            ...lines,
            ['Total du séjour', euros(b.total_cents), true],
            [b.balance_cents ? 'Acompte réglé ce jour' : 'Réglé ce jour', euros(paidNow), true],
            ...(b.balance_cents ? [['Solde', `${euros(b.balance_cents)}, prélevé automatiquement le ${frDay(b.balance_due)}`]] : []),
          ],
        },
        { h: 'La suite' },
        {
          list: [
            'La veille de votre arrivée, vous recevrez toutes les informations pratiques.',
            ...(b.balance_cents ? ['Le solde sera prélevé sur la carte utilisée, sans démarche de votre part. Vous recevrez un reçu.'] : []),
            'Une question, une demande particulière ? Répondez simplement à cet e-mail.',
          ],
        },
        { button: ['Conditions de location', `${SITE}conditions/`] },
        { note: 'Un reçu de paiement Stripe vous est également envoyé séparément.' },
      ],
    };
  },

  balancePaid: (b) => ({
    subject: `Solde réglé, dossier ${b.ref}`,
    title: 'Solde réglé',
    preheader: `Votre séjour du ${frDay(b.checkin, false)} est entièrement réglé.`,
    blocks: [
      { p: `Bonjour ${esc(first(b.guest_name))},` },
      { p: `Le solde de votre séjour vient d'être réglé. Votre réservation est désormais <strong>entièrement payée</strong>.` },
      { rows: [['Dossier', b.ref, true], ['Séjour', `${frDay(b.checkin, false)} au ${frDay(b.checkout)}`], ['Solde réglé', euros(b.balance_cents), true], ['Total payé', euros(b.total_cents)]] },
      { p: 'Nous avons hâte de vous accueillir. Les informations pratiques vous seront envoyées la veille de votre arrivée.' },
    ],
  }),

  balanceFailed: (b, stay, extra) => ({
    subject: `Action requise : solde de votre séjour, dossier ${b.ref}`,
    title: 'Règlement du solde',
    preheader: 'Le prélèvement automatique du solde n’a pas pu aboutir.',
    blocks: [
      { p: `Bonjour ${esc(first(b.guest_name))},` },
      { p: `Le prélèvement automatique du solde de votre séjour n'a pas pu aboutir (votre banque demande parfois une validation). Vous pouvez le régler en quelques secondes avec le lien ci-dessous.` },
      { rows: [['Dossier', b.ref, true], ['Séjour', `${frDay(b.checkin, false)} au ${frDay(b.checkout)}`], ['Solde à régler', euros(b.balance_cents), true]] },
      { button: ['Régler le solde', extra.url] },
      { note: 'Ce lien est valable 23 heures. Passé ce délai, ou en cas de difficulté, répondez à cet e-mail et nous vous en enverrons un nouveau.' },
    ],
  }),

  cancelled: (b, stay, extra) => ({
    subject: `Annulation de votre réservation, dossier ${b.ref}`,
    title: 'Réservation annulée',
    preheader: `Votre séjour du ${frDay(b.checkin, false)} est annulé.`,
    blocks: [
      { p: `Bonjour ${esc(first(b.guest_name))},` },
      { p: `Nous vous confirmons l'annulation de votre réservation du ${frDay(b.checkin, false)} au ${frDay(b.checkout)}.` },
      {
        rows: [
          ['Dossier', b.ref, true],
          ['Remboursement', extra.refunded ? euros(extra.refunded) : 'aucun, conformément aux conditions de location', true],
        ],
      },
      ...(extra.refunded ? [{ p: 'Le remboursement est effectué sur la carte utilisée lors du paiement. Il apparaît généralement sous 5 à 10 jours selon votre banque.' }] : []),
      { p: 'Nous espérons avoir le plaisir de vous accueillir une autre fois à Châtel.' },
    ],
  }),

  dayBefore: (b, stay) => ({
    subject: `Votre arrivée demain à la Résidence Les Cerfs`,
    title: 'À demain à Châtel',
    preheader: `Arrivée demain dès ${b.checkInTime} : toutes les informations pratiques.`,
    blocks: [
      { p: `Bonjour ${esc(first(b.guest_name))},` },
      { p: `Votre séjour commence demain ! Voici tout ce qu'il faut savoir pour votre arrivée, à partir de ${b.checkInTime}.` },
      { h: 'Informations pratiques' },
      ...arrivalBlocks(stay),
      { rows: [['Dossier', b.ref, true], ['Arrivée', `${frDay(b.checkin, false)}, dès ${b.checkInTime}`], ['Départ', `${frDay(b.checkout, false)}, avant ${b.checkOutTime}`]] },
      { p: 'En hiver, pensez aux équipements neige pour votre véhicule : la route de Châtel peut être enneigée. Bonne route !' },
    ],
  }),

  welcome: (b, stay) => ({
    subject: 'Bienvenue à la Résidence Les Cerfs : règlement intérieur',
    title: 'Bienvenue',
    preheader: 'Le règlement intérieur de la résidence, pour un séjour serein.',
    blocks: [
      { p: `Bonjour ${esc(first(b.guest_name))},` },
      { p: `Bienvenue à la Résidence Les Cerfs ! Nous vous souhaitons un excellent séjour à Châtel. Pour que tout se passe au mieux, voici le règlement intérieur du logement.` },
      { h: 'Règlement intérieur' },
      { list: stay.houseRules },
      { p: 'Merci de votre attention et très bon séjour. Nous restons joignables à tout moment en répondant à cet e-mail.' },
    ],
  }),

  checkIn: (b) => ({
    subject: 'Tout se passe bien à la Résidence Les Cerfs ?',
    title: 'Tout se passe bien ?',
    preheader: 'Un besoin, une question ? Nous sommes là.',
    blocks: [
      { p: `Bonjour ${esc(first(b.guest_name))},` },
      { p: `Nous espérons que votre installation s'est bien passée et que vous profitez déjà de Châtel.` },
      { p: `S'il vous manque quoi que ce soit, ou si quelque chose ne fonctionne pas comme prévu, dites-le nous simplement en répondant à cet e-mail : nous ferons le nécessaire rapidement.` },
      { p: 'Belle journée à la montagne !' },
    ],
  }),

  midStay: (b) => ({
    subject: 'Comment se passe votre séjour à Châtel ?',
    title: 'Mi-séjour',
    preheader: 'Encore quelques jours à profiter de la montagne.',
    blocks: [
      { p: `Bonjour ${esc(first(b.guest_name))},` },
      { p: `Vous voilà au milieu de votre séjour : nous espérons que la Résidence Les Cerfs vous plaît et que la montagne est généreuse avec vous.` },
      { p: `Besoin d'une adresse, d'une idée de sortie ou d'un coup de main ? Répondez à cet e-mail, nous vous répondons rapidement.` },
    ],
  }),

  departure: (b, stay) => ({
    subject: 'Votre départ demain : quelques consignes',
    title: 'Départ demain',
    preheader: `Départ demain avant ${b.checkOutTime}.`,
    blocks: [
      { p: `Bonjour ${esc(first(b.guest_name))},` },
      { p: `Votre séjour touche déjà à sa fin. Le départ est prévu demain, <strong>${frDay(b.checkout, false)}, avant ${b.checkOutTime}</strong>. Pour nous aider à préparer l'arrivée des prochains voyageurs :` },
      { list: stay.departure },
      { p: 'Merci beaucoup, et excellente dernière soirée à Châtel.' },
    ],
  }),

  thanks: (b, stay) => ({
    subject: 'Merci pour votre séjour à la Résidence Les Cerfs',
    title: 'Merci',
    preheader: 'Votre avis nous aide beaucoup.',
    blocks: [
      { p: `Bonjour ${esc(first(b.guest_name))},` },
      { p: `Merci d'avoir choisi la Résidence Les Cerfs. Nous espérons que vous gardez un beau souvenir de votre séjour à Châtel.` },
      { p: `Votre avis compte énormément : qu'avez-vous préféré, et que pourrions-nous améliorer ? Répondez simplement à cet e-mail, nous lisons chaque message.` },
      ...(stay.reviewUrl ? [{ button: ['Laisser un avis', stay.reviewUrl] }] : []),
      { p: `Pour votre prochain séjour, réservez directement sur notre site : <a href="${SITE}" style="color:#8b6a4a">Résidence Les Cerfs</a>.` },
    ],
  }),
};

/** @returns {{ subject: string, text: string, html: string }} */
export function buildEmail(kind, booking, stay, extra = {}) {
  const t = TEMPLATES[kind](booking, stay, extra);
  return { subject: t.subject, ...render(t, stay) };
}

// ── schedule ───────────────────────────────────────────
// Day-based e-mails for a confirmed stay; at most one per booking and per day,
// in this order of priority (short stays: the departure e-mail wins over J+1…).
export const SCHEDULE = [
  { kind: 'dayBefore', due: (b, today) => diffDays(today, b.checkin) === 1 },
  { kind: 'welcome', due: (b, today) => today === b.checkin },
  { kind: 'departure', due: (b, today) => diffDays(today, b.checkout) === 1 && diffDays(b.checkin, b.checkout) >= 2 },
  { kind: 'thanks', due: (b, today) => diffDays(b.checkout, today) === 1 },
  { kind: 'checkIn', due: (b, today) => diffDays(b.checkin, today) === 1 && today < b.checkout },
  { kind: 'midStay', due: (b, today) => diffDays(b.checkin, today) === 5 && diffDays(b.checkin, b.checkout) >= 7 },
];

/** Which scheduled e-mail to send today, and which ones are skipped (same day). */
export function scheduledFor(b, today, alreadySent) {
  const due = SCHEDULE.filter((s) => !alreadySent.has(s.kind) && s.due(b, today)).map((s) => s.kind);
  return { send: due[0] ?? null, skip: due.slice(1) };
}
