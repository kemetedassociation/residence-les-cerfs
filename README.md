# Résidence Les Cerfs — site

Visite immersive de l'appartement (React + Vite + GSAP + Lenis).

```bash
npm install
npm run dev       # http://localhost:5180
npm run build     # → dist/ (site statique, déployable partout)
npm run images    # régénère les images optimisées après ajout/remplacement d'une photo
npm run deploy    # publie sur https://kemetedassociation.github.io/residence-les-cerfs/
```

Les photos sources pleine résolution (`src-assets/`) ne sont pas dans le dépôt GitHub : elles restent sur cet ordinateur.

## Modifier le contenu sans toucher au moteur

| Quoi | Fichier |
|---|---|
| Nom, slogan, contact, prix, réseaux, **lien de réservation (`BOOKING_URL`)** | `src/data/site.js` |
| Parcours de la visite : ordre des scènes, photos, textes, hotspots, passages | `src/data/scenes.js` |
| Sections Appartement, Expérience, Châtel, Réservation | `src/data/content.js` |
| SEO (title, description, Open Graph, Schema.org) | `index.html` |

`BOOKING_URL` vide → le bouton « Réserver » ouvre un e-mail de demande. Mettre l'URL Airbnb / Booking / moteur de réservation pour le rediriger.

## Ajouter ou remplacer une photo

1. Déposer le fichier dans `src-assets/interior/` (appartement) ou `src-assets/chatel/` (environnement).
2. `npm run images` (génère les WebP 640→2400 px dans `public/img/`).
3. Référencer la clé `interior/nom-du-fichier` dans `scenes.js` ou `content.js`.

Hotspots : `x` / `y` sont en **% de la photo** (0,0 = coin haut gauche). Un hotspot avec `target` devient un passage vers une autre scène ; hors cadre (mobile), il est épinglé au bord de l'écran.

## Photos

- Intérieur : photos réelles de l'appartement (`../interieur`). Deux photos en lumière du jour (`repas`, `chambre-2`) reçoivent un léger réchauffement colorimétrique, rien d'autre.
- Châtel / extérieur : photos réelles de Wikimedia Commons sous licences CC BY / CC BY-SA — les crédits sont affichés en pied de page (obligatoire, ne pas retirer). Liste : `src/data/credits.json`.
