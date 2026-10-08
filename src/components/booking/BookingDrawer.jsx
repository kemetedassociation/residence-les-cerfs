import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import pricing from '../../../supabase/functions/_shared/pricing.json';
import { quote, euros, todayIso, addDays, diffDays, overlaps, seasonFor } from '../../../supabase/functions/_shared/quote.js';
import Calendar, { nightTaken, checkoutLimit } from './Calendar.jsx';
import Icon from '../Icon.jsx';
import { BOOKING_URL, SITE, directBooking } from '../../data/site.js';
import { BOOKING_TERMS } from '../../data/content.js';
import { createBooking, fetchAvailability, fetchBookingStatus } from '../../lib/booking-api.js';
import { lockScroll, reducedMotion } from '../../lib/scroll.js';

const frDate = (d, opts = { day: 'numeric', month: 'long' }) =>
  new Date(d + 'T00:00:00Z').toLocaleDateString('fr-FR', { ...opts, timeZone: 'UTC' });

function Stepper({ label, value, min, max, onChange, hint }) {
  return (
    <div className="stepper">
      <div>
        <p className="stepper__label">{label}</p>
        {hint && <p className="stepper__hint">{hint}</p>}
      </div>
      <div className="stepper__ctrl">
        <button type="button" onClick={() => onChange(value - 1)} disabled={value <= min} aria-label={`Moins — ${label}`}>
          −
        </button>
        <span aria-live="polite">{value}</span>
        <button type="button" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={`Plus — ${label}`}>
          +
        </button>
      </div>
    </div>
  );
}

function Breakdown({ q }) {
  return (
    <dl className="bk-lines">
      {q.lines.map((l) => (
        <div key={l.label} className="bk-line">
          <dt>
            {l.label}
            {l.detail && <small>{l.detail}</small>}
          </dt>
          <dd>{euros(l.amount)}</dd>
        </div>
      ))}
      <div className="bk-line bk-line--total">
        <dt>Total</dt>
        <dd>{euros(q.total)}</dd>
      </div>
      {q.balance > 0 ? (
        <>
          <div className="bk-line bk-line--now">
            <dt>Acompte aujourd’hui ({pricing.deposit.percent} %)</dt>
            <dd>{euros(q.deposit)}</dd>
          </div>
          <div className="bk-line">
            <dt>
              Solde<small>prélevé automatiquement le {frDate(q.balanceDue, { day: 'numeric', month: 'long', year: 'numeric' })}</small>
            </dt>
            <dd>{euros(q.balance)}</dd>
          </div>
        </>
      ) : (
        <div className="bk-line bk-line--now">
          <dt>
            À régler aujourd’hui<small>arrivée dans moins de {pricing.deposit.balanceDaysBefore} jours</small>
          </dt>
          <dd>{euros(q.total)}</dd>
        </div>
      )}
    </dl>
  );
}

