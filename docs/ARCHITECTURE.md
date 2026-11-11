# Architecture de OSINT Open Doors

OSINT Open Doors est un outil de sensibilisation prévu pour les portes ouvertes
du CPNE. Un visiteur teste ses propres informations (email, téléphone, nom et
prénom) et voit dans quelles fuites de données elles apparaissent. Il reçoit
ensuite un plan d'action concret.

## 1. Contexte d'utilisation

- L'application tourne sur un PC de l'école, placé dans un coin privé. Il n'y a
  pas de projection et pas d'accès depuis un appareil personnel.
- Un seul visiteur utilise le poste à la fois. Il confirme avec une case à
  cocher que les données saisies sont les siennes.
- L'application est exécutée localement avec Docker. Le navigateur est lancé en
  mode kiosque et en navigation privée (`--kiosk --incognito http://localhost:3000`).

## 2. Invariants (non négociables)

| Invariant | Mise en œuvre |
| --- | --- |
| Jamais de mot de passe ni de hash affiché | Les mappers des providers appliquent une liste blanche de champs. Le type brut ne sort jamais de l'adaptateur. |
| Pas d'exposition de tiers (homonymes) | Une fiche trouvée par nom n'est détaillée que si elle contient aussi un autre identifiant saisi par le visiteur (téléphone ou email). Sinon, seul un agrégat est affiché (« N fiches portent ce nom »). Exception en mode `surface` (D17, en validation) : les pages web trouvées par nom sont affichées comme « non vérifiées », emails et numéros masqués. |
| Valeurs masquées | Les fiches correspondantes sont aussi masquées : `+41 79 ••• •• 42`, « Adresse : présente ». |
| Zéro stockage | Pas de base de données, pas de fichier, pas de `localStorage` ni de cookie contenant des données personnelles. Le conteneur est en `read_only`. |
| Aucun log de données personnelles | Aucun `console.log` d'un input ou d'une réponse d'API. Les messages d'erreur n'incluent pas le corps des réponses. |
| Données personnelles jamais dans l'URL | La recherche se fait uniquement en `POST`. |
| Clés API côté serveur uniquement | Le code serveur se trouve dans `src/server/` et est protégé par `import "server-only"`. |
| Effacement côté poste | Bouton « Effacer et terminer » et reset automatique après une période d'inactivité. |

## 3. Vue d'ensemble

```text
 ┌──────────── Navigateur (PC école, mode kiosque) ─────────────┐
 │  Formulaire + consentement → écran de résultats             │
 │  • POST uniquement, autocomplete="off", pas de localStorage  │
 │  • reset automatique après inactivité                        │
 └───────────────────────────┬──────────────────────────────────┘
                             │ POST /api/search
 ┌───────────────────────────▼──────────────────────────────────┐
 │  Route API Next.js (sans état)                               │
 │  1. valide l'input (zod) + consentement                      │
 │  2. search-service lance les providers en parallèle          │
 │  3. chaque provider : appel HTTP → parse zod → mapper        │
 │     (liste blanche, la réponse brute n'est pas transmise)    │
 │  4. domaine : matching anti-homonymes, masquage, score,      │
 │     plan d'action                                            │
 │  5. réponse : métadonnées uniquement                         │
 └───────────────────────────┬──────────────────────────────────┘
                             │
        XposedOrNot  ·  Snusbase  ·  Dehashed  ·  (autres)
```

## 4. Structure du code (Ports & Adapters)

Chaque API externe est un adaptateur qui implémente une interface commune (le
port). Le reste de l'application ne connaît que cette interface. Pour changer
ou ajouter une API, il suffit d'ajouter un dossier dans `providers/` et une
ligne dans `registry.ts`.

