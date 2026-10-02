import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { LogoFull } from './Logo.jsx';
import { SITE } from '../data/site.js';
import { preload } from '../lib/images.js';
import { reducedMotion } from '../lib/scroll.js';

// Waits for the exterior + first interior scene (and the fonts), then lifts.
export default function Loader({ assets, onDone }) {
  const ref = useRef(null);
  const [pct, setPct] = useState(1);

  useEffect(() => {
    const target = { v: 0 };
    let loaded = 0;
    const tasks = [...assets.map((a) => preload(a)), document.fonts?.ready ?? Promise.resolve()];
    const total = tasks.length;
    const shown = { v: 1 };
    const tick = () => setPct(Math.max(1, Math.round(shown.v)));
    tasks.forEach((t) =>
      t.then(() => {
        loaded += 1;
        target.v = (loaded / total) * 100;
        gsap.to(shown, { v: target.v, duration: 0.6, ease: 'power2.out', onUpdate: tick });
      }),
    );
    const minTime = new Promise((r) => setTimeout(r, reducedMotion() ? 0 : 1400));
    const maxTime = new Promise((r) => setTimeout(r, 9000));
    Promise.race([Promise.all([...tasks, minTime]), maxTime]).then(() => {
      gsap.to(shown, { v: 100, duration: 0.4, onUpdate: tick });
      const rm = reducedMotion();
      gsap
        .timeline({ delay: 0.45, onComplete: () => onDone() })
        .to(ref.current.querySelectorAll('.loader__inner > *'), { autoAlpha: 0, y: -16, stagger: 0.05, duration: rm ? 0 : 0.5, ease: 'power2.in' })
        .to(ref.current, { yPercent: -100, duration: rm ? 0.2 : 1.1, ease: 'expo.inOut' }, '-=0.1');
    });
  }, []);

  return (
    <div className="loader" ref={ref} role="status" aria-live="polite" aria-label={`Chargement : ${pct} %`}>
      <div className="loader__inner">
        <LogoFull className="loader__logo" />
        <span className="loader__line" style={{ transform: `scaleX(${pct / 100})` }} />
        <p className="loader__place">
          {SITE.place} · {SITE.region}
        </p>
        <p className="loader__pct" aria-hidden="true">
          {pct < 100 ? String(pct).padStart(2, '0') : '100%'}
        </p>
      </div>
    </div>
  );
}
