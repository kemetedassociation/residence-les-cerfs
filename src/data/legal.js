// ─────────────────────────────────────────────────────────────
//  INFORMATIONS LÉGALES — exploitant, conditions de location,
//  mentions légales, confidentialité. Modifiable sans toucher au code.
// ─────────────────────────────────────────────────────────────
import pricing from '../../supabase/functions/_shared/pricing.json';

export const OPERATOR = {
  name: 'SCI AMLOSA',
  form: 'Société civile immobilière au capital de 100 €',
  rcs: 'RCS Besançon 943 848 234',
  address: '8 rue de la Chaux, 25580 Durnes, France',
  manager: 'Sandra Fernandez',
  email: 'cerf74390@gmail.com',
  registration: '74063001813VP',
  property: 'Résidence Les Cerfs, 74390 Châtel (Haute-Savoie)',
};

const pct = pricing.deposit.percent;
const days = pricing.deposit.balanceDaysBefore;
const fullDays = pricing.cancellation.fullRefundDays;

// Remboursement en cas d'annulation par le voyageur (utilisé aussi par l'espace propriétaire)
export const CANCELLATION = [
  { minDays: fullDays, label: `${fullDays} jours ou plus avant l’arrivée`, refund: 'Remboursement intégral des sommes versées.' },
  { minDays: days, label: `Entre ${days} et ${fullDays - 1} jours avant l’arrivée`, refund: `L’acompte de ${pct} % reste acquis ; aucun autre montant n’a encore été prélevé.` },
  { minDays: 0, label: `Moins de ${days} jours avant l’arrivée`, refund: 'Le prix du séjour reste dû en totalité, sauf si le logement est reloué pour les mêmes dates : les sommes correspondant aux nuits relouées sont alors remboursées.' },
];

// Points clés affichés au moment du paiement
export const BOOKING_TERMS = [
  `Réservation ferme dès le paiement de l’acompte de ${pct} %. Si l’arrivée a lieu dans moins de ${days} jours, la totalité est réglée à la réservation.`,
  `Le solde est prélevé automatiquement sur la carte utilisée, ${days} jours avant l’arrivée.`,
  ...CANCELLATION.map((c) => `Annulation ${c.label.charAt(0).toLowerCase() + c.label.slice(1)} : ${c.refund.charAt(0).toLowerCase() + c.refund.slice(1)}`),
  `Arrivée à partir de ${pricing.checkInTime.replace(':00', ' h')}, départ avant ${pricing.checkOutTime.replace(':00', ' h')}. ${pricing.maxGuests} personnes maximum.`,
  'Le droit de rétractation ne s’applique pas aux locations de logement à date déterminée (article L. 221-28 du Code de la consommation).',
];

