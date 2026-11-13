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

Statut : ouverte, pas encore tranchée. La CI de vérification (secrets et
documentation) est en place depuis D13.

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
D11. Le build, les tests et la publication de l'image restent ouverts dans D11.

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

Le réglage détaillé du ruleset est dans `ARCHITECTURE.md`, section 8. Le check
`gitleaks-scan` est obligatoire. Les push directs de Tiago sur `main` sont
quand même analysés, car `ci.yml` tourne à chaque push sur `main`.

## D15. Mise en place du projet

Date : 2026-11-11

Le projet a été créé avec `create-next-app` (TypeScript, Tailwind, ESLint, App
Router, dossier `src/`), puis shadcn/ui a été initialisé avec `shadcn init`.
Les choix faits pendant la mise en place sont les suivants.

Base des composants shadcn/ui :

| Option | Avantages | Inconvénients |
| --- | --- | --- |
| **Radix (retenu)** | Composants accessibles, très utilisés ; c'est la base citée dans D3. | Aucun pour notre usage. |
| Base UI | Proposée par défaut par la nouvelle version de shadcn. | Plus récente, moins d'exemples ; D3 avait été décidé sur Radix. |
| React Aria | Très complète sur l'accessibilité. | Moins répandue avec shadcn. |

Autres choix :

- Preset shadcn « Nova » (icônes Lucide, police Geist). Il pourra être adapté
  quand l'identité visuelle sera définie.
- ESLint, installé par `create-next-app` avec la configuration de Next.js,
  pour détecter les erreurs courantes (`npm run lint`).
- Le paquet `cn`, publié par l'auteur de shadcn, remplace `clsx` et
  `tailwind-merge` pour combiner les classes Tailwind.
- `@types/node` en version 24, pour correspondre à Node.js 24 (poste de
  développement et image `node:24-alpine`). La version 20 installée par défaut
  bloquait l'installation de Vitest.
- Vitest tourne dans un environnement Node (pas de navigateur simulé), car le
  domaine et les mappers sont du TypeScript pur. Le paquet `server-only`
  provoque une erreur hors d'un build Next.js : dans les tests, il est remplacé
  par un module vide (`src/tests/stubs/server-only.ts`).
- `npm run typecheck` lance `next typegen` avant `tsc`, car Next.js génère
  certains types (par exemple `LayoutProps`) dans `.next/types`.
- En développement, `next.config.ts` charge `.env.surface` (ou le fichier
  désigné par `ENV_FILE`) avec `process.loadEnvFile`, fonction intégrée à
  Node.js. L'option `--env-file` de Node n'est pas utilisable : Next.js la
  transmet à ses processus internes, qui la refusent.
- Vitest lit les chemins `@/` avec son option `resolve.tsconfigPaths`, sans
  plugin supplémentaire.
