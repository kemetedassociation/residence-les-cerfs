# Intégration Stripe Checkout — Résidence Les Cerfs

Le site créait déjà ses sessions Checkout à deux endroits (scénario A) : l'acompte ou le paiement complet à la réservation, et le lien de paiement manuel du solde. Seuls les paramètres de ces deux appels ont été modifiés pour suivre la configuration Checkout Studio. Aucun fichier, route ou fonction n'a été ajouté.

## Values to Replace

Aucune valeur provisoire à remplacer. Les paramètres `sample_only` existaient déjà avec de vraies valeurs et ont été conservés.

**Files containing placeholders:**
- Aucun. Pour référence : [supabase/functions/book/index.ts](supabase/functions/book/index.ts) et [supabase/functions/_shared/balance.ts](supabase/functions/_shared/balance.ts).

| Field | Current Value | What to Set |
|-------|--------------|-------------|
| mode | `payment` | Déjà correct : séjours payés en une fois (acompte puis solde), pas d'abonnement. |
| success_url | `${SITE_URL}/?reservation=confirmee&session_id={CHECKOUT_SESSION_ID}#reserver` (réservation), `${SITE_URL}/?reservation=solde#reserver` (solde) | Déjà correct. Vérifier le secret `SITE_URL`. |
| cancel_url | `${SITE_URL}/?reservation=annulee#reserver` (réservation), `${SITE_URL}/` (solde) | Déjà correct. |
| line_items | `price_data` calculé à partir de `pricing.json` (montant du séjour) | Déjà correct : pas besoin de Price ID, le prix dépend des dates. |

## Configured Parameters

Ces paramètres ont été configurés dans Checkout Studio et sont en place dans les deux appels.

**Files containing these parameters:**
- [supabase/functions/book/index.ts](supabase/functions/book/index.ts)
- [supabase/functions/_shared/balance.ts](supabase/functions/_shared/balance.ts)

| Parameter | Value |
|-----------|-------|
| ui_mode | `hosted` (SDK `npm:stripe@17` = 17.7.0, donc < 21.0.0) |
| billing_address_collection | `auto` |
| phone_number_collection | `{ enabled: true }` |
| automatic_tax | `{ enabled: false }` |
| allow_promotion_codes | `false` |
| submit_type | `auto` |
| name_collection | `individual` et `business` : `{ enabled: true, optional: true }` |
| saved_payment_method_options | `{ payment_method_save: "enabled" }` (voir exception ci-dessous) |
| integration_identifier | `hosted_mobile_app_0001` |
| origin_context | `web` (Studio proposait `mobile_app` ; passé à `web` le 26/10/2026, les voyageurs paient depuis le site) |

**Exception volontaire (réservation avec acompte)** : dans `book/index.ts`, `saved_payment_method_options` n'est envoyé que pour un paiement complet. Quand il reste un solde, la session utilise déjà `payment_intent_data.setup_future_usage: 'off_session'` pour garder la carte et prélever le solde automatiquement. Stripe accepte les deux paramètres ensemble (vérifié le 25/10/2026), mais avec `payment_method_save` le voyageur pourrait décocher l'enregistrement de sa carte, ce qui ferait échouer le prélèvement du solde.

**Non inclus** : `payment_method_collection` (`always`), parce que Stripe ne l'accepte qu'en mode `subscription`.

**Conservés, bien qu'absents de la configuration Studio** : `locale`, `payment_method_types: ['card']`, `customer` / `customer_email` / `customer_creation`, `payment_intent_data`, `metadata` et `expires_at`. Ils font tourner la réservation : blocage des dates pendant 30 min, carte uniquement, rattachement au dossier dans Supabase, prélèvement du solde. Les supprimer casserait le parcours de réservation.

## À vérifier avant la mise en ligne

1. **Version de l'API** : le client Stripe est figé sur `apiVersion: '2025-02-24.acacia'` dans [supabase/functions/_shared/common.ts](supabase/functions/_shared/common.ts). **Vérifié le 25/10/2026** : avec cette version et la clé réelle, Stripe accepte tous les paramètres Studio (sessions de contrôle à 1 €, expirées aussitôt, aucun débit).
2. **Types TypeScript** : les types du SDK 17 ne connaissent pas ces paramètres. Si une vérification de types est lancée (`deno check`), elle signalera ces champs. Supabase ne vérifie pas les types au déploiement par défaut, mais à garder en tête.
3. **`origin_context`** : réglé sur `web`, puisque les voyageurs réservent depuis un navigateur.
4. **`payment_method_save` sur le lien de solde** : il s'appuie sur le client Stripe enregistré à la réservation (`stripe_customer_id`). Pour un ancien dossier sans client Stripe, vérifier que la session se crée bien.
5. **Champs en double** : le formulaire du site demande déjà le nom et le téléphone. Avec `phone_number_collection` et `name_collection`, Stripe les redemandera sur sa page de paiement.

## Setup and next steps

### Secrets Supabase (déjà utilisés par le code)

- `STRIPE_SECRET_KEY` : clé `sk_test_…` ou `sk_live_…`, sur https://dashboard.stripe.com/apikeys
- `STRIPE_WEBHOOK_SECRET` : secret `whsec_…` du webhook Stripe
- `SITE_URL` : adresse publique du site (URLs de retour)

Aucune clé publique `VITE_` n'est nécessaire : la page Checkout est hébergée par Stripe. Pour la configuration complète, voir [RESERVATION.md](RESERVATION.md).

### Fichiers modifiés

- [supabase/functions/book/index.ts](supabase/functions/book/index.ts) : paramètres Studio sur la session de réservation
- [supabase/functions/_shared/balance.ts](supabase/functions/_shared/balance.ts) : paramètres Studio sur le lien de paiement du solde
- `STRIPE_INTEGRATION_TODO.md` : ce fichier

### Fonctionnement

1. Le voyageur remplit le formulaire. La fonction `book` bloque les dates 30 min et crée une session Checkout pour l'acompte (ou le montant total).
2. Il paie sur la page Stripe et revient sur `?reservation=confirmee`.
3. Le webhook confirme la réservation. La carte est gardée pour prélever le solde automatiquement à l'échéance.
4. Si le prélèvement échoue, `balanceLink` génère une page Checkout valable 23 h pour que le voyageur paie le solde lui-même.

### Tests

- Cartes de test : `4242 4242 4242 4242` (réussite), `4000 0025 0000 3155` (3D Secure), `4000 0000 0000 9995` (refus). N'importe quelle date future et n'importe quel CVC.
- Tester les deux cas : séjour avec acompte (solde à prélever) et séjour payé en totalité.
- `npm test` : les tests passent, mais ils ne couvrent pas les appels Stripe.

### Prochaines étapes

- Déployer les fonctions (`npm run deploy`) puis faire une réservation complète en mode test.
- Passer aux clés live et au webhook de production.

### Ressources

- https://support.stripe.com
- https://docs.stripe.com/mcp
