import Lenis from 'lenis';

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const finePointer = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

let lenis = null;

export function initScroll() {
  if (!reducedMotion()) {
    lenis = new Lenis({ duration: 1.15, smoothWheel: true, autoRaf: true });
  }
  // anchors (#chatel…) go through the smooth scroller
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href') === '#') return;
    const el = document.querySelector(a.getAttribute('href'));
    if (!el) return;
    e.preventDefault();
    scrollToEl(el);
  });
  return lenis;
}

export function scrollToEl(target, opts = {}) {
  return new Promise((resolve) => {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    const y = typeof target === 'number' ? target : el.getBoundingClientRect().top + window.scrollY;
    if (Math.abs(window.scrollY - y) < 4) return resolve();
    if (lenis) lenis.scrollTo(y, { duration: 1.2, force: true, ...opts, onComplete: resolve });
    else {
      window.scrollTo({ top: y, behavior: reducedMotion() ? 'auto' : 'smooth' });
      setTimeout(resolve, reducedMotion() ? 0 : 700);
    }
  });
}

export const lockScroll = (on) => {
  if (lenis) on ? lenis.stop() : lenis.start();
  document.documentElement.classList.toggle('is-locked', on);
};

export const onScroll = (fn) => {
  if (lenis) return lenis.on('scroll', fn);
  window.addEventListener('scroll', fn, { passive: true });
  return () => window.removeEventListener('scroll', fn);
};

/** Ask the tour to show a scene, scrolling back up to it first. */
export function visit(sceneId) {
  window.dispatchEvent(new CustomEvent('tour:goto', { detail: sceneId }));
}
