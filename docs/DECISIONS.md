# Décisions du projet

Ce fichier garde la trace des choix faits pendant le projet : les options
comparées, l'option retenue et la raison. L'architecture qui en résulte est
décrite dans `ARCHITECTURE.md`.

Une nouvelle décision s'ajoute à la fin, avec un numéro et une date. Une
décision remplacée n'est pas supprimée : elle est marquée « remplacée par Dn ».

Statuts possibles : ouverte (en discussion, aucune option retenue), retenue,
remplacée par Dn. Sans mention de statut, une décision est retenue.

## Critères généraux

Les choix de stack ont été faits selon trois critères :

1. Une seule codebase pour le front et le serveur, car la clé API doit rester
   côté serveur.
2. Une mise en place rapide et une interface soignée pour les visiteurs.
3. Un intérêt pour notre formation : des outils standards, bien documentés et
   réutilisables après le projet.

## D1. Framework (front et serveur)

Date : 2026-11-10

| Option | Avantages | Inconvénients |
| --- | --- | --- |
| **Next.js (App Router) (retenu)** | Front et API dans un seul projet ; rendu serveur natif, la clé n'est jamais envoyée au navigateur ; écosystème très large ; très demandé en entreprise ; mode `standalone` adapté à Docker. | Courbe d'apprentissage (Server et Client Components, cache) ; beaucoup de comportements implicites ; lié à l'écosystème Vercel. |
| Vite + React + Express | Simple, explicite, séparation front/back claire et pédagogique. | Deux projets à configurer, à faire communiquer (CORS ou proxy) et à dockeriser ; plus de code d'infrastructure. |
| SvelteKit | Agréable à écrire, moins de code, performant ; front et serveur intégrés. | Écosystème plus petit (composants, ressources) ; moins demandé sur le marché suisse. |
| Nuxt (Vue) | Équivalent Vue de Next.js, syntaxe accessible. | Écosystème de composants moins riche que celui de React. |
| Astro | Adapté aux sites de contenu, très léger. | Pensé pour du contenu statique ; peu adapté à une application interactive. |
| Python (FastAPI) + front séparé | Python est souvent mieux connu et adapté au traitement de données. | Deux langages et deux projets ; une interface soignée demande quand même un framework JS. |

Next.js est retenu parce qu'il est la seule option qui réunit un projet unique,
une clé gardée côté serveur sans configuration particulière et le plus grand
écosystème de composants UI. L'alternative envisagée est Vite + React +
Express, plus explicite mais qui demande plus de code.

## D2. Langage

Date : 2026-11-10

| Option | Avantages | Inconvénients |
| --- | --- | --- |
| **TypeScript strict (retenu)** | Erreurs détectées avant l'exécution ; garantit qu'un type « brut » (avec mot de passe) ne peut pas atteindre l'UI ; autocomplétion. | Un peu plus verbeux ; les erreurs de typage peuvent être difficiles à comprendre au début. |
| JavaScript | Aucune configuration. | Rien n'empêche de passer `rawRecord.password` à un composant par erreur, ce qui n'est pas acceptable avec des données sensibles. |

TypeScript en mode strict est retenu parce que le système de types sert aussi
de protection pour la sécurité, et pas seulement de confort de développement.

## D3. UI et style

Date : 2026-11-10

| Option | Avantages | Inconvénients |
| --- | --- | --- |
| **Tailwind + shadcn/ui (retenu)** | Le code des composants est copié dans le projet (lisible, modifiable) ; accessible (Radix) ; design moderne par défaut. | HTML chargé de classes ; apparence « shadcn » courante, à personnaliser. |
| MUI (Material UI) | Très complet. | Apparence « Google » difficile à personnaliser ; lourd ; ne permet pas d'apprendre le CSS. |
| Chakra UI / Mantine | Rapides à prendre en main, bonne documentation. | Composants peu modifiables, moins de contrôle. |
| CSS Modules / CSS pur | Permet de vraiment apprendre le CSS ; aucune dépendance. | Beaucoup plus long pour obtenir un rendu soigné ; tout est à coder (modales, accessibilité…). |
| Bootstrap | Connu, simple. | Apparence datée. |

