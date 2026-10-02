import Img from '../components/Img.jsx';
import Icon from '../components/Icon.jsx';
import { APARTMENT, ROOM_CARDS } from '../data/content.js';
import { visit } from '../lib/scroll.js';

export default function Apartment() {
  return (
    <section id="appartement" className="apartment" aria-labelledby="apartment-title">
      <div className="rooms">
        {ROOM_CARDS.map((c, i) => (
          <button
            key={c.scene}
            type="button"
            className="room-card"
            onClick={() => visit(c.scene)}
            data-in
            style={{ '--d': `${i * 0.1}s` }}
            data-cursor="view"
            aria-label={`${c.title} — entrer dans la visite`}
          >
            <span className="room-card__media">
              <Img image={c.image} focus={c.focus} sizes="(max-width: 720px) 100vw, 34vw" />
            </span>
            <span className="room-card__body">
              <span className="kicker">{c.index}</span>
              <span className="room-card__title">{c.title}</span>
              <span className="room-card__text">{c.text}</span>
            </span>
            <span className="round-btn" aria-hidden="true">
              <Icon name="arrow" size={16} />
            </span>
          </button>
        ))}
      </div>

      <div className="apartment__inner">
        <header className="apartment__head" data-in>
          <h2 id="apartment-title" className="section-title">
            {APARTMENT.title}
          </h2>
          <p className="apartment__intro">{APARTMENT.intro}</p>
          <button type="button" className="link-btn link-btn--arrow" onClick={() => visit('sejour-1')}>
            Visiter <Icon name="chevron" size={14} />
          </button>
        </header>
        <dl className="apartment__facts">
          {APARTMENT.facts.map((f, i) => (
            <div key={f.label} className="apartment__fact" data-in style={{ '--d': `${i * 0.08}s` }}>
              <dt>
                <span className="apartment__value">{f.value}</span>
                {f.label}
              </dt>
              <dd>{f.detail}</dd>
            </div>
          ))}
        </dl>
        <ul className="apartment__cols">
          {APARTMENT.columns.map((c, i) => (
            <li key={c.title} className="apartment__col" data-in style={{ '--d': `${0.1 + i * 0.12}s` }}>
              <Icon name={c.icon} size={36} stroke={1} className="apartment__icon" />
              <h3>{c.title}</h3>
              <ul>
                {c.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
              {c.scene && (
                <button type="button" className="link-btn" onClick={() => visit(c.scene)}>
                  Voir la pièce
                </button>
              )}
            </li>
          ))}
        </ul>
        <div className="apartment__levels">
          {APARTMENT.levels.map((l, i) => (
            <section key={l.name} className="apartment__level" data-in style={{ '--d': `${i * 0.12}s` }} aria-label={l.name}>
              <h3 className="kicker">{l.name}</h3>
              <ul>
                {l.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}
