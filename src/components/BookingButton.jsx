import Icon from './Icon.jsx';
import { bookingHref, directBooking } from '../data/site.js';
import { openBooking } from '../lib/booking-api.js';

// « Réserver » : opens the on-site booking panel when direct booking is on, otherwise the Airbnb listing.
export default function BookingButton({ className = '', label = 'Réserver', onClick }) {
  if (directBooking()) {
    return (
      <button
        type="button"
        className={`btn ${className}`}
        onClick={() => {
          onClick?.();
          openBooking();
        }}
        data-cursor="explore"
      >
        {label} <Icon name="chevron" size={16} />
      </button>
    );
  }
  const href = bookingHref();
  const external = href.startsWith('http');
  return (
    <a href={href} className={`btn ${className}`} target={external ? '_blank' : undefined} rel={external ? 'noopener' : undefined} data-cursor="explore">
      {label} <Icon name="chevron" size={16} />
    </a>
  );
}