Tailwind et shadcn/ui sont retenus parce qu'ils permettent d'obtenir
rapidement une interface soignée tout en gardant un code que nous comprenons,
puisque les composants font partie du projet. La solution de repli est Mantine.

## D4. Animations

Date : 2026-11-10

| Option | Avantages | Inconvénients |
| --- | --- | --- |
| **Framer Motion (Motion) (retenu)** | API déclarative simple ; animations en cascade faciles à écrire. | Augmente la taille du bundle (négligeable en local). |
| Animations CSS / Tailwind | Aucune dépendance, performant. | Fastidieux pour enchaîner des animations. |
| GSAP | Très complet (timelines complexes). | Trop puissant pour nos besoins ; API impérative moins naturelle en React. |

Framer Motion est retenu parce qu'il permet de réaliser les animations prévues
(scan, cartes qui apparaissent une par une) avec peu de code.

## D5. Validation des données

Date : 2026-11-10

| Option | Avantages | Inconvénients |
| --- | --- | --- |
| **zod (retenu)** | Un même schéma fournit la validation à l'exécution et le type TypeScript ; très répandu. | Un peu plus lourd que Valibot. |
| Valibot | Même principe, beaucoup plus léger. | Moins répandu, moins d'exemples. |
| Validation manuelle | Aucune dépendance. | Verbeux, oublis fréquents, types et validation désynchronisés. |

zod est retenu parce que les réponses de Snusbase et Dehashed sont des données
que nous ne contrôlons pas. Si leur format change, l'application rejette la
réponse au lieu d'afficher des informations incorrectes.

## D6. Tests

Date : 2026-11-10

| Option | Avantages | Inconvénients |
| --- | --- | --- |
| **Vitest (retenu)** | Rapide, presque aucune configuration, TypeScript natif ; API compatible avec Jest. | Un peu moins de ressources disponibles que pour Jest. |
| Jest | Le plus connu. | Configuration TypeScript/ESM pénible, plus lent. |
| Playwright (E2E) | Teste le parcours complet dans un vrai navigateur. | Plus lent ; à ajouter plus tard en complément. |

Vitest est retenu pour les tests. Playwright pourra être ajouté plus tard pour
tester le parcours complet.

## D7. Exécution et déploiement

Date : 2026-11-10

| Option | Avantages | Inconvénients |
| --- | --- | --- |
| **Docker compose en local (retenu)** | Reproductible sur n'importe quel PC ; `read_only` garantit l'absence de stockage ; aucune donnée n'est envoyée à un hébergeur. | Docker Desktop doit être installé sur le PC de l'école (droits administrateur). |
| `npm run start` direct | Le plus simple. | Dépend de la configuration du poste ; pas d'isolation. |
| Vercel / cloud | Déploiement en un clic. | Les logs de la plateforme échappent à notre contrôle, on ne peut donc plus garantir l'absence de stockage ; inutile pour un seul PC. |

Docker compose en local est retenu parce que l'application tourne sur un seul
PC de l'école et que le conteneur en lecture seule permet de démontrer
l'absence de stockage.

## D8. Sources de données (providers)

Date : 2026-11-10

| Provider | Recherche | Coût | Rôle |
| --- | --- | --- | --- |
| **XposedOrNot (retenu)** | Email | Gratuit | Premier provider implémenté. |
| Have I Been Pwned | Email | Payant (abonnement mensuel) | Remplaçant ou complément possible ; clé et comptes de test disponibles. |
| Snusbase | Email, nom, téléphone… | Payant | Recherche par nom ou téléphone ; les réponses contiennent des données en clair, qui sont filtrées par la liste blanche. |
| Dehashed | Email, nom, téléphone… | Payant | Même usage que Snusbase. |

