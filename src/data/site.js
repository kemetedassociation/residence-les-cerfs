// ─────────────────────────────────────────────────────────────
//  CONFIGURATION GÉNÉRALE — tout ce qui se modifie sans toucher au code
// ─────────────────────────────────────────────────────────────

// Lien du bouton « RÉSERVER » (Airbnb, Booking.com, moteur propriétaire…).
// Laisser vide ('') pour que le bouton ouvre un e-mail de demande de réservation.
export const BOOKING_URL = '';

export const SITE = {
  name: 'Résidence Les Cerfs',
  nameLines: ['Résidence', 'Les Cerfs'],
  place: 'Châtel',
  region: 'Haute-Savoie',
  tagline: ['Une parenthèse', 'au cœur', 'des Alpes'],
  intro: "Un appartement d'exception à Châtel, entre confort contemporain et authenticité alpine.",

  contact: {
    email: 'contact@residence-les-cerfs.fr', // ← à remplacer
    phone: '', // ex. '+33 6 00 00 00 00'
    address: 'Châtel, 74390 Haute-Savoie, France',
  },

  // Prix indicatif affiché dans la section réservation ('' pour masquer)
  price: '',

  social: [
    // { label: 'Instagram', url: 'https://instagram.com/…' },
  ],

  languages: ['FR'],
};

export const NAV = [
  { label: "L'appartement", href: '#appartement' },
  { label: 'Expérience', href: '#experience' },
  { label: 'Châtel', href: '#chatel' },
  { label: 'Réserver', href: '#reserver' },
];

export const bookingHref = () =>
  BOOKING_URL ||
  `mailto:${SITE.contact.email}?subject=${encodeURIComponent('Demande de réservation — ' + SITE.name)}`;
