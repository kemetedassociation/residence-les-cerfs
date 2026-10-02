import Img from '../components/Img.jsx';
import { EXPERIENCE } from '../data/content.js';

export default function Experience() {
  return (
    <section id="experience" className="experience" aria-labelledby="experience-title">
      <h2 id="experience-title" className="experience__title" data-in>
        <span>{EXPERIENCE.title[0]}</span>
        <em>{EXPERIENCE.title[1]}</em>
      </h2>
      <ol className="experience__list">
        {EXPERIENCE.items.map((it, i) => (
          <li key={it.word} className="experience__item" data-in style={{ '--d': `${i * 0.14}s` }}>
            <span className="experience__media">
              <Img image={it.image} focus={it.focus} sizes="(max-width: 720px) 50vw, 25vw" />
            </span>
            <span className="experience__num">{String(i + 1).padStart(2, '0')}</span>
            <h3 className="experience__word">{it.word}</h3>
            <p className="experience__text">{it.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
