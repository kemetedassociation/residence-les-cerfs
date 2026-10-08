// Mise en service de la réservation directe (Supabase + Stripe + synchro Airbnb).
// Usage : remplir .env (voir RESERVATION.md) puis `npm run setup:booking`.
// Rejouable sans risque : chaque étape vérifie ce qui existe déjà.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const ENV_FILE = path.join(ROOT, '.env');
const FUNCTIONS = ['availability', 'book', 'stripe-webhook', 'charge-balances', 'ical', 'booking-status'];

// ── .env ─────────────────────────────────────────────
const env = Object.fromEntries(
  (fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, 'utf8') : '')
    .split('\n')
    .filter((l) => /^\s*[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);
const saveEnv = (key, value) => {
  env[key] = value;
  const lines = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, 'utf8').split('\n') : [];
  const i = lines.findIndex((l) => l.startsWith(key + '='));
  if (i >= 0) lines[i] = `${key}=${value}`;
  else lines.push(`${key}=${value}`);
  fs.writeFileSync(ENV_FILE, lines.join('\n').replace(/\n*$/, '\n'), { mode: 0o600 });
};
const need = (k) => {
  if (!env[k]) {
    console.error(`✗ ${k} manquant dans .env — voir RESERVATION.md`);
    process.exit(1);
  }
  return env[k];
};

const TOKEN = need('SUPABASE_ACCESS_TOKEN');
const REF = need('SUPABASE_PROJECT_REF');
const STRIPE_KEY = need('STRIPE_SECRET_KEY');
const SITE_URL = env.SITE_URL || 'https://kemetedassociation.github.io/residence-les-cerfs/';
const FN_BASE = `https://${REF}.supabase.co/functions/v1`;
if (!/^(sk|rk)_(test|live)_/.test(STRIPE_KEY)) {
  console.error('✗ STRIPE_SECRET_KEY doit commencer par sk_test_, sk_live_, rk_test_ ou rk_live_');
  process.exit(1);
}
const live = STRIPE_KEY.includes('_live_');
console.log(`Projet Supabase ${REF} · Stripe en mode ${live ? 'RÉEL' : 'test'}\n`);

const supa = async (p, opts = {}) => {
  const res = await fetch(`https://api.supabase.com${p}`, {
    ...opts,
    headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json', ...opts.headers },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${p} → ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
};
const sql = (query) => supa(`/v1/projects/${REF}/database/query`, { method: 'POST', body: JSON.stringify({ query }) });

const stripe = async (p, params) => {
  const res = await fetch(`https://api.stripe.com/v1${p}`, {
    method: params ? 'POST' : 'GET',
    headers: { authorization: `Bearer ${STRIPE_KEY}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: params ? new URLSearchParams(params) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Stripe ${p} → ${data.error?.message}`);
  return data;
};

// 1. database
console.log('1/6 Base de données…');
await sql(fs.readFileSync(path.join(ROOT, 'supabase/migrations/001_booking.sql'), 'utf8'));

// 2. generated secrets
for (const k of ['ICAL_EXPORT_TOKEN', 'CRON_SECRET']) if (!env[k]) saveEnv(k, crypto.randomBytes(24).toString('hex'));

// 3. Stripe webhook (one per mode)
console.log('2/6 Webhook Stripe…');
const hookKey = live ? 'STRIPE_WEBHOOK_SECRET_LIVE' : 'STRIPE_WEBHOOK_SECRET_TEST';
if (!env[hookKey]) {
  const url = `${FN_BASE}/stripe-webhook`;
  const existing = (await stripe('/webhook_endpoints?limit=100')).data.find((h) => h.url === url);
  if (existing) {
    console.error(`✗ Un webhook existe déjà pour ${url} mais son secret n'est pas dans .env (${hookKey}). Supprimez-le dans Stripe ou ajoutez le secret.`);
    process.exit(1);
  }
  const hook = await stripe('/webhook_endpoints', {
    url,
    'enabled_events[0]': 'checkout.session.completed',
    'enabled_events[1]': 'checkout.session.expired',
    description: 'Résidence Les Cerfs — réservations du site',
  });
  saveEnv(hookKey, hook.secret);
}

// 4. function secrets
console.log('3/6 Secrets des fonctions…');
const secrets = {
  STRIPE_SECRET_KEY: STRIPE_KEY,
  STRIPE_WEBHOOK_SECRET: env[hookKey],
  SITE_URL,
  ICAL_EXPORT_TOKEN: env.ICAL_EXPORT_TOKEN,
  CRON_SECRET: env.CRON_SECRET,
  ...(env.AIRBNB_ICAL_URL ? { AIRBNB_ICAL_URL: env.AIRBNB_ICAL_URL } : {}),
};
await supa(`/v1/projects/${REF}/secrets`, {
  method: 'POST',
  body: JSON.stringify(Object.entries(secrets).map(([name, value]) => ({ name, value }))),
});
if (!env.AIRBNB_ICAL_URL) console.warn('  ⚠ AIRBNB_ICAL_URL absent : les dates Airbnb ne seront pas bloquées sur le site.');

// 5. deploy
console.log('4/6 Déploiement des fonctions…');
for (const fn of FUNCTIONS) {
  execFileSync('npx', ['--yes', 'supabase@latest', 'functions', 'deploy', fn, '--project-ref', REF, '--use-api', '--no-verify-jwt'], {
    cwd: ROOT,
    stdio: ['ignore', 'ignore', 'inherit'],
    env: { ...process.env, SUPABASE_ACCESS_TOKEN: TOKEN },
  });
  console.log(`  ✓ ${fn}`);
}

// 6. daily balance charge (08:00 Paris ≈ 06:00 UTC)
console.log('5/6 Prélèvement automatique des soldes…');
await sql(`
  create extension if not exists pg_cron;
  create extension if not exists pg_net;
  select cron.unschedule(jobid) from cron.job where jobname = 'charge-balances';
  select cron.schedule('charge-balances', '0 6 * * *', $$
    select net.http_post(
      url := '${FN_BASE}/charge-balances',
      headers := jsonb_build_object('x-cron-secret', '${env.CRON_SECRET}', 'content-type', 'application/json'),
      body := '{}'::jsonb
    );
  $$);
`);

// 7. wire the website
console.log('6/6 Site…');
const siteFile = path.join(ROOT, 'src/data/site.js');
fs.writeFileSync(siteFile, fs.readFileSync(siteFile, 'utf8').replace(/export const BOOKING_API = '.*?';/, `export const BOOKING_API = '${FN_BASE}';`));

const check = await fetch(`${FN_BASE}/availability`).then((r) => r.json()).catch((e) => ({ error: e.message }));
console.log(check.ranges ? `  ✓ Disponibilités en ligne (${check.ranges.length} période(s) bloquée(s), synchro Airbnb : ${check.sync})` : `  ✗ ${JSON.stringify(check)}`);

console.log(`
Terminé.
• À coller dans Airbnb (Calendrier → Disponibilités → Synchroniser les calendriers → Importer) :
  ${FN_BASE}/ical?token=${env.ICAL_EXPORT_TOKEN}
• Puis publier le site : npm run deploy
`);
