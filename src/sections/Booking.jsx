import Img from '../components/Img.jsx';
import BookingButton from '../components/BookingButton.jsx';
import { BOOKING } from '../data/content.js';
import { SITE, BOOKING_URL, directBooking } from '../data/site.js';

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
          {directBooking() && BOOKING_URL && (
            <a href={BOOKING_URL} className="link-btn booking__alt" target="_blank" rel="noopener">
              Aussi disponible sur Airbnb
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
