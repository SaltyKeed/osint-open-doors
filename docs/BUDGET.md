# Budget des services payants

Ce document présente les services payants utiles au projet, leur coût et la
raison de chaque dépense. Il est préparé pour être défendu auprès de
l'enseignant responsable (voir `DECISIONS.md`, D12). Aucun service n'est
souscrit avant l'acceptation du budget.

## Ce que permettent les services gratuits

| Service | Recherche | Limite |
| --- | --- | --- |
| Hudson Rock | Ordinateurs infectés par email ou pseudo | Résumé seulement, sans les identifiants volés |
| Catalogue HIBP | Description des fuites connues | Ne cherche pas une personne |
| search.ch | Annuaire par téléphone ou nom | 1000 recherches par mois |
| Tavily | Recherche web et presse | 1000 crédits par mois |

Avec les services gratuits, un visiteur peut savoir si son email est dans une
fuite connue et ce qu'on trouve sur lui dans l'annuaire et sur le web. Il ne
peut pas savoir si son numéro de téléphone ou son pseudo apparaît dans une
fuite, ni quelles données précises ont été exposées. C'est pourtant ce qui
montre le mieux le risque réel.

## Services payants retenus (D20, D24)

Les prix ont été relevés le 2026-11-16 (`SOURCES.md`). Les services de fuites
ont été choisis d'après leur couverture mesurée (D23, D24) : chacun apporte
des fuites que les autres n'ont pas.

| Service | Ce qu'il apporte | Prix | Source du prix |
| --- | --- | --- | --- |
| LeakCheck (Monthly) | Fiches de fuites ; le plus à jour sur 2026 (Pandabuy, Ticketek, Paidwork) | 9.99 USD par mois | Page officielle |
| Leak-Lookup (API privée) | Fiches de fuites ; plus grande couverture des fuites anciennes (4776 bases) | Sur devis | Page officielle, devis à demander |
| Snusbase | Fiches de fuites ; environ 900 bases absentes de Leak-Lookup ; jokers | Non publié, dès 6.49 USD par semaine | Source tierce, à relever à la création du compte |
| HackCheck (Diamond) | Fiches de fuites par email, pseudo, nom, IP, téléphone ; liste non publiée | 39.49 USD par mois ; 15 % de réduction avec une adresse scolaire | Page officielle |
| Have I Been Pwned (Core 1) | Présence de l'email dans les fuites récentes et les données de la police | 4.39 USD par mois | Page officielle |
| LeakRadar (Enterprise) | Infostealers, combolists Telegram et dark web | 58.33 EUR par mois | Page officielle |
| Brave Search API | Second moteur de recherche | 5 USD par 1000 requêtes, 5 USD offerts par mois | Page officielle |
| Tavily (au-delà du gratuit) | Moteur de recherche principal | 0.008 USD par crédit ; 1000 crédits gratuits par mois ; gratuit pour les étudiants sur demande | Page officielle |

## Hypothèses

- Portes ouvertes en janvier 2027, environ 200 visiteurs (à confirmer avec
  l'école).
- L'enquête n'a pas de limite de durée ni de profondeur (D19) : environ 15
  recherches web par visiteur.
- Tous les abonnements sur 2 mois : décembre pour le développement, janvier
  pour la démo. Ils sont résiliés après l'événement.

## Budget demandé

| Poste | Calcul | Montant (USD) |
| --- | --- | --- |
| LeakCheck | 2 mois x 9.99 | 19.98 |
| Leak-Lookup | 2 mois, sur devis | à relever |
| Snusbase | 2 mois, prix à relever (environ 4 x 6.49 par semaine selon la source tierce) | environ 52 |
| HackCheck | 2 mois x 39.49 (avant réduction scolaire) | 78.98 |
| Have I Been Pwned | 2 mois x 4.39 | 8.78 |
| LeakRadar | 2 mois x 58.33 EUR | environ 126 |
| Brave Search API | environ 3000 requêtes par mois x 0.005, moins 5 offerts, sur 2 mois | 20.00 |
| Tavily | environ 2000 crédits au-delà du gratuit x 0.008 (0 si l'offre étudiante est accordée) | 16.00 |
| Total sans Leak-Lookup | | environ 322 |

Les montants en euros sont convertis à environ 1.08 USD pour 1 EUR. Une marge
d'environ 10 % est à prévoir pour le taux de change et la TVA. Le total est à
faire accepter par l'enseignant avant tout achat.

## Pourquoi ces services

- LeakCheck, Leak-Lookup et Snusbase se complètent : réunis, ils couvrent 80 %
  des fuites connues avant 2019 et 59 % de celles de 2023 à 2026 (D24).
- HackCheck ne publie pas sa liste : il est pris pour tenter de couvrir des
  fuites récentes encore manquantes (Hot Topic, Suno, Dell…).
- LeakRadar Enterprise est la seule source mesurable pour les combolists
  diffusées sur Telegram de 2024 à 2026.
- Have I Been Pwned signale aussi les fuites que seul HIBP a reçues (données
  saisies par la police, compilations de chercheurs).
- Brave a un index différent de Tavily : il trouve des pages (LinkedIn, presse,
  sport) que Tavily rate.

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