- `next.config.ts` charge le fichier d'environnement seulement pour `next
  dev`, jamais pendant `next build` : les clés ne doivent pas se retrouver dans
  le build ni dans l'image Docker, et `APP_MODE` reste un choix fait au
  lancement (D10). Un `ENV_FILE` qui pointe vers un fichier absent arrête le
  démarrage avec un message clair.
- Les options `cacheComponents` et `partialPrefetching`, activées par défaut
  par `create-next-app`, sont retirées : l'application traite des données
  personnelles, et aucune réponse ne doit être mise en cache ni partagée entre
  deux visiteurs.
- Tailwind CSS 4 est compilé par son module pour Turbopack, généré par
  `create-next-app`. Le projet se construit uniquement avec Turbopack.
- Le paquet `shadcn` est une dépendance de développement : seule sa feuille de
  style est utilisée, au moment du build.
- Framer Motion n'est pas encore installé : il sera ajouté avec la première
  animation.

## D16. Sources du mode surface

Date : 2026-11-11

Toutes les sources gratuites et légales discutées sont intégrées. Les
services payants attendent l'acceptation du budget (D12, `BUDGET.md`) et le
rebond reste une idée (`IDEES.md`, I1).

| Source | Saisie utilisée | Ce qui est affiché | Clé |
| --- | --- | --- | --- |
| XposedOrNot (retenu) | Email | Fuites : service, année, types de données exposées | Aucune |
| Tavily (retenu) | Email, téléphone (tous les formats), nom | Pages qui contiennent vraiment l'email ou le téléphone ; pages trouvées par le nom seul (voir D17) | `TAVILY_API_KEY` |
| search.ch (retenu) | Téléphone, nom | Inscription trouvée par le numéro (types de données publiées, astérisque) ; total pour le nom (`count_only`) | `SEARCH_CH_API_KEY` |
| GitHub (retenu) | Email | Nombre de commits publics signés avec l'email exact | Optionnelle (`GITHUB_TOKEN`) |
| Gravatar (retenu) | Email (empreinte SHA-256) | Photo de profil publique liée à l'email | Aucune |
| keys.openpgp.org (retenu) | Email | Clé publique publiée pour l'email | Aucune |
| RDAP (retenu) | Domaine de l'email, sauf messageries partagées | Date d'enregistrement, nom du titulaire public ou masqué | Aucune |
| Recherche GitHub d'utilisateurs par email | Email | Écartée : recherche approximative, renvoie d'autres comptes | |

Vérification des résultats : une page web ou une inscription n'est détaillée
que si son texte contient l'email ou le numéro du visiteur
(`domain/matching.ts`). Un résultat trouvé par le nom seul est seulement
compté. Les titres de pages sont masqués (`maskInText`).

Nouvelles dépendances :

| Option | Avantages | Inconvénients |
| --- | --- | --- |
| **libphonenumber-js (retenu)** | Règles officielles de Google pour valider et formater les numéros de tous les pays ; très utilisée. | Environ 150 Ko. |
| Expressions régulières maison | Aucune dépendance. | Formats suisses et étrangers difficiles à couvrir correctement. |

| Option | Avantages | Inconvénients |
| --- | --- | --- |
| **fast-xml-parser (retenu)** | Lit la réponse XML (Atom) de search.ch, sans dépendance, très utilisé. | Une dépendance de plus. |
| Lecture par expressions régulières | Aucune dépendance. | Fragile si le format change. |

Remarque : search.ch recopie la clé API dans sa réponse. La réponse brute
n'est donc jamais journalisée ni renvoyée au navigateur.

## D17. Pages trouvées par le nom en mode surface

Date : 2026-11-11

Statut : ouverte. Appliquée sur la branche `sandbox`, à valider avec l'autre
membre du binôme avant d'arriver sur `main`, car elle modifie un invariant.

Jusqu'ici, un résultat trouvé par le nom seul n'était jamais détaillé : seul
un total était affiché. Le visiteur ne voyait donc pas ce qu'on trouve en
cherchant son nom, alors que c'est le premier réflexe de n'importe qui.

| Option | Avantages | Inconvénients |
| --- | --- | --- |
| Total uniquement (règle d'origine) | Aucune information sur un homonyme n'est affichée. | Le visiteur ne voit pas ce que tout le monde trouve en cherchant son nom. |
| **Pages web affichées comme « non vérifiées » (appliqué sur `sandbox`)** | Montre exactement ce qu'un moteur de recherche montre à n'importe qui ; en mode `surface`, ce sont des pages publiques. | Certaines pages parlent d'un homonyme ; n'importe qui peut taper n'importe quel nom sur le poste. |
| Liste des sites seulement | Indique où chercher sans aucun contenu. | Moins parlant pour le visiteur. |

Règles de l'option appliquée :

- Seulement en mode `surface` et seulement pour la recherche web (Tavily).
- Une page n'est gardée que si le prénom et le nom y figurent ensemble, dans
  un sens ou dans l'autre (« Enzo Pachoud », « Pachoud, Enzo »), sans tenir
  compte des majuscules ni des accents (`containsFullName`). Une page qui ne
  contient que le prénom ou que le nom est écartée. L'email et le téléphone
  restent cherchés entiers, chacun de son côté.
- La vérification lit aussi le texte complet de la page fourni par Tavily
  (`include_raw_content`). Ce texte n'est ni affiché ni conservé.
- Les pages sont séparées des pages vérifiées et marquées « non vérifiées,
  peut-être un homonyme ».
- Tous les emails et numéros présents dans les titres et extraits sont
  masqués (`maskContacts`), qu'ils appartiennent au visiteur ou à un tiers.
- L'annuaire search.ch reste un total pour la recherche par nom : c'est
  l'usage déclaré lors de la demande de clé (`count_only`), une condition du
  contrat d'utilisation.
- Les pages non vérifiées ne déclenchent pas d'action dans le plan d'action.

## D18. Recherche approfondie et archives du web

Date : 2026-11-11

Les premières recherches ne trouvaient qu'une partie de ce qu'un enquêteur
trouve à la main. Trois ajouts, tous gratuits et sur des données publiques :

- Recherches ciblées sur le nom complet (toujours « Prénom Nom » ensemble,
  voir D17) : une recherche approfondie, puis une recherche par thème avec une
  liste de sites (réseaux sociaux, presse suisse, sport et clubs) et une
  recherche de documents (CV, PDF, listes de membres). Les listes de sites
  sont dans `providers/tavily/searches.ts`.
- Archives du web : pour les 20 premières pages trouvées (pages vérifiées
  d'abord), l'API CDX de la Wayback Machine indique les années d'archivage et
  un lien vers la dernière copie. Une requête `HEAD` vérifie si la page existe
  encore : une réponse 404 ou 410 signale une page supprimée, souvent toujours
  lisible dans l'archive. Cette étape a son propre délai (10 secondes) ; si
  elle échoue, les résultats s'affichent sans information d'archive. Les
  archives ne reçoivent que l'adresse des pages trouvées, jamais la saisie du
  visiteur.
- Pastes : XposedOrNot indique combien de textes publiés (Pastebin…)
  contiennent l'email. Seul ce nombre est affiché.

Coût : jusqu'à 8 crédits Tavily par visiteur qui remplit tous les champs
(nom : 6, email : 1, téléphone : 1). Le quota gratuit (1000 crédits par mois)
couvre environ 125 visiteurs complets ; le budget (`BUDGET.md`) prévoit une
réserve.

| Option | Avantages | Inconvénients |
| --- | --- | --- |
| **Plusieurs recherches ciblées (retenu)** | Trouve les réseaux sociaux, la presse locale et les résultats sportifs qu'une recherche générale manque. | 8 crédits au lieu de 3 ; recherche plus longue (environ 15 à 20 secondes). |
| Une recherche générale par donnée | 3 crédits, plus rapide. | Beaucoup moins de résultats. |

Limite : certains sites (LinkedIn, Facebook, Instagram) refusent l'archivage,
la Wayback Machine n'a donc pas de copie de leurs pages.

## D19. Pseudo et rebond

Date : 2026-11-11

Première partie de l'idée I1 (rebond) et du point 1 de I2. Le rebond se fait
sur un seul niveau.

- Champ optionnel « pseudo » (3 à 40 caractères : lettres, chiffres, `.`,
  `_`, `-`).
- WhatsMyName : liste publique d'environ 690 sites, avec pour chacun
  l'adresse du profil et la règle qui distingue « le compte existe » de « pas
  de compte » (code HTTP et texte de la page). La liste est téléchargée depuis
  GitHub au premier usage et gardée en mémoire (ce n'est pas une donnée
  personnelle). Licence CC BY-SA 4.0 : la source est citée à l'écran.
  Exclus : les catégories « NSFW » et « dating » (poste d'école, portes
  ouvertes) et les sites qui demandent une requête `POST`. Les sites sont
  testés par ordre de catégorie (réseaux sociaux d'abord), 80 en parallèle,
  5 secondes maximum chacun ; à la fin du délai, les comptes déjà trouvés sont
  gardés.
- GitHub : en plus des commits, lecture du profil public du compte qui les a
  signés (nom, localité, entreprise, site, compte X). Les comptes techniques
  (`invalid-email-address`, bots) sont ignorés.
- Gravatar : lecture du profil public (API v3, sans clé) et des comptes que
  la personne y a déclarés.
- Rebond (`domain/pivots.ts`, `pivot.ts`) : les pseudos trouvés dans GitHub,
  Gravatar et les adresses des pages vérifiées (au plus 3) sont testés avec
  WhatsMyName, et l'archive de leur ancien profil X (Twitter) est cherchée
  dans la Wayback Machine. Les pages non vérifiées (nom seul) ne sont jamais
  utilisées pour le rebond : elles peuvent concerner un homonyme. Le rebond
  tourne en même temps que l'étape des archives, dans le même délai de 10
  secondes.
- RDAP : `rdap.org` refuse les requêtes sans en-tête `User-Agent` ; un
  en-tête au nom du projet est envoyé.

Affichage : les pseudos et les adresses des profils sont affichés en clair,
comme le nom saisi ; les emails et téléphones restent masqués. Un compte
trouvé avec un pseudo est présenté comme une piste (« le même pseudo peut
appartenir à quelqu'un d'autre »), pas comme une preuve.

Durée : environ 20 à 25 secondes avec tous les champs remplis.

| Option | Avantages | Inconvénients |
| --- | --- | --- |
| **Liste WhatsMyName (retenu)** | Maintenue par la communauté OSINT, règles par site, licence libre. | Faux positifs possibles (pages de connexion, sites qui changent) ; environ 650 requêtes par pseudo. |
| Outils Sherlock ou Maigret | Très connus. | Programmes Python à part, difficiles à intégrer dans l'application. |
| Liste de sites maison | Contrôle total. | Long à créer et à maintenir. |

## D20. Variantes, contexte et nouvelles sources publiques

Date : 2026-11-11

Suite de l'idée I2 (points 2, 3 et sources publiques).

- Initiales : le nom est aussi cherché sous la forme « E. Pachoud » ou
  « Pachoud E. ». Une page est gardée si elle contient le nom complet ou
  l'initiale collée au nom (`containsNameOrInitial`).
- Contexte : deux champs optionnels, « localité » et « année de naissance ».
  Une page trouvée par le nom qui contient aussi la localité ou l'année est
  marquée « probablement toi ». Une recherche « Prénom Nom » + localité est
  ajoutée. Ces pages restent « non vérifiées » : elles ne servent ni au rebond
  ni au plan d'action.
- Partie de l'email avant le @ : utilisée comme pseudo pour le rebond (D19),
  sauf les noms de boîtes génériques (info, contact, test…).
- Téléphone : recherche supplémentaire sur les sites de signalement d'appels
  et les annuaires (tellows, local.ch, telguarder…). Une page n'est gardée que
  si elle contient le numéro.
- Keybase : pour le pseudo saisi et les pseudos du rebond, liste des comptes
  que le compte Keybase prouve posséder.
- ORCID (chercheurs) et Wikidata (personnes connues) : recherche par nom
  complet exact, résultats affichés comme pages non vérifiées (D17).

Coût : jusqu'à 11 crédits Tavily par visiteur (email 1, téléphone 2, nom 8).
`BUDGET.md` est mis à jour.

Sources écartées pour le moment :

| Source | Raison |
| --- | --- |
| ProxyNova (COMB), psbdmp | Bloqués par le filtre de sécurité du réseau (Cisco Umbrella). Le filtre n'est pas contourné. |
| Intelligence X | Demande un compte et une clé, à créer par les élèves. |
| Marginalia (2e moteur) | Inaccessible depuis le réseau au moment du test. |
| Zefix | Accès à l'API sur demande par email à l'OFJ. |
| Hunter.io, Brave | Demandent un compte (et une carte bancaire pour Brave). |
| Lecture des PDF | Tavily fournit déjà le texte des PDF qu'il indexe (`raw_content`), utilisé pour la vérification. |

## D21. Interface : une seule barre de recherche

Date : 2026-11-11

Le formulaire à sept champs est remplacé par une seule barre. Le visiteur tape
une information, appuie sur Entrée (ou Tab, ou une virgule) et l'application
reconnaît seule ce que c'est (`src/lib/detect.ts`) : email, téléphone suisse,
prénom et nom (deux à quatre mots), pseudo, localité ou année de naissance.
Chaque information devient une étiquette. Quand la reconnaissance hésite (un
mot seul peut être un pseudo ou une localité, deux mots un nom ou une
localité), un clic sur le type de l'étiquette le change. Le prénom et le nom
peuvent être inversés. Une liste collée est découpée automatiquement. Le
serveur valide de nouveau chaque valeur (`route.ts`).

| Option | Avantages | Inconvénients |
| --- | --- | --- |
| **Une barre avec reconnaissance automatique (retenu)** | Un seul geste à expliquer aux visiteurs ; aucun champ vide intimidant. | La reconnaissance peut se tromper : le visiteur doit pouvoir corriger le type. |
| Formulaire avec un champ par information | Aucune ambiguïté. | Long et peu engageant sur un poste de portes ouvertes. |

Identité visuelle : l'idée du surligneur, qui marque ce qui est exposé.

| Rôle | Valeur |
| --- | --- |
| Fond | `#f3f5f8` (papier gris-bleu froid) |
| Encre (texte, bordures, bouton) | `#1b2a4a` |
| Surligneur (étiquettes, ombre de la barre, chiffres trouvés) | `#ffe45c` |
| Mot de passe exposé, erreur | `#c8283c` |
| Vérifié | `#1e8e5a` |
| Texte secondaire | `#5b6b82` |

