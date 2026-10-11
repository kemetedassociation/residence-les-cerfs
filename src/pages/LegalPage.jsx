import { LogoFull } from '../components/Logo.jsx';
import { LEGAL_PAGES, OPERATOR } from '../data/legal.js';
import { SITE } from '../data/site.js';

const BASE = import.meta.env.BASE_URL;

export default function LegalPage({ page }) {
  const p = LEGAL_PAGES[page];
  return (
    <div className="legal">
      <header className="legal__head">
        <a href={BASE} className="legal__logo" aria-label={`${SITE.name} — accueil`}>
          <LogoFull />
        </a>
        <a href={BASE} className="link-btn">
          ← Retour au site
        </a>
      </header>
      <main className="legal__main">
        <p className="kicker">{SITE.name}</p>
        <h1 className="section-title">{p.title}</h1>
        {p.intro && <p className="legal__intro">{p.intro}</p>}
        {p.sections.map((s) => (
          <section key={s.h} className="legal__section">
            <h2>{s.h}</h2>
            {s.p.map((t) => (
              <p key={t}>{t}</p>
            ))}
          </section>
        ))}
        <p className="legal__updated">Dernière mise à jour : octobre 2026</p>
      </main>
      <footer className="legal__foot">
        <nav aria-label="Informations légales">
          {Object.values(LEGAL_PAGES).map((l) => (
            <a key={l.slug} href={`${BASE}${l.slug}/`} aria-current={l === p ? 'page' : undefined}>
              {l.title}
            </a>
          ))}
        </nav>
        <p>
          © {new Date().getFullYear()} {OPERATOR.name} · {SITE.name}
        </p>
      </footer>
    </div>
  );
}
