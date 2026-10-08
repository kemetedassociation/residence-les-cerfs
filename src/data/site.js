// ─────────────────────────────────────────────────────────────
//  CONFIGURATION GÉNÉRALE — tout ce qui se modifie sans toucher au code
// ─────────────────────────────────────────────────────────────

// Annonce Airbnb : lien secondaire dans le panneau de réservation,
// et lien du bouton « RÉSERVER » tant que la réservation directe n'est pas activée.
export const BOOKING_URL = 'https://www.airbnb.fr/rooms/1647312292450231655';

// Réservation directe (calendrier + paiement Stripe) : adresse des fonctions Supabase,
// ex. 'https://abcdefgh.supabase.co/functions/v1'. Vide = réservation directe désactivée.
// Aperçu sans serveur : ajouter ?demo=reservation à l'adresse du site.
export const BOOKING_API = '';

export const SITE = {
  name: 'Résidence Les Cerfs',
  nameLines: ['Résidence', 'Les Cerfs'],
  place: 'Châtel',
  region: 'Haute-Savoie',
  tagline: ['Une parenthèse', 'au cœur', 'des Alpes'],
  intro: "Un appartement d'exception à Châtel, entre confort contemporain et authenticité alpine.",

  contact: {
    email: 'cerf74390@gmail.com',
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

/** 'live' (server configured), 'demo' (?demo=reservation) or null (link to Airbnb). */
export const directBooking = () => {
  if (BOOKING_API) return 'live';
  try {
    if (new URLSearchParams(location.search).get('demo') === 'reservation') return 'demo';
  } catch {
    /* no location (tests) */
  }
  return null;
};