Polices : Bricolage Grotesque pour les titres, Atkinson Hyperlegible pour le
texte. Atkinson Hyperlegible a été dessinée pour être lisible par tous, ce qui
compte sur un poste utilisé par des visiteurs de tous âges. Les polices sont
servies localement par `next/font` : le navigateur ne contacte pas Google.

Pendant la recherche, un écran d'attente liste les sources interrogées.

Trois couleurs ont été corrigées pour le contraste, et l'écran revu : voir D22.

## D22. Révision de l'interface par les agents UX et UI

Date : 2026-11-11

L'interface de D21 a été relue par les sous-agents `ux-architect` et
`ui-designer` du projet, puis corrigée selon leurs retours. Les agents n'étant
pas encore chargés dans la session, leur définition (`.claude/agents/`) a été
donnée telle quelle à un agent général, en lecture seule.

Corrections du parcours (agent UX) :

- Reset complet : l'écran de recherche est recréé (clé React), la page
  remonte en haut, une requête en cours est annulée et sa réponse ignorée. Le
  texte en cours de saisie ne reste plus affiché pour le visiteur suivant.
- Avertissement 20 secondes avant l'effacement automatique, avec « Je suis
  encore là » et « Effacer maintenant ».
- Titre juste dans chaque cas : éléments reliés au visiteur, résultat
  incomplet (source des fuites en panne), seulement des pistes, rien trouvé,
  et un écran d'erreur quand aucune source n'a répondu. Les comptes trouvés
  avec un pseudo et les pages au nom sont comptés comme pistes, pas comme
  éléments reliés (D17, D19).