/** Each page: { slug, title, intro, sections: [{ h, p: [] }] } */
export const LEGAL_PAGES = {
  conditions: {
    slug: 'conditions',
    title: 'Conditions de location',
    intro: `Les présentes conditions s’appliquent à toute réservation effectuée sur ce site pour le logement « Résidence Les Cerfs » à Châtel. En réservant, le voyageur déclare les avoir lues et acceptées.`,
    sections: [
      {
        h: '1. Le bailleur',
        p: [
          `${OPERATOR.name}, ${OPERATOR.form}, ${OPERATOR.rcs}, siège : ${OPERATOR.address}, représentée par sa gérante, ${OPERATOR.manager}. Contact : ${OPERATOR.email}.`,
          `Meublé de tourisme déclaré en mairie de Châtel sous le numéro d’enregistrement ${OPERATOR.registration}.`,
        ],
      },
      {
        h: '2. Le logement',
        p: [
          `Appartement meublé sur deux niveaux à Châtel (74390), comprenant trois chambres équipées chacune d’un lit de 160 cm, une mezzanine avec un lit superposé (un lit double en bas, deux lits simples en haut), deux salles de bain, une cuisine équipée, un séjour avec poêle à bois et un lave-linge.`,
          `Capacité maximale : ${pricing.maxGuests} personnes, enfants compris. Cette capacité ne peut être dépassée.`,
          'La location est consentie à titre de résidence de vacances ; le voyageur ne peut se prévaloir d’aucun droit au maintien dans les lieux à l’issue du séjour.',
        ],
      },
      {
        h: '3. Réservation',
        p: [
          'Le voyageur choisit ses dates et le nombre de personnes ; le prix total, l’acompte et la date de prélèvement du solde sont affichés avant le paiement.',
          `La réservation devient ferme et définitive à réception du paiement de l’acompte (ou du prix total si l’arrivée a lieu dans moins de ${days} jours). Une confirmation s’affiche alors sur le site et un reçu est envoyé par e-mail par notre prestataire de paiement.`,
          'Les dates sont réservées pour une durée minimale variable selon la période, indiquée dans le calendrier.',
        ],
      },
      {
        h: '4. Prix',
        p: [
          'Les prix sont indiqués en euros, toutes taxes comprises. Ils comprennent la location du logement meublé et le ménage de fin de séjour.',
          'La taxe de séjour, due par les personnes majeures selon le tarif fixé par la commune de Châtel, n’est pas comprise dans le prix lorsqu’elle n’apparaît pas dans le détail de la réservation ; elle est alors réglée séparément avant l’arrivée.',
          'Le prix applicable est celui affiché au moment de la réservation.',
        ],
      },
      {
        h: '5. Paiement',
        p: [
          `Un acompte de ${pct} % du prix total est réglé par carte bancaire au moment de la réservation. Le solde est prélevé automatiquement sur la même carte ${days} jours avant la date d’arrivée ; le voyageur autorise ce prélèvement en réservant.`,
          `Si l’arrivée a lieu dans moins de ${days} jours, la totalité du prix est réglée à la réservation.`,
          'Si le prélèvement du solde échoue (carte expirée, validation demandée par la banque…), un lien de paiement est envoyé au voyageur. À défaut de paiement du solde avant l’arrivée, la réservation peut être annulée dans les conditions de l’article 6.',
          'Les paiements sont traités par Stripe ; le bailleur n’a jamais accès aux données complètes de la carte bancaire.',
        ],
      },
      {
        h: '6. Annulation par le voyageur',
        p: [
          'Toute annulation doit être notifiée par e-mail. La date de réception de l’e-mail détermine les conditions applicables :',
          ...CANCELLATION.map((c) => `${c.label} : ${c.refund.charAt(0).toLowerCase() + c.refund.slice(1)}`),
          'Un séjour écourté ou une arrivée tardive ne donnent lieu à aucun remboursement. Il est recommandé de souscrire une assurance annulation.',
          'Les remboursements sont effectués sur la carte utilisée pour le paiement, sous 14 jours.',
        ],
      },
      {
        h: '7. Annulation par le bailleur',
        p: [
          'Si le bailleur doit annuler la réservation, il en informe le voyageur sans délai et lui rembourse l’intégralité des sommes versées sous 14 jours.',
        ],
      },
      {
        h: '8. Droit de rétractation',
        p: [
          'Conformément à l’article L. 221-28, 12° du Code de la consommation, le droit de rétractation ne s’applique pas aux prestations d’hébergement fournies à une date déterminée. Seules les conditions d’annulation de l’article 6 s’appliquent.',
        ],
      },
      {
        h: '9. Arrivée, séjour et départ',
        p: [
          `Arrivée à partir de ${pricing.checkInTime.replace(':00', ' h')}, départ avant ${pricing.checkOutTime.replace(':00', ' h')}. Les modalités de remise des clés sont communiquées avant l’arrivée.`,
          'Le voyageur s’engage à occuper le logement paisiblement, à en faire un usage conforme à sa destination, à respecter le règlement de la résidence et la tranquillité du voisinage, et à ne pas recevoir plus de personnes que la capacité prévue.',
          'Le logement est remis propre et en bon état. Toute dégradation, casse ou disparition constatée est à la charge du voyageur, qui est invité à vérifier que son assurance responsabilité civile couvre la location de vacances.',
          'Le voyageur signale sans délai tout dysfonctionnement ; aucun remboursement ne pourra être accordé pour un problème qui n’a pas été signalé pendant le séjour.',
        ],
      },
      {
        h: '10. Données personnelles',
        p: ['Les données recueillies lors de la réservation sont traitées conformément à la politique de confidentialité du site.'],
      },
      {
        h: '11. Réclamations et litiges',
        p: [
          `Toute réclamation est adressée par e-mail à ${OPERATOR.email} ; une réponse est apportée dans les meilleurs délais.`,
          'Conformément aux articles L. 611-1 et suivants du Code de la consommation, le voyageur peut recourir gratuitement à un médiateur de la consommation en vue de la résolution amiable d’un litige ; ses coordonnées sont communiquées sur simple demande.',
          'Les présentes conditions sont soumises au droit français.',
        ],
      },
    ],
  },

  mentions: {
    slug: 'mentions-legales',
    title: 'Mentions légales',
    sections: [
      {
        h: 'Éditeur du site',
        p: [`${OPERATOR.name}, ${OPERATOR.form}`, OPERATOR.rcs, `Siège : ${OPERATOR.address}`, `Contact : ${OPERATOR.email}`, `Directrice de la publication : ${OPERATOR.manager}, gérante.`],
      },
      {
        h: 'Logement',
        p: [OPERATOR.property, `Meublé de tourisme — numéro d’enregistrement : ${OPERATOR.registration}`],
      },
      {
        h: 'Hébergement',
        p: [
          'Site : GitHub Pages — GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, États-Unis.',
          'Réservations : Supabase, Inc. — données hébergées dans l’Union européenne (Francfort, Allemagne).',
          'Paiements : Stripe Payments Europe, Ltd., 1 Grand Canal Street Lower, Dublin 2, Irlande.',
        ],
      },
      {
        h: 'Propriété intellectuelle',
        p: [
          'Les photographies de l’appartement, les textes et le logo sont la propriété de l’éditeur ; toute reproduction sans autorisation est interdite.',
          'Les photographies de Châtel et des Portes du Soleil proviennent de Wikimedia Commons et sont utilisées selon leurs licences libres (CC BY / CC BY-SA) ; leurs auteurs sont crédités en pied de page.',
        ],
      },
    ],
  },

  confidentialite: {
    slug: 'confidentialite',
    title: 'Confidentialité',
    intro: 'Cette page explique quelles données personnelles sont traitées lorsque vous consultez ce site ou réservez un séjour, et quels sont vos droits.',
    sections: [
      { h: 'Responsable du traitement', p: [`${OPERATOR.name}, ${OPERATOR.address}. Contact : ${OPERATOR.email}.`] },
      {
        h: 'Données collectées',
        p: [
          'Lors d’une réservation : nom, adresse e-mail, téléphone, message éventuel, dates et nombre de voyageurs, montants payés.',
          'Les données de carte bancaire sont saisies directement chez Stripe et ne nous sont jamais transmises.',
          'Pour prévenir les abus, l’adresse IP utilisée lors d’une demande de réservation est conservée 30 jours.',
          'Simple consultation du site : aucun cookie de mesure d’audience ni de publicité n’est utilisé ; les polices de caractères sont hébergées sur le site lui-même.',
        ],
      },
      {
        h: 'Finalités et bases légales',
        p: [
          'Gestion de la réservation, du paiement et du séjour : exécution du contrat.',
          'Conservation des pièces comptables : obligation légale.',
          'Prévention de la fraude et des réservations abusives : intérêt légitime.',
        ],
      },
      {
        h: 'Destinataires',
        p: [
          'Les données sont accessibles uniquement à l’éditeur et à ses prestataires techniques : Stripe (paiement), Supabase (base de données hébergée dans l’Union européenne), GitHub (hébergement du site). Elles ne sont ni vendues ni cédées.',
          'Les dates réservées (sans aucune donnée personnelle) sont partagées avec Airbnb afin d’éviter les doubles réservations.',
        ],
      },
      {
        h: 'Durées de conservation',
        p: [
          'Données de réservation : 3 ans après la fin du séjour. Pièces comptables : 10 ans. Demandes de réservation non payées : supprimées après 30 jours.',
        ],
      },
      {
        h: 'Vos droits',
        p: [
          `Vous disposez d’un droit d’accès, de rectification, d’effacement, d’opposition, de limitation et de portabilité de vos données, à exercer par e-mail à ${OPERATOR.email}. Vous pouvez également introduire une réclamation auprès de la CNIL (www.cnil.fr).`,
        ],
      },
    ],
  },
};