XposedOrNot est retenu en premier parce qu'il est gratuit. Grâce à
l'architecture ports & adapters, un autre provider peut être ajouté ou le
remplacer sans modifier le reste de l'application.

Remarque : Snusbase et Dehashed renvoient des données volées en clair. Leur
utilisation doit être validée par l'enseignant responsable, et les invariants
de `ARCHITECTURE.md` (section 2) s'appliquent sans exception.

## D9. Organisation du dépôt

Date : 2026-11-10

La branche `research` sert uniquement au démarrage du projet (documentation et
mise en place). Une fois fusionnée dans `main`, chaque fonctionnalité ou
correction est développée sur sa propre branche, puis intégrée dans `main` par
une pull request relue par l'autre membre du binôme.

Les commits, push et pull requests sont faits par les élèves. Par défaut,
Claude propose les commandes et le message ; chaque élève peut l'autoriser à
les exécuter lui-même dans son `CLAUDE.local.md`. Les commits et pull requests
ne mentionnent pas Claude ni l'IA.
La règle de relecture est remplacée par D14.

## D10. Modes surface et deep

Date : 2026-11-10

L'application a deux usages :

- `surface` : sources légales et publiques (fuites connues par email, voir
  D8). C'est le mode des portes ouvertes. Les autres sources de ce mode
  (annuaires, recherche web, presse) feront l'objet d'une décision séparée.
- `deep` : en plus des sources de `surface`, consultation de bases de données
  volées par une API payante (Snusbase, Dehashed ou équivalent, voir D8).

| Option | Avantages | Inconvénients |
| --- | --- | --- |
| **Une image, mode choisi à l'exécution par `APP_MODE` (retenu)** | Une seule image à construire et à tester ; le code est commun, seuls les providers actifs changent ; correspond à l'architecture ports & adapters (`registry.ts`) ; Next.js lit les variables serveur à l'exécution, un seul build suffit. | L'image `surface` contient aussi le code des providers deep (inutilisable sans clé). |
| Deux images, mode fixé au build | L'image `surface` ne contient pas le code deep. | Deux builds et deux séries de tests ; les images peuvent diverger. |
| Deux branches Git permanentes | Séparation visible dans le dépôt. | Chaque correction doit être fusionnée deux fois ; les branches divergent ; `main` n'est plus la référence (contraire à D9). |

Une seule image est retenue. Le mode est choisi au lancement du conteneur.

`docker compose --env-file` sert seulement à remplacer les `${...}` dans
`compose.yaml` : il ne transmet pas les variables au conteneur. C'est donc
`compose.yaml` qui les transmet, avec `env_file: ${ENV_FILE:-.env.surface}`.
Sans précision, le conteneur démarre en `surface` :

```powershell
docker compose up                              # surface (par défaut)
$env:ENV_FILE=".env.deep"; docker compose up   # deep (PowerShell)
```

Les fichiers `.env.surface` et `.env.deep` contiennent les clés et ne sont pas
versionnés (`.gitignore` ignore `.env.*`). Le seul fichier versionné est
`.env.example`, qui liste toutes les variables sans valeur.

Règles qui font du mode `surface` une garantie :

1. Les variables d'environnement sont validées par zod au démarrage.
   `APP_MODE` vaut `surface` ou `deep`. En `deep`, une clé deep manquante
   empêche le démarrage.
2. En `surface`, `registry.ts` n'enregistre aucun provider deep, même si une
   clé deep est présente. Le mode décide, pas la présence d'une clé.
3. Un test Vitest vérifie qu'en `surface` aucun provider deep n'est actif.
4. Le mode actif est affiché discrètement dans l'interface, pour vérifier le
   jour des portes ouvertes que le poste tourne en `surface`.

Le mode `deep` reste soumis à la validation de l'enseignant (D8). Les
invariants de `ARCHITECTURE.md` (section 2) s'appliquent aux deux modes sans
exception.

