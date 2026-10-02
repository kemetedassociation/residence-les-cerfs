import Img from '../components/Img.jsx';
import Icon from '../components/Icon.jsx';
import { BOOKING } from '../data/content.js';
import { SITE, bookingHref } from '../data/site.js';

export function BookingButton({ className = '' }) {
  const href = bookingHref();
  const external = href.startsWith('http');
  return (
    <a href={href} className={`btn ${className}`} target={external ? '_blank' : undefined} rel={external ? 'noopener' : undefined} data-cursor="explore">
      Réserver <Icon name="chevron" size={16} />
    </a>
  );
}

export default function Booking() {
  return (
    <section id="reserver" className="booking" aria-labelledby="booking-title">
      <div className="booking__bg" aria-hidden="true">
        <Img image={BOOKING.image} focus="50% 45%" data-parallax="0.08" alt="" />
      </div>
      <div className="booking__inner">
        <div data-in>
          <p className="kicker">{BOOKING.kicker}</p>
          <h2 id="booking-title" className="section-title section-title--xl">
            {BOOKING.title.map((l) => (
              <span key={l}>{l}</span>
            ))}
          </h2>
          <p className="booking__place">
            {SITE.name}
            <br />
            {SITE.place} · {SITE.region}
          </p>
          {SITE.price && <p className="booking__price">{SITE.price}</p>}
        </div>
        <div className="booking__actions" data-in style={{ '--d': '0.15s' }}>
          <BookingButton className="btn--wide" />
          <a href="#contact" className="btn btn--ghost btn--wide" data-cursor="explore">
            Nous contacter
          </a>
        </div>
      </div>
    </section>
  );
}
