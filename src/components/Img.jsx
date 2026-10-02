import { getImage, srcFor, srcSet } from '../lib/images.js';

// Responsive, lazy image for the editorial sections (blurred placeholder underneath).
export default function Img({ image, alt = '', sizes = '100vw', focus = '50% 50%', className = '', eager = false, ...rest }) {
  const m = getImage(image);
  return (
    <img
      className={`img ${className}`}
      src={srcFor(image, m.widths[Math.min(1, m.widths.length - 1)])}
      srcSet={srcSet(image)}
      sizes={sizes}
      width={m.width}
      height={m.height}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      style={{ objectPosition: focus, backgroundImage: `url(${m.lqip})` }}
      {...rest}
    />
  );
}