## D11. CI/CD et stockage de l'image

Date : 2026-11-10

Statut : ouverte, pas encore tranchée. La CI de vérification (secrets,
documentation, lint, tests et build) est en place depuis D13.

Nous prévoyons d'utiliser GitHub Actions pour la CI/CD et de stocker l'image
Docker sur GitHub (GitHub Container Registry, `ghcr.io`). Une fois tranchée,
cette décision complétera D7, qui prévoit aujourd'hui un build local.

| Option | Avantages | Inconvénients |
| --- | --- | --- |
| GitHub Actions + GitHub Container Registry (envisagé) | Tout reste sur GitHub, à côté du code et des pull requests ; gratuit pour un package public, quota gratuit limité en privé ; standard en entreprise. | Le PC de l'école doit pouvoir télécharger l'image (connexion, authentification si le package est privé). |
| Build local uniquement (situation actuelle, D7) | Rien à configurer. | Pas de tests automatiques sur les pull requests ; l'image dépend du PC qui la construit. |
| Docker Hub | Registre le plus connu. | Un compte et un service de plus ; limites de téléchargement. |

Questions à trancher :

- Ce que la CI exécute à chaque pull request (lint, typage, Vitest dans les
  deux modes, build de l'image).
- Quand l'image est publiée (fusion dans `main`, tag de version) et comment
  elle est taguée.
- Package privé ou public, et comment le PC de l'école s'authentifie pour la
  télécharger.
- Aucune clé API dans la CI : les tests utilisent uniquement des fixtures.

## D12. Cadre validé par l'enseignant

Date : 2026-11-11

L'enseignant responsable a précisé le cadre du projet (information orale, à
confirmer par écrit) :

- Le projet peut utiliser toutes les informations publiques, y compris les
  bases de données volées qui ont été rendues publiques. La validation
  demandée dans D8 pour Snusbase et Dehashed est donc donnée sur le principe.
- Toute API ou tout service payant doit faire l'objet d'un budget, préparé et
  défendu par les élèves avant l'achat. Le budget est dans `BUDGET.md`.

Conséquences :

| Option | Avantages | Inconvénients |
| --- | --- | --- |
| **Interroger les fuites publiques par des services qui les indexent (retenu)** | Aucune donnée de tiers stockée chez nous ; les invariants (zéro stockage, liste blanche) restent respectés ; une requête ne renvoie que les fiches liées à la saisie du visiteur. | Payant pour la recherche par téléphone ou pseudo ; dépend de services externes. |
| Télécharger les fuites publiques et les interroger en local | Aucun coût, aucune dépendance. | Stocke sur le poste les données de millions de personnes : contraire à l'invariant « zéro stockage » et à la nLPD (minimisation). |

Le mode `deep` (D10) peut être développé. Les invariants de `ARCHITECTURE.md`
(section 2) s'appliquent sans exception : aucun mot de passe ni hash affiché,
valeurs masquées, règle anti-homonymes. Aucun service payant n'est souscrit
avant l'acceptation du budget.

## D13. CI de vérification

Date : 2026-11-11

Tant que le projet ne contient pas de code à builder, la CI vérifie les
secrets et la documentation. Elle répond en partie à la première question de
D11. La publication de l'image reste ouverte dans D11.

Depuis le 2026-11-12, le workflow `app.yml` vérifie aussi l'application à
chaque pull request : lint, typage, tests et build, dans un seul job
`app-checks` rendu obligatoire. Le build est inclus parce que lui seul détecte
un module `server-only` importé par un composant du navigateur.

| Option | Avantages | Inconvénients |
| --- | --- | --- |
| **gitleaks (retenu)** | Analyse tout l'historique Git, pas seulement le dernier commit ; action GitHub gratuite pour un compte personnel ; règles connues pour les clés API courantes. | Peut signaler des faux positifs, à exclure dans un fichier de configuration. |
| TruffleHog | Peut vérifier si une clé trouvée est encore valide. | Plus lourd à configurer ; la vérification envoie la clé au service concerné. |
| Secret scanning de GitHub seul | Déjà activé, bloque le push avant l'arrivée du secret. | Couvre seulement les formats de clés connus de GitHub ; pas de contrôle visible dans la pull request. |

