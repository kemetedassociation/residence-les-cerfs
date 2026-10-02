import { ROOMS } from '../data/scenes.js';

const pad = (n) => String(n).padStart(2, '0');

export default function SceneNavigation({ active, onSelect }) {
  return (
    <nav className="scene-nav" aria-label="Pièces de la visite">
      <ol>
        {ROOMS.map((room, i) => (
          <li key={room.id}>
            <button
              type="button"
              className={`scene-nav__item${room.id === active ? ' is-active' : ''}`}
              aria-current={room.id === active ? 'step' : undefined}
              onClick={() => onSelect(room)}
              data-cursor="explore"
            >
              <span className="scene-nav__num">{pad(i + 1)}</span>
              <span className="scene-nav__label">{room.label}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
