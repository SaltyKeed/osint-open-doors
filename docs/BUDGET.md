# Budget des services payants

Ce document présente les services payants utiles au projet, leur coût et la
raison de chaque dépense. Il est préparé pour être défendu auprès de
l'enseignant responsable (voir `DECISIONS.md`, D12). Aucun service n'est
souscrit avant l'acceptation du budget.

## Ce que permettent les services gratuits

| Service | Recherche | Limite |
| --- | --- | --- |
| XposedOrNot | Fuites par email | Renvoie seulement le nom des fuites, pas de recherche par téléphone ou pseudo |
| search.ch | Annuaire par téléphone ou nom | 1000 recherches par mois |
| Tavily | Recherche web et presse | 1000 crédits par mois |

Avec les services gratuits, un visiteur peut savoir si son email est dans une
fuite connue et ce qu'on trouve sur lui dans l'annuaire et sur le web. Il ne
peut pas savoir si son numéro de téléphone ou son pseudo apparaît dans une
fuite, ni quelles données précises ont été exposées. C'est pourtant ce qui
montre le mieux le risque réel.

## Services payants retenus (D20)

Les prix ont été relevés le 2026-11-16 (`SOURCES.md`). Ils sont en dollars
américains et doivent être vérifiés sur la page officielle le jour de l'achat.

| Service | Ce qu'il apporte | Prix | Source du prix |
| --- | --- | --- | --- |
| LeakCheck (Monthly) | Fiches de fuites par email, pseudo, téléphone ; 200 recherches par jour | 9.99 par mois | Page officielle |
| Snusbase | Fiches de fuites par email, nom, pseudo, IP, téléphone ; API jusqu'à 2048 requêtes par jour | Non publié, à relever à la création du compte | Page officielle |
| DeHashed (Professional) | Fiches de fuites par email, nom, adresse, téléphone, IP ; seule offre avec l'API | 179.99 par mois, plus environ 0.02 par requête | Source tierce (OSINTBench, 2026-04-02) |
| Have I Been Pwned (Core 1) | Fuites par email avec description fiable | 4.39 par mois (facturation annuelle) | Page officielle |
| Brave Search API | Second moteur de recherche | 5 par 1000 requêtes, 5 offerts par mois | Page officielle |
| Tavily (au-delà du gratuit) | Moteur de recherche principal | 0.008 par crédit ; 1000 crédits gratuits par mois ; gratuit pour les étudiants sur demande | Page officielle |

## Hypothèses

- Portes ouvertes en janvier 2027, environ 200 visiteurs (à confirmer avec
  l'école).
- L'enquête n'a pas de limite de durée ni de profondeur (D19) : le nombre de
  requêtes par visiteur est estimé à environ 15 recherches web.
- LeakCheck, Snusbase et Have I Been Pwned : 2 mois (décembre pour le
  développement, janvier pour la démo).
- DeHashed : 1 mois seulement (janvier), à cause de son prix. Son adaptateur
  est écrit en décembre d'après la documentation, puis vérifié au début de
  janvier.
- Les abonnements sont résiliés après l'événement.

## Budget demandé

| Poste | Calcul | Montant (USD) |
| --- | --- | --- |
| LeakCheck | 2 mois x 9.99 | 19.98 |
| Snusbase | 2 mois x prix à relever | à relever |
| DeHashed, abonnement | 1 mois x 179.99 | 179.99 |
| DeHashed, crédits API | environ 1000 requêtes x 0.02 | 20.00 |
| Have I Been Pwned | 2 mois x 4.39 | 8.78 |
| Brave Search API | environ 3000 requêtes x 0.005, moins 5 offerts | 10.00 |
| Tavily | environ 2000 crédits au-delà du gratuit x 0.008 (0 si l'offre étudiante est accordée) | 16.00 |
| Total sans Snusbase | | environ 255 |

Une marge d'environ 10 % est à prévoir pour le taux de change et la TVA. Le
total dépasse 150 CHF, comme validé en D19 ; il est à faire accepter par
l'enseignant avant tout achat.

## Pourquoi ces services

- Les fiches de fuites sont la seule source du contenu des fuites (adresse,
  téléphone, date de naissance, mot de passe). Trois bases différentes
  trouvent plus de fuites qu'une seule.
- DeHashed est le seul à chercher par nom et par adresse ; c'est le poste le
  plus cher, il n'est donc pris que pour le mois de la démo.
- Brave a un index différent de Tavily : il trouve des pages (LinkedIn, presse,
  sport) que Tavily rate.
- Have I Been Pwned donne une description fiable de chaque fuite par email.

## Garanties

- Les services sont interrogés uniquement avec les données d'un visiteur qui
  a donné son consentement.
- Aucune réponse n'est stockée. Les mots de passe et les hash sont masqués et
  affichés seulement avec le bouton « œil » (D19).
- Les clés API restent sur le poste, dans un fichier non versionné.
- Les conditions d'utilisation de chaque service sont relues avant la
  souscription, pour vérifier qu'elles autorisent notre usage.

## Questions à régler avec l'école

- Nombre de visiteurs attendus.
- Moyen de paiement (carte de l'école ou remboursement) et justificatifs.
- Adresse email utilisée pour créer les comptes (adresse de l'école de
  préférence).
- Confirmation écrite du cadre décrit dans D12.
