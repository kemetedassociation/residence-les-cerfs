# Réservation directe — mise en service

Le site sait déjà tout faire : calendrier synchronisé avec Airbnb, calcul du prix, acompte de 30 % par Stripe, prélèvement automatique du solde 30 jours avant l'arrivée, export des réservations vers Airbnb.
Il manque seulement les comptes de la Résidence Les Cerfs. Tant qu'ils ne sont pas branchés, le bouton « Réserver » mène à l'annonce Airbnb, comme avant.

Aperçu sans paiement : ajouter `?demo=reservation` à l'adresse du site.

---

## 1. Compte Stripe (≈ 20 min)

1. Créer le compte sur **stripe.com** avec `cerf74390@gmail.com`.
2. **Activer les paiements** : renseigner la société de Châtel (numéro SIREN du Kbis), le représentant légal et l'**IBAN du compte bancaire de la location**.
3. Dans Stripe : **Paramètres → E-mails clients** → cocher « Paiements réussis » (le voyageur reçoit son reçu).
4. **Développeurs → Clés API** : copier la **clé secrète de test** (`sk_test_…`). On commence en test, on passera en réel à l'étape 6.

## 2. Compte Supabase (≈ 5 min)

1. Créer le compte sur **supabase.com** avec `cerf74390@gmail.com` (offre gratuite).
2. **New project** : nom `residence-les-cerfs`, région **Paris (eu-west-3)**, choisir un mot de passe de base de données et le garder.
3. Noter l'**identifiant du projet** : c'est la partie `abcdefgh` de l'adresse `https://abcdefgh.supabase.co` (Project Settings → General → Reference ID).
4. **Account → Access Tokens** → *Generate new token* → copier le jeton (`sbp_…`).

## 3. Lien du calendrier Airbnb (≈ 2 min)

Airbnb → **Annonces** → l'annonce de Châtel → **Disponibilités** → **Synchroniser les calendriers** (ou « Connecter à un autre site ») → **Exporter le calendrier** → copier le lien (`https://www.airbnb.fr/calendar/ical/….ics?s=…`).

## 4. Brancher (1 commande)

Créer un fichier `.env` à la racine du dossier `site` (il n'est jamais publié) :

```
SUPABASE_ACCESS_TOKEN=sbp_…
SUPABASE_PROJECT_REF=abcdefgh
STRIPE_SECRET_KEY=sk_test_…
AIRBNB_ICAL_URL=https://www.airbnb.fr/calendar/ical/….ics?s=…
```

Puis :

```bash
npm run setup:booking
npm run deploy
```

Le script installe la base, crée le webhook Stripe, déploie le serveur, programme le prélèvement quotidien des soldes et branche le site. Il affiche à la fin **un lien à coller dans Airbnb**.

## 5. Synchroniser dans l'autre sens (Airbnb ← site)

Airbnb → Disponibilités → Synchroniser les calendriers → **Importer un calendrier** → coller le lien affiché par le script, nom « Site Les Cerfs ».
Airbnb bloque alors les dates réservées sur le site. Airbnb relit ce lien toutes les 2 à 3 heures environ ; le site, lui, relit Airbnb à chaque consultation (au plus toutes les 10 minutes) et juste avant chaque paiement.

## 6. Tester, puis passer en réel

- Réserver sur le site avec la carte de test **4242 4242 4242 4242**, date future quelconque, code 123.
- Vérifier dans Stripe (mode test) le paiement, et dans Supabase → *Table editor* → `bookings` la ligne `confirmed`.
- Pour passer en réel : remplacer `STRIPE_SECRET_KEY` par la clé `sk_live_…`, relancer `npm run setup:booking` puis `npm run deploy`.

**Avant le passage en réel**, à compléter :
- les vrais tarifs dans `supabase/functions/_shared/pricing.json` (les montants actuels sont provisoires) ;
- la taxe de séjour (`touristTax`, à confirmer avec la mairie de Châtel) ;
- les conditions de réservation et d'annulation dans `src/data/content.js` (`BOOKING_TERMS`, brouillon à valider).

Après un changement de tarifs : `npm run setup:booking` (redéploie le serveur) puis `npm run deploy` (site).

---

## Au quotidien : l'espace propriétaire

Adresse : **https://kemetedassociation.github.io/residence-les-cerfs/admin/** — mot de passe dans le fichier `.env` (`ADMIN_PASSWORD`).

| Besoin | Dans l'espace propriétaire |
|---|---|
| Voir les réservations, coordonnées des voyageurs, montants encaissés | Onglets *À venir*, *Passées*, *Annulées* |
| Annuler une réservation | « Annuler la réservation » : le remboursement prévu par les conditions est proposé ; vous pouvez tout rembourser, ne rien rembourser ou choisir un montant. Stripe rembourse aussitôt, les dates se libèrent sur le site et sur Airbnb. |
| Un solde a été refusé par la banque | Alerte en haut de page : « Prélever le solde maintenant », ou « Lien de paiement du solde » à envoyer au voyageur (bouton e-mail prêt), ou « Solde réglé hors site » |
| Bloquer des dates pour vous ou pour travaux | *Dates bloquées* : elles disparaissent du calendrier du site et sont transmises à Airbnb |
| Vérifier la synchronisation Airbnb | Section *Synchronisation* (dernière lecture, erreur éventuelle) |

Les paiements, reçus et virements restent consultables dans Stripe. Stripe envoie automatiquement un reçu au voyageur pour l'acompte et pour le solde.

Après un changement de tarifs (`supabase/functions/_shared/pricing.json`) ou de conditions (`src/data/legal.js`) : `npm run setup:booking` puis `npm run deploy`.

## Ce qui est garanti

- Le prix est **recalculé par le serveur** : impossible de payer moins en modifiant la page.
- Deux réservations ne peuvent **jamais** partager une nuit (contrainte en base, même si deux personnes paient à la même seconde). Si un paiement arrive pour des dates prises entre-temps, il est **remboursé automatiquement**.
- Pendant le paiement, les dates sont bloquées 30 minutes ; si le voyageur abandonne, elles se libèrent.
- Une synchro Airbnb en échec ne libère jamais de dates (les dernières dates connues restent bloquées).
- Limite connue de tout système iCal : entre deux lectures d'Airbnb (2-3 h), une même date pourrait être réservée des deux côtés. Le site relit Airbnb juste avant chaque paiement, ce qui réduit ce risque côté site.