Gitleaks est retenu en complément du secret scanning de GitHub : le secret
scanning bloque le push, gitleaks contrôle chaque pull request et tout
l'historique.

Pour la documentation :

- markdownlint vérifie la structure des fichiers Markdown (titres, listes,
  tableaux, blocs de code). La longueur des lignes n'est pas vérifiée, car les
  tableaux et les schémas ne peuvent pas être coupés.
- lychee vérifie les liens et les ancres entre les documents, par exemple les
  renvois de `ARCHITECTURE.md` vers les décisions.

Ces deux contrôles ne tournent que si `docs/` change. Les actions sont
épinglées par SHA de commit : une version publiée ne peut pas être remplacée
par du code différent sans que le workflow change. Les outils prévus pour plus
tard (Dependabot, CodeQL, Trivy) sont dans `IDEES.md`, I2.

## D14. Protection de main et relecture

Date : 2026-11-11

Remplace la règle de relecture de D9.

Tiago est responsable du dépôt et relit le travail d'Enzo. Les pull requests
d'Enzo doivent être approuvées par Tiago avant la fusion. Tiago peut pousser
sur `main` et fusionner ses propres pull requests sans approbation.

| Option | Avantages | Inconvénients |
| --- | --- | --- |
| **Ruleset avec contournement pour le rôle admin (retenu)** | Les règles s'appliquent à Enzo ; Tiago garde tous les droits ; chaque contournement est enregistré par GitHub. | Le contournement s'applique à toutes les règles, y compris le force push. |
| Relecture croisée sans contournement | Chaque changement est relu par une deuxième personne. | Ne correspond pas à la répartition des rôles dans le binôme. |
| Protection de branche classique | Interface plus ancienne et connue. | GitHub recommande les rulesets, qui permettent une liste de contournement par rôle. |

Le réglage détaillé du ruleset est dans `DEVSECOPS.md`, section 5. Le check
`gitleaks-scan` est obligatoire. Les push directs de Tiago sur `main` sont
quand même analysés, car `ci.yml` tourne à chaque push sur `main`.

## D15. Quota d'XposedOrNot

Date : 2026-11-12

Statut : ouverte, à analyser avant les portes ouvertes.

L'API gratuite d'XposedOrNot accepte 2 requêtes par seconde, 25 par heure et
100 par jour, par adresse IP publique. Au-delà, elle répond 429 jusqu'à la fin
de l'heure ou de la journée. Une recherche par email consomme une requête.
Le réseau de l'école sort probablement par une seule adresse IP : le quota
serait alors partagé avec tout autre poste de l'école qui utilise cette API.

Avec plus de 25 visiteurs par heure, la recherche par email ne fonctionne plus
pendant le reste de l'heure. En attendant une solution, l'application traite
un 429 comme une panne du provider : la recherche continue avec les autres
sources et l'écran l'indique (plan d'implémentation, tâches 8 et 10).

| Piste | Avantages | Inconvénients |
| --- | --- | --- |
| Offre payante xonAPI+ | Clé API dédiée, au moins 50 requêtes par minute ; même API, seul le client change. | À partir de 9 dollars par mois : budget à faire accepter (D12, `BUDGET.md`). |
| Have I Been Pwned avec abonnement | Base de référence, déjà citée comme remplaçant dans D8. | Payant ; prix et limites à vérifier ; un adaptateur de plus à écrire. |
| Compteur de quota dans l'application | Gratuit ; aucune donnée personnelle (un simple compteur) ; l'écran peut annoncer « service saturé, réessayer à 15 h » au lieu d'une erreur. | Ne donne pas plus de recherches, rend seulement la limite visible. |
| Profil de démonstration fictif quand le quota est atteint | Le visiteur voit quand même le principe et le plan d'action. | Ce ne sont plus ses propres données ; l'écran doit l'indiquer clairement. |
| Connexion séparée (partage de connexion 4G) | Adresse IP dédiée au poste. | Ne dépasse pas 100 recherches par jour ; dépend du forfait mobile. |
| Garder les résultats en cache | Moins de requêtes pour un même email. | Écarté : contraire à l'invariant « zéro stockage » (`ARCHITECTURE.md`, section 2). |

Questions à trancher :

- Nombre de visiteurs attendus par heure et sur la journée.
- Adresse IP publique partagée ou non sur le réseau de l'école (à demander
  au service informatique).
