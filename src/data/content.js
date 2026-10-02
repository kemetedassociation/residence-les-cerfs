// Textes des sections éditoriales (appartement, expérience, Châtel, réservation).

export const APARTMENT = {
  title: "L'appartement",
  intro: 'Trois chambres, une mezzanine et deux salles de bain, sur deux niveaux, pour allier confort, élégance et authenticité alpine.',
  // Chiffres clés affichés sous le titre
  facts: [
    { value: '3', label: 'Chambres', detail: 'lit 160 cm chacune' },
    { value: '1', label: 'Mezzanine', detail: 'lit double + 2 lits simples' },
    { value: '2', label: 'Salles de bain', detail: 'dont une à l’étage' },
    { value: '10', label: 'Couchages', detail: 'répartis sur 6 lits' },
  ],
  columns: [
    { icon: 'sofa', title: 'Séjour & cuisine', scene: 'sejour-1', items: ['Cuisine moderne et équipée', 'Salle à manger', 'Salon', 'Poêle à bois'] },
    { icon: 'bed', title: 'Les chambres', scene: 'chambre-1', items: ['Trois chambres', 'Un lit de 160 cm chacune', 'Rangements'] },
    { icon: 'bunk', title: 'La mezzanine', items: ['Lit superposé', 'En bas : lit double (2 places)', 'En haut : deux lits simples'] },
    { icon: 'shower', title: 'Salles de bain', scene: 'salle-de-bain', items: ['Douche à l’italienne', 'Double vasque', 'Petite salle de bain à l’étage'] },
  ],
  // Répartition par niveau
  levels: [
    {
      name: 'Rez-de-chaussée',
      items: [
        'Cuisine moderne et équipée',
        'Salle à manger et salon avec poêle à bois',
        'Deux chambres, lit de 160 cm chacune',
        'Salle de bain',
        'Machine à laver',
        'Coin chaussures',
      ],
    },
    {
      name: 'Étage',
      items: [
        'Mezzanine : lit superposé — lit double (2 places) en bas, deux lits simples (1 place) en haut',
        'Troisième chambre, lit de 160 cm',
        'Petite salle de bain',
      ],
    },
  ],
};

// Cartes « pièces » sous la visite (comme la maquette)
export const ROOM_CARDS = [
  { scene: 'chambre-1', image: 'interior/chambre-1', focus: '50% 55%', index: '03 / 05', title: 'Les chambres', text: 'Trois chambres, chacune avec un lit de 160 cm.' },
  { scene: 'salle-de-bain', image: 'interior/salle-de-bain', focus: '50% 45%', index: '04 / 05', title: 'Salles de bain', text: 'Douche à l’italienne et double vasque, plus une petite salle de bain à l’étage.' },
  { scene: 'sejour-2', image: 'interior/sejour-2', focus: '40% 55%', index: '02 / 05', title: 'Le coin du feu', text: 'Salon, salle à manger et cuisine équipée autour du poêle à bois.' },
];

export const EXPERIENCE = {
  title: ["Plus qu'un appartement.", 'Un refuge.'],
  items: [
    { word: 'Bois', text: 'Poutres anciennes, bardage brut, parquet chêne.', image: 'interior/chambre-1', focus: '70% 30%' },
    { word: 'Lumière', text: 'Velux sur les sommets, lumière basse le soir.', image: 'interior/sejour-1', focus: '30% 15%' },
    { word: 'Confort', text: 'Canapé profond, peaux, poêle à bois.', image: 'interior/sejour-2', focus: '35% 55%' },
    { word: 'Montagne', text: 'Les Portes du Soleil au pied de la porte.', image: 'chatel/ski', focus: '50% 50%' },
  ],
};

export const CHATEL = {
  kicker: 'Châtel',
  title: ['Entre montagne', 'et art de vivre'],
  text: 'Un village alpin authentique, un domaine exceptionnel, des activités été comme hiver, au cœur des Portes du Soleil.',
  categories: [
    { id: 'ski', label: 'Ski', icon: 'ski', image: 'chatel/ski', text: '600 km de pistes reliées entre France et Suisse sur le domaine des Portes du Soleil.' },
    { id: 'randonnee', label: 'Randonnée', icon: 'hike', image: 'chatel/randonnee', text: 'Sentiers d’alpage, cols et crêtes au départ du village dès la fonte des neiges.' },
    { id: 'village', label: 'Village', icon: 'village', image: 'chatel/village', text: 'Chalets de bois, église Saint-Laurent, marchés et boutiques au fil de la Dranse.' },
    { id: 'nature', label: 'Nature', icon: 'tree', image: 'chatel/nature', text: 'Le lac de Vonnes, ses reflets et sa promenade, à quelques minutes du centre.' },
    { id: 'gastronomie', label: 'Gastronomie', icon: 'fork', image: 'chatel/gastronomie', text: 'Terrasses d’altitude, fromages d’Abondance et tables savoyardes.' },
    { id: 'bien-etre', label: 'Bien-être', icon: 'leaf', image: 'chatel/bien-etre', text: 'Air pur, silence des sommets, et le calme d’un lac au crépuscule.' },
  ],
};

export const BOOKING = {
  kicker: 'Réservation',
  title: ['Votre séjour', 'commence ici'],
  image: 'interior/sejour-1',
};