export default function BookingDrawer() {
  const mode = directBooking();
  const today = todayIso();
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState('dates'); // dates | details | demo | returned
  const [ranges, setRanges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [checkin, setCheckin] = useState(null);
  const [checkout, setCheckout] = useState(null);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [accept, setAccept] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [status, setStatus] = useState(null);
  const minMonth = addDays(today, pricing.minLeadDays).slice(0, 7);
  const maxMonth = addDays(today, pricing.bookingWindowDays).slice(0, 7);
  const [month, setMonth] = useState(minMonth);

  const q = useMemo(
    () => (checkin && checkout ? quote(pricing, { checkin, checkout, adults, children }, today) : null),
    [checkin, checkout, adults, children, today],
  );

  const loadAvailability = useCallback(async () => {
    setLoading(true);
    try {
      const { ranges } = await fetchAvailability(mode);
      setRanges(ranges);
      return ranges;
    } catch (e) {
      setNotice({ type: 'error', text: e.message });
      return null;
    } finally {
      setLoading(false);
    }
  }, [mode]);

  // open / close
  useEffect(() => {
    const onOpen = () => {
      setOpen(true);
      if (step !== 'returned') setStep('dates');
      loadAvailability();
    };
    window.addEventListener('booking:open', onOpen);
    return () => window.removeEventListener('booking:open', onOpen);
  }, [loadAvailability, step]);

  // back from Stripe
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const r = p.get('reservation');
    if (!r || !mode) return;
    const clean = () => history.replaceState(null, '', location.pathname + (mode === 'demo' ? '?demo=reservation' : '') + location.hash);
    if (r === 'annulee') {
      setNotice({ type: 'info', text: 'Paiement annulé : aucune somme n’a été prélevée et vos dates ne sont pas réservées.' });
      setOpen(true);
      loadAvailability();
      clean();
    } else if (r === 'confirmee' && p.get('session_id')) {
      const sid = p.get('session_id');
      setStep('returned');
      setOpen(true);
      clean();
      // the Stripe webhook may land a few seconds after the redirect
      let tries = 0;
      const poll = async () => {
        try {
          const s = await fetchBookingStatus(sid);
          setStatus(s);
          if (s.status === 'pending' && tries++ < 8) setTimeout(poll, 2000);
        } catch {
          if (tries++ < 8) setTimeout(poll, 2000);
          else setStatus({ status: 'unknown' });
        }
      };
      poll();
    }
  }, [mode, loadAvailability]);

  const wasOpen = useRef(false);
  useEffect(() => {
    // only release the scroll lock this panel took itself
    if (open) lockScroll(true);
    else if (wasOpen.current) lockScroll(false);
    wasOpen.current = open;
    if (!open) return;
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !ref.current || reducedMotion()) return;
    const mobile = window.innerWidth < 720;
    gsap.fromTo(
      ref.current.querySelector('.bk__panel'),
      mobile ? { yPercent: 100 } : { xPercent: 100 },
      { yPercent: 0, xPercent: 0, duration: 0.8, ease: 'expo.out' },
    );
    gsap.fromTo(ref.current.querySelector('.bk__veil'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 });
    ref.current.querySelector('.bk__close')?.focus({ preventScroll: true });
  }, [open]);

  const pick = (date) => {
    setNotice(null);
    if (checkin && !checkout && date > checkin && date <= checkoutLimit(ranges, checkin, addDays(today, pricing.bookingWindowDays))) {
      setCheckout(date);
      return;
    }
    if (nightTaken(ranges, date)) return;
    setCheckin(date);
    setCheckout(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!q?.ok || !accept) return;
    setBusy(true);
    setNotice(null);
    try {
      const res = await createBooking(mode, { checkin, checkout, adults, children, ...form, acceptTerms: accept });
      if (res.demo) setStep('demo');
      else window.location.href = res.url;
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
      if (err.code === 'unavailable') {
        const fresh = await loadAvailability();
        if (fresh?.some((r) => overlaps(checkin, checkout, r.start, r.end))) {
          setCheckin(null);
          setCheckout(null);
        }
        setStep('dates');
      }
      setBusy(false);
    }
  };

  if (!mode || !open) return null;
  const guests = adults + children;
  const field = (k) => ({ value: form[k], onChange: (e) => setForm((f) => ({ ...f, [k]: e.target.value })) });

  return (
    <div className="bk" ref={ref} role="dialog" aria-modal="true" aria-labelledby="bk-title">
      <div className="bk__veil" onClick={() => setOpen(false)} />
      <div className="bk__panel" data-lenis-prevent>
        <header className="bk__head">
          <div>
            <p className="kicker">{SITE.name}</p>
            <h2 id="bk-title" className="bk__title">
              Réserver votre séjour
            </h2>
          </div>
          <button type="button" className="bk__close round-btn" onClick={() => setOpen(false)} aria-label="Fermer la réservation">
            <Icon name="close" size={16} />
          </button>
        </header>

        {mode === 'demo' && <p className="bk__demo">Aperçu — mode démonstration, aucun paiement n’est effectué.</p>}

        {(step === 'dates' || step === 'details') && (
          <ol className="bk__steps" aria-label="Étapes">
            <li className={step === 'dates' ? 'is-active' : 'is-done'}>
              <button type="button" onClick={() => setStep('dates')}>
                01 Dates & voyageurs
              </button>
            </li>
            <li className={step === 'details' ? 'is-active' : ''}>02 Coordonnées & paiement</li>
          </ol>
        )}

        {notice && <p className={`bk__notice bk__notice--${notice.type}`} role="alert">{notice.text}</p>}

        {step === 'dates' && (
          <div className="bk__body">
            <div className="bk__picked">
              <div className={!checkin || (checkin && checkout) ? 'is-focus' : ''}>
                <span>Arrivée</span>
                <strong>{checkin ? frDate(checkin, { weekday: 'short', day: 'numeric', month: 'short' }) : '—'}</strong>
              </div>
              <div className={checkin && !checkout ? 'is-focus' : ''}>
                <span>Départ</span>
                <strong>{checkout ? frDate(checkout, { weekday: 'short', day: 'numeric', month: 'short' }) : '—'}</strong>
              </div>
            </div>
            <p className="bk__hint">
              {loading
                ? 'Chargement des disponibilités…'
                : !checkin
                  ? 'Choisissez votre date d’arrivée. Prix par nuit indiqué sous chaque date.'
                  : !checkout
                    ? `Choisissez votre date de départ (${seasonFor(pricing, checkin).minNights} nuits minimum à cette période).`
                    : `${diffDays(checkin, checkout)} nuits · arrivée dès ${pricing.checkInTime}, départ avant ${pricing.checkOutTime}`}
            </p>
            <Calendar
              month={month}
              onMonth={setMonth}
              ranges={ranges}
              checkin={checkin}
              checkout={checkout}
              onPick={pick}
              pricing={pricing}
              today={today}
              minMonth={minMonth}
              maxMonth={maxMonth}
            />
            <p className="bk__legend">
              <span className="bk__legend-taken" /> Indisponible
            </p>

            <div className="bk__guests">
              <Stepper label="Adultes" value={adults} min={1} max={pricing.maxGuests - children} onChange={setAdults} />
              <Stepper label="Enfants" hint="moins de 18 ans" value={children} min={0} max={pricing.maxGuests - adults} onChange={setChildren} />
              <p className="bk__cap">
                {guests} / {pricing.maxGuests} voyageurs · 3 chambres et une mezzanine
              </p>
            </div>

            {q && !q.ok && <p className="bk__notice bk__notice--error">{q.error}</p>}
            {q?.ok && <Breakdown q={q} />}
          </div>
        )}

        {step === 'details' && q?.ok && (
          <form className="bk__body" onSubmit={submit}>
            <div className="bk__recap">
              <p>
                <strong>
                  {frDate(checkin)} → {frDate(checkout, { day: 'numeric', month: 'long', year: 'numeric' })}
                </strong>
                <br />
                {q.nights} nuits · {guests} voyageur{guests > 1 ? 's' : ''}
              </p>
              <button type="button" className="link-btn" onClick={() => setStep('dates')}>
                Modifier
              </button>
            </div>
            <div className="bk__fields">
              <label>
                <span>Nom complet</span>
                <input required autoComplete="name" minLength={2} {...field('name')} />
              </label>
              <label>
                <span>E-mail</span>
                <input required type="email" autoComplete="email" inputMode="email" {...field('email')} />
              </label>
              <label>
                <span>Téléphone</span>
                <input type="tel" autoComplete="tel" inputMode="tel" {...field('phone')} />
              </label>
              <label className="bk__full">
                <span>Message (facultatif)</span>
                <textarea rows={3} placeholder="Heure d’arrivée prévue, questions…" {...field('message')} />
              </label>
            </div>
            <Breakdown q={q} />
            <label className="bk__accept">
              <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} required />
              <span>
                J’accepte les{' '}
                <button type="button" className="bk__terms-link" onClick={() => setShowTerms((s) => !s)} aria-expanded={showTerms}>
                  conditions de réservation et d’annulation
                </button>
              </span>
            </label>
            {showTerms && (
              <div className="bk__terms">
                {BOOKING_TERMS.map((t) => (
                  <p key={t}>{t}</p>
                ))}
              </div>
            )}
            <p className="bk__secure">
              Paiement sécurisé par Stripe. Vous serez redirigé vers la page de paiement, puis de retour ici.
            </p>
          </form>
        )}

        {step === 'demo' && (
          <div className="bk__body bk__result">
            <p className="kicker">Mode démonstration</p>
            <h3>Ici, le voyageur serait redirigé vers Stripe</h3>
            <p>
              Il paierait {q?.balance ? `l’acompte de ${euros(q.deposit)}` : euros(q?.total ?? 0)}, puis reviendrait sur cette page avec la
              confirmation. Les dates seraient aussitôt bloquées sur le site et transmises à Airbnb.
            </p>
            <button type="button" className="btn" onClick={() => setStep('dates')}>
              Revenir au calendrier
            </button>
          </div>
        )}

        {step === 'returned' && (
          <div className="bk__body bk__result">
            {!status || status.status === 'pending' ? (
              <>
                <p className="kicker">Paiement reçu</p>
                <h3>Confirmation en cours…</h3>
                <p>Nous finalisons votre réservation, cela ne prend que quelques secondes.</p>
              </>
            ) : status.status === 'confirmed' ? (
              <>
                <p className="kicker">Réservation confirmée</p>
                <h3>Merci {status.guest_name}, à très bientôt à Châtel.</h3>
                <p>
                  Du <strong>{frDate(status.checkin)}</strong> au <strong>{frDate(status.checkout, { day: 'numeric', month: 'long', year: 'numeric' })}</strong>,{' '}
                  {status.adults + status.children} voyageur{status.adults + status.children > 1 ? 's' : ''}.
                </p>
                <p>
                  Réglé aujourd’hui : {euros(status.deposit_cents)}.
                  {status.balance_cents > 0 &&
                    ` Solde de ${euros(status.balance_cents)} prélevé automatiquement le ${frDate(status.balance_due, { day: 'numeric', month: 'long', year: 'numeric' })}.`}
                </p>
                <p>Un reçu Stripe vous a été envoyé par e-mail. Pour toute question : {SITE.contact.email}</p>
              </>
            ) : (
              <>
                <p className="kicker">Réservation</p>
                <h3>Nous n’avons pas pu confirmer automatiquement</h3>
                <p>
                  Si un paiement a été effectué, il est bien enregistré chez Stripe : écrivez-nous à {SITE.contact.email} et nous vous
                  répondons rapidement.
                </p>
              </>
            )}
            <button type="button" className="btn btn--ghost" onClick={() => setOpen(false)}>
              Revenir au site
            </button>
          </div>
        )}

        {(step === 'dates' || step === 'details') && (
          <footer className="bk__foot">
            <div className="bk__sum">
              {q?.ok ? (
                <>
                  <strong>{euros(q.total)}</strong>
                  <span>
                    {q.nights} nuits · {q.balance ? `acompte ${euros(q.deposit)}` : 'paiement unique'}
                  </span>
                </>
              ) : (
                <span>{BOOKING_URL ? 'Également disponible sur Airbnb' : ''}</span>
              )}
            </div>
            {step === 'dates' ? (
              <button type="button" className="btn" disabled={!q?.ok} onClick={() => setStep('details')}>
                Continuer <Icon name="chevron" size={16} />
              </button>
            ) : (
              <button
                type="button"
                className="btn"
                disabled={busy || !accept || !form.name || !form.email}
                onClick={(e) => e.currentTarget.closest('.bk__panel').querySelector('form')?.requestSubmit()}
              >
                {busy ? 'Redirection…' : `Payer ${euros(q.payNow)}`} <Icon name="chevron" size={16} />
              </button>
            )}
          </footer>
        )}
        {BOOKING_URL && step === 'dates' && (
          <a className="bk__airbnb" href={BOOKING_URL} target="_blank" rel="noopener">
            Préférer Airbnb ? Voir l’annonce
          </a>
        )}
      </div>
    </div>
  );
}