- Une suite de chiffres n'est jamais un pseudo : c'est un téléphone ou une
  saisie non reconnue avec un message clair.
- Découpage du prénom et du nom visible dans l'étiquette, inversion et
  changement de découpage pour les noms de trois ou quatre mots.
- Bouton « Lancer la recherche » qui explique ce qui manque, au lieu d'être
  grisé sans explication. Le texte resté dans le champ est validé avant
  l'envoi.
- Écran d'attente : sources réellement interrogées selon la saisie, barre de
  temps, bouton « Annuler et effacer ».
- Plan d'action toujours présent : le nombre qui déclenche chaque action est
  dans son titre ; sans élément relié, trois actions de prévention.
- Accessibilité : un titre `h1` par écran, qui reçoit le focus à chaque
  changement ; annonces pour lecteur d'écran (type de l'étiquette, jamais sa
  valeur) ; retour arrière en deux appuis pour retirer une étiquette.
- Les adresses restent du texte et non des liens : en mode kiosque, un lien
  ferait quitter les résultats.

Corrections visuelles (agent UI) :

| Élément | Avant | Après | Raison |
| --- | --- | --- | --- |
| Texte secondaire | `#5b6b82` | `#4f5d72` | Contraste AA aussi sur le jaune et le gris clair |
| Vert « vérifié » | `#1e8e5a` | `#17784b` (fond `#e3f2ea`) | 4.1 : contraste insuffisant pour du texte |
| Contour des champs | `#c3ccd9` | `#7d8aa0` | La case à cocher doit atteindre 3:1 |
| Anneau de focus | encre à 50 % | encre pleine | 2.96 : juste sous le seuil |
| Graisse 500 | `font-medium` | `font-bold` | Atkinson Hyperlegible n'existe qu'en 400 et 700 |

