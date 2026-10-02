import { SITE } from '../data/site.js';

// Bois de cerf minimalistes : une ramure dessinée une fois, puis symétrisée.
const ANTLER =
  'M57 58C49 52 38 46 30 34C24 25 22 16 23 4' + // merrain
  'M44 49C42 41 43 33 47 25' + // andouiller médian
  'M33 38C29 31 29 23 32 15' + // andouiller haut
  'M27 26C21 23 17 18 15 11'; // empaumure

export function Antlers({ className = '', title }) {
  return (
    <svg className={className} viewBox="0 0 120 64" fill="none" stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round" role={title ? 'img' : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <path d={ANTLER} />
      <path d={ANTLER} transform="translate(120 0) scale(-1 1)" />
    </svg>
  );
}

export default function Logo({ compact = false }) {
  return (
    <a href="#top" className={`logo${compact ? ' logo--compact' : ''}`} aria-label={`${SITE.name}, ${SITE.place} — accueil`}>
      <Antlers className="logo__mark" />
      <span className="logo__name">
        <span>{SITE.nameLines[0]}</span>
        <span>{SITE.nameLines[1]}</span>
      </span>
      <span className="logo__place">{SITE.place}</span>
    </a>
  );
}
