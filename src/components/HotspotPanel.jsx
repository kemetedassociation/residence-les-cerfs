import { useEffect, useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { reducedMotion } from '../lib/scroll.js';

export default function HotspotPanel({ hotspot, x, y, flip, mobile, onClose }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    if (reducedMotion()) return;
    gsap.fromTo(
      ref.current,
      { autoAlpha: 0, y: 12, clipPath: 'inset(0 0 100% 0)' },
      { autoAlpha: 1, y: 0, clipPath: 'inset(0 0 0% 0)', duration: 0.7, ease: 'power3.out' },
    );
  }, [hotspot.id]);

  useEffect(() => {
    ref.current.querySelector('button')?.focus({ preventScroll: true });
  }, [hotspot.id]);

  const style = mobile
    ? undefined
    : { left: flip ? undefined : x + 34, right: flip ? `calc(100% - ${x - 34}px)` : undefined, top: Math.max(96, y - 40) };

  return (
    <div
      ref={ref}
      className={`hs-panel${mobile ? ' hs-panel--sheet' : ''}`}
      style={style}
      role="dialog"
      aria-labelledby={`hs-${hotspot.id}`}
    >
      <h3 id={`hs-${hotspot.id}`} className="hs-panel__title">
        {hotspot.title}
      </h3>
      <p className="hs-panel__text">{hotspot.description}</p>
      <button type="button" className="link-btn" onClick={onClose} data-cursor="explore">
        Fermer
      </button>
    </div>
  );
}
