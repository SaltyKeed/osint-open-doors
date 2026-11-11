# Budget des services payants

Ce document présente les services payants utiles au projet, leur coût et la
raison de chaque dépense. Il est préparé pour être défendu auprès de
l'enseignant responsable (voir `DECISIONS.md`, D12). Aucun service n'est
souscrit avant l'acceptation du budget.

## Ce que permettent les services gratuits

| Service | Recherche | Limite |
|---|---|---|
| XposedOrNot | Fuites par email | Renvoie seulement le nom des fuites, pas de recherche par téléphone ou pseudo |
| search.ch | Annuaire par téléphone ou nom | 1000 recherches par mois |
| Tavily | Recherche web et presse | 1000 crédits par mois |

Avec les services gratuits, un visiteur peut savoir si son email est dans une
fuite connue et ce qu'on trouve sur lui dans l'annuaire et sur le web. Il ne
peut pas savoir si son numéro de téléphone ou son pseudo apparaît dans une
fuite, ni quelles données précises ont été exposées. C'est pourtant ce qui
montre le mieux le risque réel.

## Services payants envisagés

Les prix viennent des pages des services ou de comparatifs consultés le
2026-11-11. Ils sont en dollars américains et doivent être vérifiés sur la page
officielle le jour de la demande.

| Service | Ce qu'il apporte | Prix | Source du prix |
|---|---|---|---|
| Have I Been Pwned (Pwned 1) | Fuites par email, base de référence, plus complète que XposedOrNot | Environ 4 à 5.30 par mois | Comparatifs tiers |
| LeakCheck (Monthly) | Fuites par email, pseudo et téléphone, 200 recherches par jour | 9.99 par mois | Page officielle |
| Dehashed | Fuites par email, nom, téléphone, pseudo, adresse | 21.99 par mois, plus environ 0.02 par requête API | Comparatifs tiers |
| Snusbase | Même usage que Dehashed | Prix non publié (estimé 5 à 16 par mois) | Comparatifs tiers |
| Tavily (au-delà du gratuit) | Recherches web supplémentaires | 0.008 par crédit | Page officielle |

Snusbase n'est pas retenu dans les scénarios : son prix n'est pas public, il
est donc impossible de le budgéter.

## Hypothèses

- Environ 200 visiteurs pendant les portes ouvertes (à confirmer avec l'école).
- Jusqu'à 11 crédits Tavily par visiteur qui remplit tous les champs (D16,
  D18 : email 1, téléphone 2, nom 8 avec la localité), soit environ 2200
  crédits pour la journée, plus environ 400 pour les tests : environ 2600
  crédits, dont 1000 gratuits.
- Les abonnements sont pris uniquement pour la durée nécessaire : un mois de
  développement et de tests, puis le mois des portes ouvertes.
- Les abonnements sont résiliés après l'événement.

## Scénarios

| Scénario | Contenu | Coût estimé |
|---|---|---|
| A. Gratuit | XposedOrNot, search.ch, Tavily gratuit (environ 90 visiteurs complets par mois) | 0 |
| B. Recommandé | A, plus Have I Been Pwned et LeakCheck pendant 2 mois, plus une réserve Tavily | Environ 43 |
| C. Complet | B, plus Dehashed pendant 1 mois avec des crédits API | Environ 85 |

Détail du scénario B :

| Poste | Calcul | Montant |
|---|---|---|
| Have I Been Pwned | 2 mois x 5.30 | 10.60 |
| LeakCheck | 2 mois x 9.99 | 19.98 |
| Réserve Tavily | environ 1600 crédits au-delà du gratuit x 0.008 | 12.80 |
| Total | | environ 43 |

Détail du scénario C :

| Poste | Calcul | Montant |
|---|---|---|
| Scénario B | | 43 |
| Dehashed, abonnement | 1 mois x 21.99 | 21.99 |
| Dehashed, crédits API | environ 1000 requêtes x 0.02 | 20.00 |
| Total | | environ 85 |

Une marge d'environ 10 % est à prévoir pour le taux de change et la TVA.

## Pourquoi le scénario B

- Il couvre les trois saisies du formulaire (email, téléphone, nom) et ajoute
  la recherche par pseudo.
- LeakCheck a un prix public, un nombre de recherches suffisant (200 par jour)
  et accepte le téléphone et le pseudo.
- Have I Been Pwned est la référence pour les fuites par email et ne renvoie
  aucune donnée en clair.
- Le coût reste faible et limité dans le temps.

Le scénario C n'apporte un plus que pour la recherche par nom et par adresse.
Il double le coût pour un gain limité, car la règle anti-homonymes empêche de
détailler la plupart des résultats trouvés par nom.

## Garanties

- Les services sont interrogés uniquement avec les données d'un visiteur qui
  a donné son consentement.
- Aucune réponse n'est stockée. Les mots de passe et les hash ne sont jamais
  affichés (liste blanche dans les mappers).
- Les clés API restent sur le poste, dans un fichier non versionné.
- Les conditions d'utilisation de chaque service sont relues avant la
  souscription, pour vérifier qu'elles autorisent notre usage.

## Questions à régler avec l'école

- Nombre de visiteurs attendus et date des portes ouvertes.
- Moyen de paiement (carte de l'école ou remboursement) et justificatifs.
- Adresse email utilisée pour créer les comptes (adresse de l'école de
  préférence).
- Confirmation écrite du cadre décrit dans D12.
