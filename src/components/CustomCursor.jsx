import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { finePointer } from '../lib/scroll.js';

const LABELS = { explore: 'Explore', view: 'View' };

// ○ by default, ● EXPLORE on interactive elements, VIEW over photos. Desktop only.
export default function CustomCursor() {
  const ref = useRef(null);
  const [mode, setMode] = useState(null);
  const [enabled] = useState(finePointer);

  useEffect(() => {
    if (!enabled) return;
    document.documentElement.classList.add('has-cursor');
    const el = ref.current;
    const qx = gsap.quickTo(el, 'x', { duration: 0.35, ease: 'power3.out' });
    const qy = gsap.quickTo(el, 'y', { duration: 0.35, ease: 'power3.out' });
    const move = (e) => {
      qx(e.clientX);
      qy(e.clientY);
      const t = e.target.closest?.('a, button, [data-cursor]');
      const m = t ? (t.matches('a, button') ? 'explore' : t.dataset.cursor) : null;
      setMode((p) => (p === m ? p : m));
    };
    const leave = () => gsap.to(el, { autoAlpha: 0, duration: 0.2 });
    const enter = () => gsap.to(el, { autoAlpha: 1, duration: 0.2 });
    window.addEventListener('mousemove', move, { passive: true });
    document.addEventListener('mouseleave', leave);
    document.addEventListener('mouseenter', enter);
    return () => {
      document.documentElement.classList.remove('has-cursor');
      window.removeEventListener('mousemove', move);
      document.removeEventListener('mouseleave', leave);
      document.removeEventListener('mouseenter', enter);
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <div className={`cursor${mode ? ` cursor--${mode}` : ''}`} ref={ref} aria-hidden="true">
      <span className="cursor__ring" />
      <span className="cursor__label">{LABELS[mode] ?? ''}</span>
    </div>
  );
}
