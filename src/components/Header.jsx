import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import Logo from './Logo.jsx';
import { NAV, SITE } from '../data/site.js';
import BookingButton from './BookingButton.jsx';
import { lockScroll, onScroll, reducedMotion } from '../lib/scroll.js';

const MOBILE_LINKS = [
  { label: 'Accueil', href: '#top' },
  ...NAV.filter((n) => n.href !== '#reserver'),
  { label: 'Réserver', href: '#reserver' },
  { label: 'Contact', href: '#contact' },
];

export default function Header() {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(
    () =>
      onScroll(() => {
        const tour = document.getElementById('top');
        setSolid(window.scrollY > (tour?.offsetHeight ?? window.innerHeight) - 80);
      }),
    [],
  );

  useLayoutEffect(() => {
    const el = menuRef.current;
    lockScroll(open);
    const d = reducedMotion() ? 0 : 1;
    if (open) {
      gsap.set(el, { display: 'flex' });
      gsap.fromTo(el, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.9 * d, ease: 'expo.inOut' });
      gsap.fromTo(el.querySelectorAll('li'), { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8 * d, stagger: 0.06, delay: 0.35 * d, ease: 'power3.out' });
    } else if (el.style.display === 'flex') {
      gsap.to(el, { clipPath: 'inset(0 0 100% 0)', duration: 0.7 * d, ease: 'expo.inOut', onComplete: () => gsap.set(el, { display: 'none' }) });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [open]);

  return (
    <header className={`header${solid ? ' is-solid' : ''}${open ? ' is-open' : ''}`}>
      <Logo />
      <nav className="header__nav" aria-label="Navigation principale">
        {NAV.map((n) => (
          <a key={n.href} href={n.href} data-cursor="explore">
            {n.label}
          </a>
        ))}
      </nav>
      <div className="header__tools">
        <span className="header__lang" aria-label="Langue : français">
          {SITE.languages[0]}
        </span>
        <button
          type="button"
          className="burger"
          aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((o) => !o)}
          data-cursor="explore"
        >
          <span />
          <span />
        </button>
      </div>

      <div id="mobile-menu" className="menu" ref={menuRef} style={{ display: 'none' }}>
        <ul>
          {MOBILE_LINKS.map((l, i) => (
            <li key={l.href}>
              <a href={l.href} onClick={() => setOpen(false)}>
                <span className="menu__num">{String(i + 1).padStart(2, '0')}</span>
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="menu__foot">
          <span>
            {SITE.place} · {SITE.region}
          </span>
          <BookingButton className="btn--small" onClick={() => setOpen(false)} />
        </div>
      </div>
    </header>
  );
}