```text
src/
├── app/                          ← Next.js : UI + routes, aussi léger que possible
│   ├── page.tsx                  ← page d'accueil (affiche SearchApp)
│   └── api/search/route.ts       ← valide l'input, appelle le service, répond
│
├── server/                       ← code serveur uniquement (import "server-only")
│   ├── providers/
│   │   ├── types.ts              ← le port : interface BreachProvider
│   │   ├── registry.ts           ← providers actifs selon `APP_MODE` (D10)
│   │   ├── http.ts               ← appel HTTP commun (sans cache, erreurs techniques)
│   │   ├── xposedornot/          ← fuites par email
│   │   │   ├── client.ts         ← appel HTTP
│   │   │   ├── schema.ts         ← zod : forme de la réponse brute
│   │   │   ├── mapper.ts         ← brut → modèle du domaine (liste blanche)
│   │   │   └── index.ts          ← le provider (client → schema → mapper)
│   │   ├── tavily/               ← recherche web (email, téléphone, nom ; searches.ts : thèmes)
│   │   ├── searchch/             ← annuaire (téléphone, total par nom)
│   │   ├── github/               ← commits publics signés avec l'email
│   │   ├── gravatar/             ← photo de profil publique liée à l'email
│   │   ├── pgp/                  ← clé publique sur keys.openpgp.org
│   │   ├── rdap/                 ← registre du domaine de l'email (domaines perso)
│   │   ├── whatsmyname/          ← pseudo testé sur ~650 sites (liste WhatsMyName)
│   │   ├── keybase/              ← comptes prouvés d'un pseudo (rebond)
│   │   ├── orcid/                ← chercheurs au même nom
│   │   ├── wikidata/             ← personnes connues au même nom
│   │   └── wayback/              ← 2e étape : archives des pages trouvées, page supprimée ou non
│   │
│   ├── domain/                   ← logique métier pure, sans HTTP, 100 % testable
│   │   ├── types.ts              ← Finding (5 types), DataCategory, SearchQuery…
│   │   ├── matching.ts           ← email ou téléphone dans le texte ; nom et prénom ensemble
│   │   ├── masking.ts            ← masquage des valeurs (email, téléphone, nom, texte)
│   │   ├── phone.ts              ← normalisation et formats du téléphone
│   │   ├── handles.ts            ← pseudo lu dans l'adresse d'un profil
│   │   ├── pivots.ts             ← pseudos à utiliser pour le rebond
│   │   └── actions.ts            ← résultats → plan d'action
│   │
│   ├── env.ts                    ← variables d'environnement validées par zod (APP_MODE, clés)
│   ├── pivot.ts                  ← rebond : pseudos trouvés → WhatsMyName + archives X
│   └── search-service.ts         ← orchestration (Promise.allSettled + timeout, puis archives et rebond)
│
├── components/                   ← UI (shadcn/ui + composants maison)
│   ├── search-app.tsx            ← enchaînement des écrans, requête, reset, inactivité
│   ├── search-screen.tsx         ← écran de recherche (barre, aide, consentement)
│   ├── search-bar.tsx            ← barre unique : saisie, ajout et retrait d'étiquettes
│   ├── search-tag.tsx            ← une étiquette (type, valeur masquée, boutons)
│   ├── loading-screen.tsx        ← écran d'attente (sources interrogées, temps)
│   ├── results-screen.tsx        ← résultats : onglets, plan d'action, effacement
│   ├── inactivity-dialog.tsx     ← avertissement avant l'effacement automatique
│   ├── labels.ts                 ← libellés affichés (catégories, sources)
│   └── ui/                       ← composants shadcn/ui copiés dans le projet
├── lib/
│   ├── utils.ts                  ← fonction cn() pour combiner les classes Tailwind
│   └── detect.ts                 ← reconnaissance automatique de la saisie (navigateur)
└── tests/
    ├── fixtures/                 ← réponses d'API fictives (jamais de vraies données)
    └── stubs/server-only.ts      ← remplace server-only dans Vitest (voir D15)
```

À la racine du dépôt :

- `next.config.ts` : configuration Next.js (`output: "standalone"`).
- `vitest.config.mts` : configuration des tests (environnement Node, alias
  `@/`, remplacement de `server-only`).
- `components.json` : configuration de shadcn/ui (base Radix, preset Nova).
- `.env.example` : liste des variables d'environnement attendues, sans valeur.
- `AGENTS.md` : fichier généré par Next.js 16, qui demande de lire la
  documentation livrée dans `node_modules/next/dist/docs/` avant d'écrire du
  code Next.js. `next dev` le recrée s'il est supprimé.

L'interface commune à tous les providers est la suivante :

