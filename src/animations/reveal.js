import { useEffect } from 'react';
import { onScroll, reducedMotion } from '../lib/scroll.js';

/** Elements with [data-in] fade up once when they enter the viewport. */
export function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('[data-in]');
    if (reducedMotion()) {
      els.forEach((el) => el.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }),
      { rootMargin: '0px 0px -12% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/** Elements with [data-parallax="0.1"] drift slightly while scrolling. */
export function useParallax() {
  useEffect(() => {
    if (reducedMotion()) return;
    const els = [...document.querySelectorAll('[data-parallax]')];
    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      for (const el of els) {
        const r = el.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) continue;
        const progress = (r.top + r.height / 2 - vh / 2) / vh; // -1…1 around the centre
        el.style.transform = `translate3d(0, ${(progress * parseFloat(el.dataset.parallax) * 100).toFixed(2)}%, 0) scale(1.12)`;
      }
    };
    const off = onScroll(() => (raf ||= requestAnimationFrame(update)));
    update();
    return () => {
      off?.();
      cancelAnimationFrame(raf);
    };
  }, []);
}
