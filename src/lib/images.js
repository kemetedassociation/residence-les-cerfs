import manifest from '../data/images.json';

const BASE = import.meta.env.BASE_URL + 'img/';

export function getImage(key) {
  const m = manifest[key];
  if (!m) throw new Error(`Image inconnue : ${key} (lancer « npm run images » ?)`);
  return m;
}

export const srcFor = (key, w) => `${BASE}${getImage(key).id}-${w}.webp`;

export const srcSet = (key) =>
  getImage(key).widths.map((w) => `${srcFor(key, w)} ${w}w`).join(', ');

/** Smallest variant covering `cssWidth` at the current pixel density. */
export function pickSrc(key, cssWidth) {
  const { widths } = getImage(key);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const need = cssWidth * dpr;
  const w = widths.find((x) => x >= need) ?? widths.at(-1);
  return srcFor(key, w);
}

const cache = new Map();
/** Loads + decodes an image once; resolves with its URL (never rejects). */
export function preload(src) {
  if (!cache.has(src)) {
    cache.set(
      src,
      new Promise((resolve) => {
        const img = new Image();
        img.decoding = 'async';
        img.src = src;
        const done = () => resolve(src);
        (img.decode ? img.decode() : new Promise((r, j) => ((img.onload = r), (img.onerror = j)))).then(done, done);
      }),
    );
  }
  return cache.get(src);
}

/**
 * object-fit: cover, computed by hand so hotspots can be placed on the photo.
 * Returns the drawn rect of the image inside a W×H box, honouring the focus point.
 */
export function coverRect(key, W, H, focus = { x: 50, y: 50 }) {
  const { width, height } = getImage(key);
  const s = Math.max(W / width, H / height);
  const w = width * s;
  const h = height * s;
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  // place the focus point at the centre of the box, without exposing edges
  const left = clamp(W / 2 - (focus.x / 100) * w, W - w, 0);
  const top = clamp(H / 2 - (focus.y / 100) * h, H - h, 0);
  return { left, top, width: w, height: h };
}