```ts
// src/server/providers/types.ts
export type QueryKind = "email" | "phone" | "name";

export type ProviderTier = "surface" | "deep";

export interface BreachProvider {
  id: string;
  tier: ProviderTier;              // registry.ts n'active "deep" qu'en mode deep (D10)
  supports: readonly QueryKind[];
  search(query: SearchQuery, signal: AbortSignal): Promise<Finding[]>;
}
```

Un provider renvoie des `Finding` de six types : `breach` (fuite), `web`
(page qui contient l'email ou le téléphone), `directory` (inscription dans
l'annuaire), `account` (trace publique liée à l'email), `profile` (compte
trouvé avec un pseudo) et `count` (total de
résultats trouvés par le nom seul, sans détail : règle anti-homonymes). Une
page `web` porte `verified: true` si elle contient l'email ou le téléphone du
visiteur, `false` si elle a été trouvée par le nom seul (D17).

### Bonnes pratiques appliquées

| Principe | Où | Pourquoi |
| --- | --- | --- |
| Parse, don't validate (zod aux frontières) | `schema.ts`, `route.ts` | Tout ce qui entre (visiteur, API) est vérifié une seule fois. À l'intérieur de l'application, les types sont fiables. |
| Le type brut ne sort jamais de l'adaptateur | `mapper.ts` | Le mot de passe est retiré à cet endroit et ne peut donc pas être affiché par erreur plus loin. |
| Domaine pur | `domain/` | Le domaine n'utilise pas `fetch` et peut être testé avec Vitest sans réseau. |
| Défaillance partielle | `search-service.ts` | Avec `Promise.allSettled` et un timeout, les autres providers répondent même si l'un d'eux est en panne. |
| `server-only` | tout `src/server/` | Le build échoue si du code serveur (et donc une clé) se retrouve dans le bundle client. |
| Tests sur fixtures fictives | `tests/fixtures/` | Aucune vraie donnée de fuite n'est versionnée. |

## 5. Stack technique

Les raisons de chaque choix et les alternatives comparées sont dans
[DECISIONS.md](DECISIONS.md). La colonne « Décision » renvoie à l'entrée
correspondante.

