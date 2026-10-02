import { LogoFull } from '../components/Logo.jsx';
import { SITE } from '../data/site.js';
import credits from '../data/credits.json';

export default function Footer() {
  const { email, phone, address } = SITE.contact;
  return (
    <footer id="contact" className="footer">
      <div className="footer__grid">
        <div className="footer__brand">
          <LogoFull className="footer__logo" />
          <p className="kicker">
            {SITE.place} · {SITE.region}
          </p>
        </div>
        <div>
          <h2 className="footer__h">Contact</h2>
          <ul className="footer__list">
            <li>
              <a href={`mailto:${email}`}>{email}</a>
            </li>
            {phone && (
              <li>
                <a href={`tel:${phone.replace(/\s/g, '')}`}>{phone}</a>
              </li>
            )}
            <li>{address}</li>
          </ul>
        </div>
        {SITE.social.length > 0 && (
          <div>
            <h2 className="footer__h">Suivre</h2>
            <ul className="footer__list">
              {SITE.social.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noopener">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <details className="footer__credits">
        <summary>Crédits photographiques</summary>
        <p>
          Photographies de l'appartement : {SITE.name}. Photographies de Châtel et des Portes du Soleil (Wikimedia
          Commons) :
        </p>
        <ul>
          {Object.values(credits).map((c) => (
            <li key={c.source}>
              <a href={c.source} target="_blank" rel="noopener">
                {c.title.replace(/\.(jpe?g|JPG)$/, '')}
              </a>{' '}
              — {c.author}, {c.license}
            </li>
          ))}
        </ul>
      </details>
      <p className="footer__legal">
        © {new Date().getFullYear()} {SITE.name}
      </p>
    </footer>
  );
}