- Ombre « surligneur » en token du thème (`shadow-marker`).
- Badges avec icône et texte, jamais la couleur seule : vérifié, probablement
  toi, non vérifié (pointillé), mot de passe exposé (seul usage du rouge
  plein), supprimée du site.
- Les email et téléphone d'une étiquette sont masqués une fois validés
  (invariant « valeurs affichées masquées ») ; le nom et le pseudo restent
  lisibles pour pouvoir corriger leur type.
- Écran des résultats en deux colonnes : onglets à gauche (preuves, puis
  pistes séparées), plan d'action et « Effacer et terminer » fixés à droite.
  Au-delà de 6 éléments, la suite est repliée ; au-delà de 6 fuites, liste
  compacte. Les fuites avec mot de passe sont en premier.
- Le texte Markdown renvoyé par Tavily est nettoyé (`plainText`).

Composants shadcn/ui ajoutés (sur `radix-ui`, déjà installé, sans nouvelle
dépendance) : Tabs, Collapsible, Tooltip, Separator, AlertDialog.

Animations avec Framer Motion (D4), paquet `motion` : une animation marquante,
le chiffre surligné de gauche à droite sur l'écran des résultats ; des
animations courtes (moins de 300 ms) qui répondent à une action : ajout et
retrait d'étiquette, changement de type, passage d'un écran à l'autre,
marqueur de l'écran d'attente, ouverture d'une liste repliée. `MotionConfig
reducedMotion="user"` respecte le réglage « réduire les animations ».

| Option pour l'écran des résultats | Avantages | Inconvénients |
| --- | --- | --- |
| **Onglets et plan d'action fixe (retenu)** | Tout est visible sans long défilement ; le plan d'action reste à l'écran ; preuves et pistes séparées. | Un clic pour passer d'une catégorie à l'autre. |
| Une colonne avec sections repliées et barre fixe en haut (proposition UX) | Lecture linéaire. | Page très longue avec plus de 200 fuites. |

## D23. Globe 3D pendant la recherche

Date : 2026-11-11

Pendant la recherche, la barre de progression est remplacée par un globe 3D
qui tourne. Des arcs partent du poste (Neuchâtel, latitude 46.99, longitude
6.93) vers les lieux où partent réellement les données du visiteur. Le message
est pédagogique : pour te chercher, tes données ont quitté la Suisse.

| Option | Avantages | Inconvénients |
| --- | --- | --- |
| **Composant « GitHub Globe » d'Aceternity UI (retenu, demande du binôme)** | Rendu soigné, arcs animés, atmosphère ; s'installe par le registre shadcn. | Lourd (three.js, three-globe, React Three Fiber, drei, environ 600 Ko à 1 Mo de JavaScript, plus 417 Ko de contours de pays). |
| cobe | Environ 5 Ko, globe en points, très fluide. | Pas d'arcs animés : il faudrait les simuler. |
| Garder la barre de progression | Aucune dépendance. | Moins parlant pour les visiteurs. |

Installation :

- Le registre `@aceternity` est ajouté dans `components.json`. La commande
  `npx shadcn add @aceternity/globe` demande `@react-three/fiber@alpha`
  (version 10 de test), incompatible avec `@react-three/drei`, qui exige la
  version 9. Les dépendances sont donc installées avec la version stable :
  `three`, `three-globe`, `@react-three/fiber` 9, `@react-three/drei`,
  `@types/three`. Le fichier du composant est repris tel que le registre le
  fournit (`shadcn add --view`), dans `src/components/ui/globe.tsx`, puis
  corrigé pour le lint et le typage strict sans changer son comportement.
- Les contours des pays (`globe.json`, GeoJSON de 176 pays, vérifié : aucun
  script) sont dans `src/data/globe.json`, car l'alias `@/` du projet pointe
  vers `src/`.

Fonctionnement :

- Le composant three.js est chargé seulement dans le navigateur
  (`next/dynamic` avec `ssr: false`) et préchargé dès que le visiteur tape
  dans la barre, pour éviter un délai au lancement.
- Le serveur répond en une seule fois : il n'y a pas de progression réelle
  source par source. Les étapes et les arcs suivent donc le temps écoulé, et
  le pourcentage affiché est une estimation, présentée comme telle.
- Couleurs de la charte : globe encre `#1b2a4a`, pays en points blancs, arcs
  et atmosphère jaune surligneur `#ffe45c`.