| Couche | Technologie | Décision |
| --- | --- | --- |
| Framework | Next.js 16 (App Router), React 19 | [D1](DECISIONS.md#d1-framework-front-et-serveur) |
| Langage | TypeScript 5 (mode strict), Node.js 24 | [D2](DECISIONS.md#d2-langage) |
| UI | Tailwind CSS 4, shadcn/ui (base Radix) | [D3](DECISIONS.md#d3-ui-et-style), [D15](DECISIONS.md#d15-mise-en-place-du-projet) |
| Animations | Framer Motion (paquet `motion`, import `motion/react`) | [D4](DECISIONS.md#d4-animations), [D22](DECISIONS.md#d22-révision-de-linterface-par-les-agents-ux-et-ui) |
| Validation | zod 4 | [D5](DECISIONS.md#d5-validation-des-données) |
| Tests | Vitest 5 | [D6](DECISIONS.md#d6-tests) |
| Qualité du code | ESLint (configuration Next.js) | [D15](DECISIONS.md#d15-mise-en-place-du-projet) |
| Exécution | Docker compose, en local | [D7](DECISIONS.md#d7-exécution-et-déploiement) |
| Sources `surface` | XposedOrNot, Tavily, search.ch, GitHub, Gravatar, keys.openpgp.org, RDAP | [D8](DECISIONS.md#d8-sources-de-données-providers), [D16](DECISIONS.md#d16-sources-du-mode-surface) |
| Sources `deep` | Services payants, selon le budget | [D12](DECISIONS.md#d12-cadre-validé-par-lenseignant) |
| Téléphone, XML | libphonenumber-js, fast-xml-parser | [D16](DECISIONS.md#d16-sources-du-mode-surface) |
| Modes | `surface` et `deep`, une image, `APP_MODE` à l'exécution | [D10](DECISIONS.md#d10-modes-surface-et-deep) |

## 6. Exécution

Le choix de Docker compose en local est expliqué dans
[DECISIONS.md, D7](DECISIONS.md#d7-exécution-et-déploiement).

- Build Docker multi-stage, Next.js en `output: "standalone"`, image
  `node:24-alpine`.
- Le conteneur tourne avec un utilisateur non-root.
- `read_only: true` et `tmpfs` sur `/tmp` : le conteneur ne peut pas écrire sur
  le disque.
- Une seule image pour les deux modes. La variable `APP_MODE` (`surface` ou
  `deep`) choisit au lancement les providers actifs
  ([DECISIONS.md, D10](DECISIONS.md#d10-modes-surface-et-deep)). Elle est
  validée par zod au démarrage. Sans précision, le conteneur démarre en
  `surface`.
- `compose.yaml` transmet les variables au conteneur avec
  `env_file: ${ENV_FILE:-.env.surface}`.
- En développement (`npm run dev`), `next.config.ts` charge le fichier
  désigné par `ENV_FILE` (par défaut `.env.surface`) avec `process.loadEnvFile`,
  car Next.js ne lit lui-même que `.env` et `.env.local`.
- Les clés API sont dans `.env.surface` et `.env.deep`, non versionnés. Le
  fichier `.env.example` est versionné et liste toutes les variables attendues,
  sans valeur.
- Le navigateur du poste est lancé avec
  `--kiosk --incognito http://localhost:3000`.

## 7. Cadre légal

L'application traite des données personnelles en Suisse. La nLPD (en vigueur
depuis le 1er septembre 2023) s'applique, et le RGPD sert de référence
complémentaire. Les mesures prises sont le consentement explicite, la
minimisation des données (métadonnées uniquement, liste blanche) et l'absence
de conservation (pas de stockage, conteneur en lecture seule, pas de logs de
données personnelles).

L'enseignant responsable autorise l'utilisation de toutes les informations
publiques, y compris les bases de données volées rendues publiques. Elles sont
interrogées par des services qui les indexent, jamais téléchargées sur le
poste ([DECISIONS.md, D12](DECISIONS.md#d12-cadre-validé-par-lenseignant)).
Les services payants suivent le budget de [BUDGET.md](BUDGET.md).

## 8. Intégration continue et réglages GitHub

Les choix sont expliqués dans
[DECISIONS.md, D13](DECISIONS.md#d13-ci-de-vérification) et
[D14](DECISIONS.md#d14-protection-de-main-et-relecture).

### Workflows GitHub Actions

| Workflow | Job | Contrôle | Déclenchement |
| --- | --- | --- | --- |
| `ci.yml` | `gitleaks-scan` | Secrets dans tout l'historique Git (gitleaks) | Chaque pull request, chaque push sur `main` |
| `docs.yml` | `markdownlint` | Structure des fichiers Markdown de `docs/` | Pull request ou push sur `main` qui modifie `docs/` |
| `docs.yml` | `link check` | Liens et ancres des fichiers de `docs/` (lychee) | Idem |

- Les actions sont épinglées par SHA de commit, avec la version en commentaire
  (`# v7.0.1`).
- Chaque workflow déclare ses permissions : lecture seule, plus l'écriture de
  commentaires de pull request pour gitleaks.
- Les règles de markdownlint sont dans `docs/.markdownlint.jsonc`. Les
  tableaux utilisent le style `| --- |` et chaque bloc de code indique un
  langage.

### Ruleset de la branche `main`

Le ruleset `main-branch` (Settings, Rules) s'applique à la branche par défaut.

| Règle | Réglage |
| --- | --- |
| Suppression de la branche | Interdite |
| Force push | Interdit |
| Pull request obligatoire | 1 approbation ; approbation annulée par un nouveau commit ; conversations résolues avant la fusion |
| Méthodes de fusion | Merge et squash |
| Checks obligatoires | `gitleaks-scan`, branche à jour avec `main` |
| Contournement | Rôle Repository admin (responsable du dépôt), toujours autorisé |

`markdownlint` et `link check` ne sont pas obligatoires : `docs.yml` ne tourne
que si `docs/` change, et un check obligatoire qui ne tourne pas bloquerait
les autres pull requests.

### Autres réglages du dépôt

| Menu | Réglage |
| --- | --- |
| General, Pull Requests | Suppression automatique de la branche après la fusion |
| Advanced Security | Secret scanning et push protection activés ; Dependabot alerts activé |
| Actions, General | Jeton des workflows en lecture seule ; les workflows ne peuvent pas approuver de pull request ; actions épinglées par SHA obligatoires ; approbation requise pour les workflows des contributeurs externes |