- Contenu exact de la réponse 429 (limite horaire ou journalière, heure de
  fin), à observer pendant les tests.
- Budget possible pour une offre payante, à ajouter à `BUDGET.md` si une
  piste payante est retenue.

## D16. Version de Node.js

Date : 2026-11-12

Node.js exécute Next.js, les tests et le build. La même version majeure est
utilisée partout : sur les postes des élèves, dans la CI
(`actions/setup-node`) et dans l'image Docker (`node:24-alpine`, D7). Une
différence de version peut provoquer des erreurs qui n'apparaissent que dans
un seul de ces environnements.

| Option | Fin du support | Avantages | Inconvénients |
| --- | --- | --- | --- |
| **Node.js 24 LTS (retenu)** | 30 avril 2028 | LTS depuis octobre 2025 : versions déjà testées par tout l'écosystème ; supportée par Next.js 16 et Vitest 5 ; déjà prévue dans D7. | Support plus court que Node.js 26. |
| Node.js 26 LTS | 30 avril 2029 | Version LTS la plus récente, support le plus long. | LTS depuis le 28 octobre 2026 seulement : certaines dépendances peuvent ne pas encore la supporter. |
| Node.js 22 LTS | 30 avril 2027 | Très stable. | Plus de correctifs de sécurité un an après le début du projet. |
| Version impaire (25, 27) | Environ 6 mois | Dernières nouveautés. | Pas de LTS, inadaptée à un projet qui doit durer. |

Node.js 24 est retenu parce que son support couvre toute la durée du projet et
que l'écosystème l'utilise depuis plus d'un an. Le passage à Node.js 26 pourra
se faire plus tard, en changeant la version au même moment dans la CI, dans le
`Dockerfile` et sur les postes.

Installation sur Windows : `winget install OpenJS.NodeJS.LTS --version 24.22.1`.
Sans `--version`, winget installe la dernière LTS, donc Node.js 26.

## D17. Outils DevSecOps

Date : 2026-11-12

La CI vérifie les secrets (gitleaks) et la qualité du code (`app-checks`).
Il manquait deux familles de contrôles : l'analyse des dépendances (SCA) et
l'analyse statique de notre propre code (SAST). Les actions étant épinglées
par SHA (D13), elles ne se mettent plus à jour seules : il faut un outil qui
propose les nouvelles versions.

| Option | Famille | Avantages | Inconvénients |
| --- | --- | --- | --- |
| **Dependabot (retenu)** | SCA | Intégré à GitHub, gratuit ; met à jour npm et les actions épinglées par SHA ; option `cooldown` contre les versions piratées. | Des pull requests à relire chaque semaine. |
| Renovate | SCA | Plus de réglages, regroupements plus fins. | Application externe à installer ; configuration plus longue. |
| **dependency-review-action (retenu)** | SCA | Bloque une pull request qui ajoute un paquet vulnérable, avant la fusion. Gratuit pour un dépôt public. | Payant (Advanced Security) si le dépôt devient privé. |
| OSV-Scanner | SCA | Base de failles ouverte, fonctionne partout. | Doublon avec les alertes Dependabot déjà activées. |
| **CodeQL (retenu)** | SAST | Développé par GitHub, résultats dans l'onglet Security, règles pour l'injection et la SSRF. Gratuit pour un dépôt public. | Analyse lente (plusieurs minutes) ; payant si le dépôt devient privé. |
| Semgrep | SAST | Rapide, règles faciles à écrire. | Règles avancées dans l'offre payante ; compte à créer. |