- Si l'utilisateur a demandé moins d'animations, ou si WebGL n'est pas
  disponible, l'ancienne liste avec la barre de progression s'affiche. La
  barre reste dans la page pour les lecteurs d'écran.

Destinations des arcs (lieu du siège du service qui reçoit les données) :

| Étape | Service | Lieu |
| --- | --- | --- |
| Web, presse, réseaux sociaux, sites de signalement d'appels | Tavily | New York |
| Annuaire téléphonique | search.ch | Zurich |
| GitHub et Gravatar, archives d'Internet, Wikidata | GitHub, Automattic, Internet Archive, Wikimedia | San Francisco |
| ORCID | ORCID | Bethesda |
| Fuites de données | XposedOrNot | Aucun arc : pays non trouvé |
| Environ 650 sites pour les pseudos | Sites du monde entier | Aucun arc : pas de lieu unique |

## D24. Nouvelles sources tirées de l'inventaire OSINT4ALL

Date : 2026-11-13

Statut : appliquée sur la branche `sandbox` (prototype). La page start.me
OSINT4ALL (environ 1450 liens) a été inventoriée, puis chaque candidat a été
comparé aux invariants (`ARCHITECTURE.md`, section 2) et testé avec des
données fictives depuis le poste de développement. Les candidats non retenus
sont dans `IDEES.md`, I4.

