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

## Services payants retenus (D20, D23)

Les prix ont été relevés le 2026-11-16 (`SOURCES.md`). Les doublons ont été
retirés en D22 ; la couverture mesurée en D23 a fait revenir Leak-Lookup et
Have I Been Pwned.

| Service | Ce qu'il apporte | Prix | Source du prix |
| --- | --- | --- | --- |
| Leak-Lookup (API privée) | Fiches de fuites par email, pseudo, IP, téléphone, nom complet ; 4776 bases, la plus grande couverture mesurée | Sur devis | Page officielle, devis à demander |
| Have I Been Pwned (Core 1) | Présence de l'email dans les fuites récentes absentes des services à fiches | 4.39 USD par mois | Page officielle |
| Snusbase | Fiches de fuites par email, pseudo, nom, IP, mot de passe, avec jokers ; 2251 bases, dont environ 900 absentes de Leak-Lookup | Non publié, dès 6.49 USD par semaine | Source tierce, à relever à la création du compte |
| LeakCheck (Monthly) | Fiches de fuites par email, pseudo, téléphone ; couverture inconnue | 9.99 USD par mois | Page officielle |
| LeakRadar (Starter) | Identifiants volés par un infostealer, avec le site concerné | 25 EUR par mois | Page officielle |
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
| Leak-Lookup | 2 mois, sur devis | à relever |
| Have I Been Pwned | 2 mois x 4.39 | 8.78 |
| Snusbase | 2 mois, prix à relever (environ 4 x 6.49 par semaine selon la source tierce) | environ 52 |
| LeakCheck | 2 mois x 9.99 | 19.98 |
| LeakRadar | 2 mois x 25 EUR | environ 54 |
| Brave Search API | environ 3000 requêtes par mois x 0.005, moins 5 offerts, sur 2 mois | 20.00 |
| Tavily | environ 2000 crédits au-delà du gratuit x 0.008 (0 si l'offre étudiante est accordée) | 16.00 |
| Total sans Leak-Lookup | | environ 171 |

Les montants en euros sont convertis à environ 1.08 USD pour 1 EUR. Une marge
d'environ 10 % est à prévoir pour le taux de change et la TVA. Le total est à
faire accepter par l'enseignant avant tout achat.

## Pourquoi ces services

- Leak-Lookup a la plus grande couverture mesurée (D23) et cherche aussi par
  téléphone et par nom complet.
- Snusbase contient environ 900 bases absentes de Leak-Lookup.
- LeakCheck peut contenir d'autres fuites ; sa couverture n'est pas publiée.
- Have I Been Pwned signale les fuites récentes qu'aucun service à fiches n'a.
- LeakRadar donne le contenu des journaux d'infostealers ; Hudson Rock, gratuit,
  n'en donne qu'un résumé.
- Brave a un index différent de Tavily : il trouve des pages (LinkedIn, presse,
  sport) que Tavily rate.
- Les autres services recensés en D21 sont des doublons de ceux-ci (D22,
  D23).

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
