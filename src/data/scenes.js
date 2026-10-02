// ─────────────────────────────────────────────────────────────
//  PARCOURS DE LA VISITE
//  L'ordre du tableau = l'ordre de la visite (flèches, swipe, clavier).
//
//  image   : clé dans images.json (dossier/nom du fichier source)
//  focus   : point de l'image qui reste visible quand on recadre (en %)
//  room    : regroupe les scènes d'une même pièce (indicateur 01…05)
//  enter   : point de l'image vers lequel la caméra « avance » pour
//            entrer dans la scène suivante (porte, couloir…)
//  panel   : 'right' pour placer le texte à droite (sujet principal à gauche)
//  hotspots: x / y en % de la photo. `target` = id d'une scène → le
//            hotspot devient un passage vers cette scène (épinglé au
//            bord de l'écran s'il sort du cadre).
// ─────────────────────────────────────────────────────────────

export const ROOMS = [
  { id: 'exterieur', label: 'Extérieur' },
  { id: 'sejour', label: 'Séjour' },
  { id: 'chambre', label: 'Chambres' },
  { id: 'salle-de-bain', label: 'Salles de bain' },
  { id: 'chatel', label: 'Châtel', href: '#chatel' },
];

export const SCENES = [
  {
    id: 'exterieur',
    room: 'exterieur',
    image: 'chatel/exterior-chatel-dusk',
    focus: { x: 50, y: 62 },
    enter: { x: 42, y: 74 },
    tone: 'night',
    hero: true,
    hotspots: [],
  },
  {
    id: 'sejour-1',
    room: 'sejour',
    image: 'interior/sejour-1',
    focus: { x: 40, y: 33 },
    enter: { x: 90, y: 44 },
    title: 'Le séjour',
    text: 'Un espace chaleureux où le bois naturel, les matières douces et les lignes contemporaines créent un véritable refuge après une journée en montagne.',
    cta: { label: 'Explorer cet espace', hotspot: 'detente' },
    hotspots: [
      { id: 'lumiere', x: 28, y: 17, title: 'Lumière naturelle', description: 'Un velux ouvert sur les sommets : la lumière du jour tombe directement sur le salon, et la nuit, les étoiles.' },
      { id: 'detente', x: 46, y: 46, title: 'Espace détente', description: 'Un grand canapé pensé pour les moments de repos après une journée sur les pistes.' },
      { id: 'matieres', x: 7, y: 47, title: 'Matières', description: 'Lanterne en rotin, peau naturelle, tables en pierre, coussins texturés : des matières qui invitent à ralentir.' },
      { id: 'vers-poele', x: 90, y: 44, title: 'Le coin du feu', description: "Tournez-vous : le poêle à bois fait face à l'espace détente.", target: 'sejour-2' },
    ],
  },
  {
    id: 'sejour-2',
    room: 'sejour',
    image: 'interior/sejour-2',
    focus: { x: 45, y: 44 },
    enter: { x: 6, y: 42 },
    panel: 'right',
    title: 'Le coin du feu',
    text: 'Le poêle à bois rythme les soirées. On rentre des pistes, on allume le feu, et le temps ralentit.',
    cta: { label: 'Rejoindre la table', target: 'repas' },
    hotspots: [
      { id: 'poele', x: 35, y: 50, title: 'Poêle à bois', description: 'Une présence chaleureuse au cœur du séjour, pour les longues soirées d’hiver.' },
      { id: 'tv', x: 63, y: 44, title: 'Télévision', description: 'Un grand écran mural pour les soirées cinéma, discret le reste du temps.' },
      { id: 'vue', x: 92, y: 24, title: 'Vue sur les sommets', description: 'Depuis le canapé, le velux cadre les montagnes comme un tableau.' },
      { id: 'vers-repas', x: 8, y: 40, title: 'Espace repas', description: 'Passez de l’autre côté : la grande table en bois massif.', target: 'repas' },
    ],
  },
  {
    id: 'repas',
    room: 'sejour',
    image: 'interior/repas',
    focus: { x: 50, y: 48 },
    enter: { x: 84, y: 46 },
    title: 'Espace repas',
    text: 'Une cuisine moderne et équipée, une table en bois massif pour partager les repas, les jeux et les plans du lendemain, face aux montagnes.',
    cta: { label: 'Entrer dans les chambres', target: 'chambre-1' },
    hotspots: [
      { id: 'table', x: 47, y: 61, title: 'Table en bois', description: 'Bois massif et chaises enveloppantes : l’endroit où l’on se retrouve.' },
      { id: 'suspension', x: 47, y: 33, title: 'Suspension', description: 'Une lumière douce et basse, posée au-dessus de la table.' },
      { id: 'balcon', x: 89, y: 46, title: 'Vue sur Châtel', description: 'De grandes baies ouvrent sur la vallée et les toits du village.' },
      { id: 'escalier', x: 76, y: 42, title: 'À l’étage', description: 'L’escalier mène à la mezzanine — un lit double en bas, deux lits simples au-dessus — à la troisième chambre (lit 160 cm) et à une petite salle de bain.' },
    ],
  },
  {
    id: 'chambre-1',
    room: 'chambre',
    image: 'interior/chambre-1',
    focus: { x: 45, y: 46 },
    enter: { x: 88, y: 45 },
    title: 'Les chambres',
    text: "Trois chambres, chacune avec un lit de 160 cm. Des espaces calmes et chaleureux pour prolonger l'expérience alpine jusque dans la nuit.",
    cta: { label: 'Explorer cet espace', hotspot: 'lit' },
    hotspots: [
      { id: 'lit', x: 40, y: 58, title: 'Lit 160 cm', description: 'Un grand lit de 160 cm, des draps sombres et un plaid épais : la promesse de nuits profondes. Les trois chambres en sont équipées.' },
      { id: 'rangements', x: 9, y: 54, title: 'Rangements', description: 'Un dressing ouvert sur toute la longueur, pour poser ses affaires et se sentir chez soi.' },
      { id: 'bois', x: 66, y: 34, title: 'Bois naturel', description: 'Un mur en vieux bois qui réchauffe la pièce et rappelle les chalets d’alpage.' },
      { id: 'vers-fenetre', x: 88, y: 46, title: 'Côté fenêtre', description: 'Retournez-vous vers la fenêtre.', target: 'chambre-2' },
    ],
  },
  {
    id: 'chambre-2',
    room: 'chambre',
    image: 'interior/chambre-2',
    focus: { x: 42, y: 42 },
    enter: { x: 4, y: 50 },
    title: 'Côté fenêtre',
    text: 'Le matin, la lumière entre par la fenêtre et dévoile les chalets voisins. Un fauteuil attend le premier café.',
    cta: { label: 'Vers la salle de bain', target: 'salle-de-bain' },
    hotspots: [
      { id: 'vue', x: 60, y: 30, title: 'Vue', description: 'Une fenêtre sur les chalets et la forêt, rideaux occultants pour les grasses matinées.' },
      { id: 'fauteuil', x: 12, y: 56, title: 'Coin lecture', description: 'Un fauteuil près de la fenêtre, pour lire ou regarder la neige tomber.' },
      { id: 'dressing', x: 80, y: 47, title: 'Rangements', description: 'Penderie et étagères intégrées sous le rampant.' },
      { id: 'vers-sdb', x: 5, y: 48, title: 'Salle de bain', description: 'La salle de bain est juste à côté.', target: 'salle-de-bain' },
    ],
  },
  {
    id: 'salle-de-bain',
    room: 'salle-de-bain',
    image: 'interior/salle-de-bain',
    focus: { x: 50, y: 40 },
    enter: { x: 50, y: 50 },
    title: 'Salles de bain',
    text: 'Une salle de bain contemporaine au rez-de-chaussée, douche à l’italienne et double vasque, complétée par une petite salle de bain à l’étage.',
    cta: { label: 'Découvrir Châtel', href: '#chatel' },
    hotspots: [
      { id: 'vasque', x: 33, y: 46, title: 'Double vasque', description: 'Deux vasques posées sur un meuble en noyer, pour se préparer sans se gêner.' },
      { id: 'miroir', x: 30, y: 26, title: 'Miroir sculpté', description: 'Un miroir ondulé rétroéclairé, signature de la pièce.' },
      { id: 'douche', x: 70, y: 34, title: 'Douche à l’italienne', description: 'Grande douche de plain-pied, robinetterie laiton brossé.' },
      { id: 'finition', x: 12, y: 30, title: 'Finition minérale', description: 'Grands carreaux effet pierre, du sol au plafond.' },
    ],
  },
];

export const sceneIndex = (id) => SCENES.findIndex((s) => s.id === id);
export const roomIndex = (roomId) => ROOMS.findIndex((r) => r.id === roomId);
