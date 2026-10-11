import { useCallback, useEffect, useMemo, useState } from 'react';
import { LogoFull } from '../components/Logo.jsx';
import { BOOKING_API, SITE } from '../data/site.js';
import { euros, diffDays, todayIso } from '../../supabase/functions/_shared/quote.js';

const KEY = 'lescerfs-admin';
const store = {
  get: () => {
    try {
      return sessionStorage.getItem(KEY);
    } catch {
      return null;
    }
  },
  set: (v) => {
    try {
      v ? sessionStorage.setItem(KEY, v) : sessionStorage.removeItem(KEY);
    } catch {
      /* private mode */
    }
  },
};

const fr = (d, year = true) =>
  new Date(d + 'T00:00:00Z').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', ...(year ? { year: 'numeric' } : {}), timeZone: 'UTC' });
const frTime = (t) => (t ? new Date(t).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—');
const paidOf = (b) => (b.deposit_paid_at ? b.deposit_cents : 0) + (b.balance_status === 'paid' ? b.balance_cents : 0);

async function api(token, action, payload = {}) {
  const res = await fetch(`${BOOKING_API}/admin`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Erreur réseau'), { code: data.code });
  return data;
}

function Login({ onToken }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="ad-login"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr('');
        try {
          const { token } = await api(null, 'login', { password: pw });
          onToken(token);
        } catch (er) {
          setErr(er.message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <LogoFull className="ad-login__logo" />
      <h1>Espace propriétaire</h1>
      <label>
        <span>Mot de passe</span>
        <input type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} required autoFocus />
      </label>
      {err && <p className="ad-err">{err}</p>}
      <button className="btn" disabled={busy || !pw}>
        {busy ? 'Connexion…' : 'Se connecter'}
      </button>
    </form>
  );
}

function BalanceBadge({ b }) {
  if (b.balance_cents <= 0) return <span className="ad-badge ad-badge--ok">Payé en totalité</span>;
  if (b.balance_status === 'paid') return <span className="ad-badge ad-badge--ok">Solde payé</span>;
  if (b.balance_status === 'failed') return <span className="ad-badge ad-badge--bad">Solde refusé</span>;
  return <span className="ad-badge">Solde prélevé le {fr(b.balance_due, false)}</span>;
}

function BookingCard({ b, token, onChange, flash }) {
  const [cancel, setCancel] = useState(null); // preview data
  const [mode, setMode] = useState('policy');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState(null);
  const nights = diffDays(b.checkin, b.checkout);
  const guests = b.adults + b.children;
  const run = async (fn) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      flash(e.message, 'bad');
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className={`ad-card ad-card--${b.status}`}>
      <div className="ad-card__main">
        {b.ref && <p className="ad-card__ref">{b.ref}</p>}
        <p className="ad-card__dates">
          {fr(b.checkin)} → {fr(b.checkout)}
          <small>
            {nights} nuits · {guests} voyageur{guests > 1 ? 's' : ''} ({b.adults} ad. {b.children ? `+ ${b.children} enf.` : ''})
          </small>
        </p>
        <p className="ad-card__guest">
          <strong>{b.guest_name}</strong>
          <a href={`mailto:${b.guest_email}`}>{b.guest_email}</a>
          {b.guest_phone && <a href={`tel:${b.guest_phone.replace(/\s/g, '')}`}>{b.guest_phone}</a>}
        </p>
        {b.message && <p className="ad-card__msg">« {b.message} »</p>}
      </div>
      <div className="ad-card__money">
        <p>
          <span>Total</span> {euros(b.total_cents)}
        </p>
        <p>
          <span>Encaissé</span> {euros(paidOf(b) - b.refunded_cents)}
        </p>
        {b.refunded_cents > 0 && (
          <p>
            <span>Remboursé</span> {euros(b.refunded_cents)}
          </p>
        )}
        {b.status === 'confirmed' && <BalanceBadge b={b} />}
        {b.status === 'cancelled' && <span className="ad-badge ad-badge--bad">Annulée le {frTime(b.cancelled_at)}</span>}
        {b.status === 'pending' && <span className="ad-badge">Paiement en cours</span>}
        {b.balance_status === 'failed' && b.balance_error && <p className="ad-err">{b.balance_error}</p>}
      </div>

      {b.status === 'confirmed' && (
        <div className="ad-card__actions">
          {b.balance_cents > 0 && b.balance_status !== 'paid' && (
            <>
              <button className="link-btn" disabled={busy} onClick={() => run(async () => {
                const r = await api(token, 'balance-retry', { id: b.id });
                flash(r.ok ? 'Solde prélevé.' : `Prélèvement : ${r.status}`, r.ok ? 'ok' : 'bad');
                onChange();
              })}>
                Prélever le solde maintenant
              </button>
              <button className="link-btn" disabled={busy} onClick={() => run(async () => setLink((await api(token, 'balance-link', { id: b.id })).url))}>
                Lien de paiement du solde
              </button>
              <button className="link-btn" disabled={busy} onClick={() => run(async () => {
                if (!confirm('Le solde a été réglé autrement (virement, espèces) ?')) return;
                await api(token, 'balance-paid', { id: b.id });
                flash('Solde marqué comme payé.', 'ok');
                onChange();
              })}>
                Solde réglé hors site
              </button>
            </>
          )}
          <button className="link-btn ad-danger" disabled={busy} onClick={() => run(async () => setCancel(await api(token, 'cancel-preview', { id: b.id })))}>
            Annuler la réservation
          </button>
        </div>
      )}

      {link && (
        <div className="ad-box">
          <p>Lien valable 23 h, à envoyer au voyageur :</p>
          <input readOnly value={link} onFocus={(e) => e.target.select()} />
          <div className="ad-row">
            <button className="link-btn" onClick={() => navigator.clipboard?.writeText(link).then(() => flash('Lien copié.', 'ok'))}>
              Copier
            </button>
            <a className="link-btn" href={`mailto:${b.guest_email}?subject=${encodeURIComponent('Solde de votre séjour — ' + SITE.name)}&body=${encodeURIComponent(`Bonjour,\n\nLe prélèvement automatique du solde de votre séjour n'a pas pu aboutir. Vous pouvez le régler ici :\n${link}\n\nMerci et à bientôt,\n${SITE.name}`)}`}>
              Envoyer par e-mail
            </a>
          </div>
        </div>
      )}

      {cancel && (
        <div className="ad-box">
          <p>
            Déjà encaissé : <strong>{euros(cancel.paid)}</strong>. Selon les conditions ({cancel.policy.rule}) : remboursement de{' '}
            <strong>{euros(cancel.policy.refund)}</strong>.
          </p>
          <fieldset className="ad-choices">
            <label>
              <input type="radio" checked={mode === 'policy'} onChange={() => setMode('policy')} /> Selon les conditions ({euros(cancel.policy.refund)})
            </label>
            <label>
              <input type="radio" checked={mode === 'full'} onChange={() => setMode('full')} /> Tout rembourser ({euros(cancel.paid)}) — annulation de votre fait
            </label>
            <label>
              <input type="radio" checked={mode === 'none'} onChange={() => setMode('none')} /> Aucun remboursement
            </label>
            <label>
              <input type="radio" checked={mode === 'amount'} onChange={() => setMode('amount')} /> Autre montant :
              <input type="number" min="0" step="0.01" max={cancel.paid / 100} value={amount} onChange={(e) => { setMode('amount'); setAmount(e.target.value); }} /> €
            </label>
          </fieldset>
          <input placeholder="Motif (facultatif)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="ad-row">
            <button className="btn btn--small" disabled={busy} onClick={() => run(async () => {
              const r = await api(token, 'cancel', { id: b.id, refund: mode, amount, reason });
              flash(`Réservation annulée, ${euros(r.refunded)} remboursés. Les dates sont libérées.${r.mail === 'sent' ? ' Le voyageur a été prévenu par e-mail.' : ''}`, 'ok');
              setCancel(null);
              onChange();
            })}>
              Confirmer l’annulation
            </button>
            <button className="link-btn" onClick={() => setCancel(null)}>
              Garder la réservation
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function Blocks({ data, token, onChange, flash }) {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [note, setNote] = useState('');
  return (
    <section className="ad-section">
      <h2>Dates bloquées</h2>
      <p className="ad-help">Bloquez des dates pour vous ou pour travaux : elles deviennent indisponibles sur le site et sont transmises à Airbnb. Les réservations et blocages Airbnb apparaissent ici automatiquement.</p>
      <form
        className="ad-row ad-block-form"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await api(token, 'block', { start, end, note });
            setStart('');
            setEnd('');
            setNote('');
            flash('Dates bloquées.', 'ok');
            onChange();
          } catch (er) {
            flash(er.message, 'bad');
          }
        }}
      >
        <label>
          <span>Du (première nuit)</span>
          <input type="date" value={start} min={todayIso()} onChange={(e) => setStart(e.target.value)} required />
        </label>
        <label>
          <span>Au (jour de départ)</span>
          <input type="date" value={end} min={start || todayIso()} onChange={(e) => setEnd(e.target.value)} required />
        </label>
        <label className="ad-grow">
          <span>Note</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Famille, travaux…" />
        </label>
        <button className="btn btn--small">Bloquer</button>
      </form>
      <ul className="ad-blocks">
        {data.blocks.map((x) => (
          <li key={x.id}>
            <span>
              {fr(x.start_date)} → {fr(x.end_date)}
            </span>
            <span className="ad-src">{x.source === 'airbnb' ? `Airbnb · ${x.summary === 'Reserved' ? 'réservé' : 'bloqué'}` : `Vous${x.note ? ` · ${x.note}` : ''}`}</span>
            {x.source === 'manual' && (
              <button className="link-btn ad-danger" onClick={async () => {
                await api(token, 'unblock', { id: x.id });
                flash('Dates débloquées.', 'ok');
                onChange();
              }}>
                Débloquer
              </button>
            )}
          </li>
        ))}
        {!data.blocks.length && <li className="ad-empty">Aucune date bloquée.</li>}
      </ul>
    </section>
  );
}

export default function AdminApp() {
  const [token, setToken] = useState(store.get);
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('upcoming');
  const [msg, setMsg] = useState(null);

  const flash = useCallback((text, type = 'ok') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 6000);
  }, []);
  const logout = () => {
    store.set(null);
    setToken(null);
    setData(null);
  };
  const load = useCallback(async () => {
    try {
      setData(await api(token, 'list'));
    } catch (e) {
      if (e.code === 'auth') logout();
      else flash(e.message, 'bad');
    }
  }, [token]);
  useEffect(() => {
    if (token) load();
  }, [token, load]);

  const today = todayIso();
  const groups = useMemo(() => {
    const b = data?.bookings ?? [];
    return {
      upcoming: b.filter((x) => x.status === 'confirmed' && x.checkout >= today),
      pending: b.filter((x) => x.status === 'pending'),
      past: b.filter((x) => x.status === 'confirmed' && x.checkout < today).reverse(),
      cancelled: b.filter((x) => x.status === 'cancelled').reverse(),
    };
  }, [data, today]);

  if (!BOOKING_API) return <p className="ad-login">La réservation directe n’est pas activée sur ce site.</p>;
  if (!token)
    return (
      <Login
        onToken={(t) => {
          store.set(t);
          setToken(t);
        }}
      />
    );

  const confirmed = (data?.bookings ?? []).filter((x) => x.status === 'confirmed' || x.status === 'cancelled');
  const collected = confirmed.reduce((s, x) => s + paidOf(x) - x.refunded_cents, 0);
  const toCome = groups.upcoming.reduce((s, x) => s + (x.balance_status === 'scheduled' || x.balance_status === 'failed' ? x.balance_cents : 0), 0);
  const failed = groups.upcoming.filter((x) => x.balance_status === 'failed');
  const next = groups.upcoming[0];
  const airbnb = data?.sync?.find((s) => s.source === 'airbnb');
  const tabs = [
    ['upcoming', 'À venir', groups.upcoming],
    ['pending', 'Paiements en cours', groups.pending],
    ['past', 'Passées', groups.past],
    ['cancelled', 'Annulées', groups.cancelled],
  ];

  return (
    <div className="ad">
      <header className="ad-head">
        <a href={import.meta.env.BASE_URL} className="ad-head__logo">
          <LogoFull />
        </a>
        <h1>Espace propriétaire</h1>
        <div className="ad-row">
          <button className="link-btn" onClick={load}>
            Actualiser
          </button>
          <button className="link-btn" onClick={logout}>
            Déconnexion
          </button>
        </div>
      </header>

      {msg && (
        <p className={`ad-flash ad-flash--${msg.type}`} role="status">
          {msg.text}
        </p>
      )}

      {!data ? (
        <p className="ad-help ad-pad">Chargement…</p>
      ) : (
        <main className="ad-main">
          <section className="ad-stats">
            <div>
              <span>Prochaine arrivée</span>
              <strong>{next ? fr(next.checkin, false) : '—'}</strong>
              <small>{next ? next.guest_name : 'Aucune réservation à venir'}</small>
            </div>
            <div>
              <span>Séjours à venir</span>
              <strong>{groups.upcoming.length}</strong>
            </div>
            <div>
              <span>Encaissé (site)</span>
              <strong>{euros(collected)}</strong>
            </div>
            <div>
              <span>Soldes à venir</span>
              <strong>{euros(toCome)}</strong>
            </div>
          </section>

          {failed.length > 0 && (
            <p className="ad-alert">
              {failed.length} solde{failed.length > 1 ? 's' : ''} refusé{failed.length > 1 ? 's' : ''} par la banque : relancez le prélèvement ou envoyez un lien de paiement au voyageur.
            </p>
          )}
          {airbnb?.last_error && <p className="ad-alert">Synchronisation Airbnb en erreur : {airbnb.last_error}</p>}

          <nav className="ad-tabs" aria-label="Réservations">
            {tabs.map(([id, label, list]) => (
              <button key={id} className={tab === id ? 'is-active' : ''} onClick={() => setTab(id)} aria-pressed={tab === id}>
                {label} <span>{list.length}</span>
              </button>
            ))}
          </nav>
          <section className="ad-list">
            {tabs.find(([id]) => id === tab)[2].map((b) => (
              <BookingCard key={b.id} b={b} token={token} onChange={load} flash={flash} />
            ))}
            {!tabs.find(([id]) => id === tab)[2].length && <p className="ad-empty">Rien pour le moment.</p>}
          </section>

          <Blocks data={data} token={token} onChange={load} flash={flash} />

          <section className="ad-section">
            <h2>Synchronisation</h2>
            <p className="ad-help">
              Airbnb → site : dernière lecture {frTime(airbnb?.last_sync)} ({airbnb?.event_count ?? 0} période(s)). Le site relit Airbnb au plus toutes les 10 minutes et avant chaque paiement.
            </p>
            <p className="ad-help">Site → Airbnb : lien à importer dans le calendrier Airbnb (Disponibilités → Synchroniser les calendriers → Importer) :</p>
            <input readOnly value={data.icalExport} onFocus={(e) => e.target.select()} className="ad-mono" />
          </section>
        </main>
      )}
    </div>
  );
}