Dependabot est en place depuis le 2026-11-12 (`.github/dependabot.yml`).
`dependency-review-action` et CodeQL seront ajoutés chacun dans sa propre
pull request. Trivy, hadolint et OWASP ZAP restent dans `IDEES.md`, I2, car ils
demandent une image Docker ou une application qui tourne. Le détail des
réglages est dans `DEVSECOPS.md`.

## D18. Console de test des providers

Date : 2026-11-13

Pour régler chaque provider, il faut voir ce que l'API renvoie vraiment et ce
que le schéma et le mapper en gardent. La route `/api/search` ne renvoie que
les fuites mappées, et l'interface finale n'existe pas encore.

| Option | Avantages | Inconvénients |
| --- | --- | --- |
| Commandes PowerShell (`Invoke-RestMethod`) | Aucun code à écrire. | Pas de réponse brute ; un provider à la fois ; email enregistré dans l'historique de PowerShell. |
| **Page `/dev`, disponible seulement avec `npm run dev` (retenu)** | Réponse brute, champs ignorés par le schéma, choix des providers, durée de chaque appel. | Exception à l'invariant « le type brut ne sort jamais de l'adaptateur » ; code à maintenir. |
| Script Node.js en ligne de commande | Aucune page à protéger. | Moins lisible pour comparer les réponses de plusieurs providers. |

Limites de l'exception :

- La page `/dev` et la route `/api/dev/search` répondent 404 quand
  `NODE_ENV` n'est pas `development`, donc dans le build de production lancé
  sur le poste des portes ouvertes. Vérifié avec `npm run build` puis
  `npm run start`.
- La route publique `/api/search` ne change pas : elle renvoie seulement les
  fuites mappées.
- Chaque provider a une méthode `inspect` qui renvoie la réponse brute, la
  réponse filtrée par le schéma et les fuites mappées. `search` utilise
  `inspect` et ne garde que les fuites mappées.
- Rien n'est enregistré : ni fichier, ni `localStorage`, ni log de la saisie.
- Les providers payants (`deep`) peuvent renvoyer des mots de passe ou des
  hashes. Avant d'en ajouter un, il faut décider comment les masquer dans la
  réponse brute (D12 : jamais de mot de passe ni de hash affiché).

## Récapitulatif

| Couche | Choix | Plan B |
| --- | --- | --- |
| Framework | Next.js (App Router) | Vite + React + Express |
| Langage | TypeScript strict | Aucun |
| UI | Tailwind + shadcn/ui | Mantine |
| Animations | Framer Motion | CSS pur |
| Validation | zod | Valibot |
| Tests | Vitest (+ Playwright plus tard) | Jest |
| Exécution | Docker compose (local) | `npm run start` |
| Runtime | Node.js 24 LTS (D16) | Node.js 26 LTS |
| Premier provider | XposedOrNot | Have I Been Pwned |
| Quota XposedOrNot | Ouverte (D15) | |
| Modes | Une image, `APP_MODE` à l'exécution | Deux images |
| CI | GitHub Actions : gitleaks, lint, typage, tests, build, markdownlint, lychee (D13) | |
| DevSecOps | Dependabot, dependency-review-action, CodeQL (D17) | Renovate, Semgrep |
| CD et image | Ouverte (D11) | |
| Test des providers | Page `/dev` en développement uniquement (D18) | Commandes PowerShell |
| Protection de `main` | Ruleset, relecture des pull requests d'Enzo par Tiago (D14) | |
| Fuites publiques | Par des services qui les indexent (D12) | Gratuit uniquement (XposedOrNot) |