| Source | Saisie | Ce qui est affiché | Clé |
| --- | --- | --- | --- |
| LeakCheck, API publique (retenu) | Email | Nom et année de chaque fuite ; une seule liste des types de données exposées, toutes fuites confondues | Aucune |
| LeakCheck, API publique (retenu) | Pseudo (6 caractères ou plus) | Total des fuites qui contiennent ce pseudo, présenté comme une piste | Aucune |
| Profils publics (retenu) | Pseudo saisi et pseudos du rebond | Chess.com, Lichess, Steam, Minecraft, Speedrun.com, Bluesky, Codeberg, Hacker News, DEV Community : année de création, pays indiqué, activité, comptes reliés | Aucune |
| FOSC, amtsblattportal.ch (retenu) | Prénom et nom | Publications du registre du commerce (rubrique HR), comme pages non vérifiées | Aucune |
| GDELT (presse mondiale) | Nom | Écarté pour le moment : répond 429 même à la première requête depuis ce réseau | Aucune |
| DNS-over-HTTPS (Google, Cloudflare) | Domaine de l'email | Écarté pour le moment : bloqué par le réseau | Aucune |

Règles appliquées :

- LeakCheck renvoie une liste des types de données pour l'ensemble des
  fuites, pas fuite par fuite. Chaque fuite LeakCheck porte donc seulement la
  catégorie « email », et les types sont affichés une fois dans l'onglet
  Comptes. Aucune valeur n'est lue : l'API publique n'en renvoie pas.
- Un pseudo peut appartenir à beaucoup de monde : les fuites trouvées par
  pseudo sont seulement comptées (`CountFinding`), comme les fiches trouvées
  par nom (D17).
- Profils publics : seuls des faits sont gardés (année de création, code du
  pays, nombre de parties ou de publications, nom des comptes reliés). Le nom
  affiché, la biographie, la ville et la photo ne sont jamais lus, car le
  compte peut appartenir à quelqu'un d'autre. Les profils restent des pistes
  (onglet Pseudos).
- FOSC : seule la rubrique « registre du commerce » (HR) est interrogée. Les
  faillites, poursuites, successions et l'état civil ne sont jamais affichés
  devant un poste de portes ouvertes. Le registre écrit les personnes sous la
  forme « Nom, Prénom » : les deux ordres sont cherchés comme phrases exactes.
- Doublons : une fuite signalée par XposedOrNot et LeakCheck, ou un compte
  trouvé par WhatsMyName et par un profil public, est affiché une seule fois
  (`domain/merge.ts`). La version d'XposedOrNot est gardée, car elle donne les
  types de données de chaque fuite.
- Un site de profil qui ne répond pas, ou qui limite le débit (Mojang répond
  vite 429), est simplement ignoré.

Résultat avec des données fictives (`test@example.com`, pseudo `johndoe`,
« Hans Muster ») : 106 fuites de plus qu'avec XposedOrNot seul, 9 profils
publics avec leurs détails, 10 publications de la FOSC.

| Option | Avantages | Inconvénients |
| --- | --- | --- |
| **Sources sans clé d'abord (retenu)** | Rien à souscrire ni à configurer ; testable tout de suite. | Les sources avec clé gratuite (Twitch, YouTube, Disqus) attendent. |
| Toutes les sources de l'inventaire d'un coup | Plus de résultats. | Clés à créer, conditions à relire, risques (homonymes, données sensibles) plus difficiles à contrôler. |

## D25. Globe 3D retravaillé

Date : 2026-11-13

Statut : appliquée sur la branche `sandbox` (prototype). Complète D23.

Le globe de D23 fonctionnait, mais un test dans le navigateur a montré trois
défauts :

- La page se figeait jusqu'à 1,2 seconde à chaque nouvelle étape. Le
  composant d'Aceternity recalculait les pays en hexagones (GeoJSON de
  417 Ko) chaque fois qu'un arc s'ajoutait. Il recréait aussi la scène et la
  caméra à chaque rendu.
- La console affichait `THREE.Clock: This module has been deprecated`.
  L'avertissement vient de React Three Fiber 9, qui utilise encore `Clock`,
  déprécié depuis three 0.183.
- Les options `initialPosition` et `autoRotateSpeed` de `globeConfig`
  n'étaient pas lues par le composant : le globe montrait souvent l'autre
  côté de la Terre, sans les arcs.

Corrections :

