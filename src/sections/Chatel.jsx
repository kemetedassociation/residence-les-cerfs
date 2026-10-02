import { useState } from 'react';
import Img from '../components/Img.jsx';
import Icon from '../components/Icon.jsx';
import { CHATEL } from '../data/content.js';

// Hover (or tap / focus) a category: the main image changes.
export default function Chatel() {
  const [active, setActive] = useState(CHATEL.categories[0].id);
  const current = CHATEL.categories.find((c) => c.id === active);

  return (
    <section id="chatel" className="chatel" aria-labelledby="chatel-title">
      <div className="chatel__stage">
        {CHATEL.categories.map((c) => (
          <div key={c.id} className={`chatel__bg${c.id === active ? ' is-active' : ''}`} aria-hidden={c.id !== active}>
            <Img image={c.image} sizes="(max-width: 900px) 100vw, 64vw" data-parallax="0.06" alt="" />
          </div>
        ))}
        <div className="chatel__copy" data-in>
          <p className="kicker">{CHATEL.kicker}</p>
          <h2 id="chatel-title" className="section-title section-title--xl">
            {CHATEL.title.map((l) => (
              <span key={l}>{l}</span>
            ))}
          </h2>
          <p className="chatel__text">{CHATEL.text}</p>
          <p className="chatel__detail" aria-live="polite">
            <span>{current.label}</span> — {current.text}
          </p>
        </div>
      </div>

      <ul className="chatel__list" role="list">
        {CHATEL.categories.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              className={`chatel__cat${c.id === active ? ' is-active' : ''}`}
              onMouseEnter={() => setActive(c.id)}
              onFocus={() => setActive(c.id)}
              onClick={() => setActive(c.id)}
              aria-pressed={c.id === active}
              data-cursor="view"
            >
              <span className="chatel__thumb">
                <Img image={c.image} sizes="(max-width: 900px) 100vw, 36vw" alt="" />
              </span>
              <Icon name={c.icon} size={22} stroke={1.1} />
              <span className="chatel__label">{c.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
