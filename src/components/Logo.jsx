import { SITE } from '../data/site.js';

const BASE = import.meta.env.BASE_URL;

// Emblème seul : bois de cerf, montagnes et chalet (public/logo-mark.*)
export function LogoMark({ className = '' }) {
  return (
    <picture className={className}>
      <source srcSet={`${BASE}logo-mark.webp`} type="image/webp" />
      <img src={`${BASE}logo-mark.png`} alt="" width="320" height="214" decoding="async" />
    </picture>
  );
}

// Logo complet : emblème + « Résidence Les Cerfs » (public/logo-full.*)
export function LogoFull({ className = '' }) {
  return (
    <picture className={className}>
      <source srcSet={`${BASE}logo-full.webp`} type="image/webp" />
      <img src={`${BASE}logo-full.png`} alt={SITE.name} width="480" height="442" decoding="async" />
    </picture>
  );
}

export default function Logo() {
  return (
    <a href="#top" className="logo" aria-label={`${SITE.name}, ${SITE.place} — accueil`}>
      <LogoFull className="logo__full" />
      <LogoMark className="logo__mark" />
    </a>
  );
}