| Élément | Avant | Après |
| --- | --- | --- |
| Pays en hexagones | Recalculés à chaque arc | Calculés une seule fois, à la création du globe |
| Scène et caméra | Recréées à chaque rendu | Créées une fois ; la caméra suit la taille du conteneur |
| three | 0.187 | 0.182.0, version fixée (dernière version sans l'avertissement) |
| Position de départ | Ignorée | Caméra au-dessus de l'Atlantique nord (latitude 40, longitude -10) : la Suisse et le départ des arcs vers l'Amérique sont visibles |
| Rotation | Vitesse fixe | Lente (0.3) : les arcs restent à l'écran pendant la recherche |
| Taille | Cadre 6:5 calculé depuis la largeur | Hauteur fixe : 280 px sur téléphone, 400 px sur tablette, 500 px sur grand écran |
| Hauteur des arcs | Deux valeurs (proche, loin) | Proportionnelle à la distance |
| Densité de pixels | Celle de l'écran | Limitée à 2 |

Nouveaux arcs pour l'étape des profils publics (D24), vers le siège des
services interrogés :

| Service | Lieu |
| --- | --- |
| Mojang (Minecraft) | Stockholm |
| Codeberg | Berlin |
| Valve (Steam) | Bellevue, près de Seattle |
| Forem (DEV Community) | New York |

LeakCheck n'a pas d'arc : le pays du service n'a pas été trouvé.

Vérification : build de production, test dans Chromium (Playwright) sur
grand écran et sur téléphone (390 px de large). Aucune erreur ni aucun
avertissement dans la console. Il reste un calcul d'environ 1 seconde au
premier affichage du globe (pays en hexagones).

| Option | Avantages | Inconvénients |
| --- | --- | --- |
| **Corriger le composant existant (retenu)** | Garde le rendu choisi en D23 ; supprime les blocages. | Le fichier `ui/globe.tsx` s'écarte de la version du registre. |
| Réinstaller avec `npx shadcn add @aceternity/globe` | Version du registre. | Installe `@react-three/fiber` en version alpha, incompatible avec drei (voir D23) ; remet les défauts. |

## D26. Source affichée pour chaque résultat

Date : 2026-11-13

Statut : appliquée sur la branche `sandbox` (prototype).

Avec quinze sources, il faut savoir lesquelles servent vraiment, pour retirer
celles qui ne trouvent rien ou seulement ce qu'une autre a déjà trouvé.

- Chaque résultat affiche sa source (« Source : XposedOrNot »). Quand
  plusieurs sources ont trouvé la même chose, le résultat est affiché une
  fois et indique les autres (« aussi trouvé par LeakCheck »). Le champ
  `alsoFoundBy` est rempli par `domain/merge.ts`.
- Sous les onglets, un tableau replié « Détail par source » donne pour chaque
  source : les résultats affichés sous son nom, ceux qu'elle a aussi trouvés
  alors qu'une autre source les affiche déjà, et son état (a trouvé, rien
  trouvé, n'a pas répondu). Le calcul est dans `domain/stats.ts` et la route
  l'envoie dans `providerStats`.
- Les archives du web (Wayback Machine) complètent des pages trouvées par
  d'autres sources : elles sont comptées à part, une fois par page archivée.
- La source est un identifiant technique, pas une donnée personnelle :
  l'invariant des logs n'est pas concerné.

Une source qui a « 0 » dans la colonne des résultats affichés sur plusieurs
recherches réelles est une candidate au retrait. Un seul test ne suffit pas :
avec des données fictives, plusieurs sources (Gravatar, PGP, RDAP, ORCID,
Wikidata) ne trouvent rien, alors qu'elles peuvent trouver quelque chose pour
un vrai visiteur.

| Option | Avantages | Inconvénients |
| --- | --- | --- |
| **Source affichée à l'écran, tableau replié (retenu)** | Visible pendant les tests sans outil ; le visiteur voit aussi d'où vient chaque information. | Un peu plus de texte sous chaque résultat. |
| Statistiques dans les logs du serveur | Rien à l'écran. | Il faut lire les logs ; un log par recherche donnerait aussi un historique des recherches, contraire à l'esprit « zéro stockage ». |

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
| Premier provider | XposedOrNot | Have I Been Pwned |
| Modes | Une image, `APP_MODE` à l'exécution | Deux images |
| CI | GitHub Actions : gitleaks, markdownlint, lychee (D13) | |
| CD et image | Ouverte (D11) | |
| Protection de `main` | Ruleset, relecture des pull requests d'Enzo par Tiago (D14) | |
| Fuites publiques | Par des services qui les indexent (D12) | Gratuit uniquement (XposedOrNot) |
| Qualité du code | ESLint (configuration Next.js) | Aucun |
