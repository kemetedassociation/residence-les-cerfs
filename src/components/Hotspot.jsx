import Icon from './Icon.jsx';

export default function Hotspot({ hotspot, x, y, index, flip, open, onClick }) {
  const door = Boolean(hotspot.target);
  return (
    <button
      type="button"
      className={`hotspot${door ? ' hotspot--door' : ''}${flip ? ' hotspot--flip' : ''}${open ? ' is-open' : ''}`}
      style={{ left: x, top: y, '--i': index }}
      onClick={onClick}
      aria-label={door ? `${hotspot.title} — y aller` : hotspot.title}
      aria-expanded={door ? undefined : open}
      data-cursor="explore"
    >
      <span className="hotspot__dot" aria-hidden="true">
        {door && <Icon name="arrow" size={12} stroke={1.6} />}
      </span>
      <span className="hotspot__label" aria-hidden="true">
        {hotspot.title}
      </span>
    </button>
  );
}
