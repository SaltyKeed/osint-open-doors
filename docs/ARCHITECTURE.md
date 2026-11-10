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
|---|---|
| Jamais de mot de passe ni de hash affiché | Les mappers des providers appliquent une liste blanche de champs. Le type brut ne sort jamais de l'adaptateur. |
| Pas d'exposition de tiers (homonymes) | Une fiche trouvée par nom n'est détaillée que si elle contient aussi un autre identifiant saisi par le visiteur (téléphone ou email). Sinon, seul un agrégat est affiché (« N fiches portent ce nom »). |
| Valeurs masquées | Les fiches correspondantes sont aussi masquées : `+41 79 ••• •• 42`, « Adresse : présente ». |
| Zéro stockage | Pas de base de données, pas de fichier, pas de `localStorage` ni de cookie contenant des données personnelles. Le conteneur est en `read_only`. |
| Aucun log de données personnelles | Aucun `console.log` d'un input ou d'une réponse d'API. Les messages d'erreur n'incluent pas le corps des réponses. |
| Données personnelles jamais dans l'URL | La recherche se fait uniquement en `POST`. |
| Clés API côté serveur uniquement | Le code serveur se trouve dans `src/server/` et est protégé par `import "server-only"`. |
| Effacement côté poste | Bouton « Effacer et terminer » et reset automatique après une période d'inactivité. |

## 3. Vue d'ensemble

```
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

```
src/
├── app/                          ← Next.js : UI + routes, aussi léger que possible
│   ├── page.tsx                  ← formulaire + consentement
│   └── api/search/route.ts       ← valide l'input, appelle le service, répond
│
├── server/                       ← code serveur uniquement (import "server-only")
│   ├── providers/
│   │   ├── types.ts              ← le port : interface BreachProvider
│   │   ├── registry.ts           ← providers actifs (selon les clés présentes en .env)
│   │   ├── xposedornot/
│   │   │   ├── client.ts         ← appel HTTP (fetch, timeout, clé)
│   │   │   ├── schema.ts         ← zod : forme de la réponse brute
│   │   │   └── mapper.ts         ← brut → modèle du domaine (liste blanche)
│   │   ├── snusbase/             ← même structure
│   │   └── dehashed/             ← même structure
│   │
│   ├── domain/                   ← logique métier pure, sans HTTP, 100 % testable
│   │   ├── types.ts              ← Exposure, DataCategory, SearchQuery…
│   │   ├── matching.ts           ← règle anti-homonymes
│   │   ├── masking.ts            ← masquage des valeurs
│   │   ├── severity.ts           ← score d'exposition
│   │   └── actions.ts            ← catégories exposées → plan d'action
│   │
│   └── search-service.ts         ← orchestration (Promise.allSettled + timeout)
│
├── components/                   ← UI (shadcn/ui + composants maison)
└── tests/fixtures/               ← réponses d'API fictives (jamais de vraies données)
```

L'interface commune à tous les providers est la suivante :

```ts
// src/server/providers/types.ts
export type QueryKind = "email" | "phone" | "name";

export interface BreachProvider {
  id: string;
  supports: readonly QueryKind[];
  search(query: SearchQuery, signal: AbortSignal): Promise<Exposure[]>;
}
```

### Bonnes pratiques appliquées

| Principe | Où | Pourquoi |
|---|---|---|
| Parse, don't validate (zod aux frontières) | `schema.ts`, `route.ts` | Tout ce qui entre (visiteur, API) est vérifié une seule fois. À l'intérieur de l'application, les types sont fiables. |
| Le type brut ne sort jamais de l'adaptateur | `mapper.ts` | Le mot de passe est retiré à cet endroit et ne peut donc pas être affiché par erreur plus loin. |
| Domaine pur | `domain/` | Le domaine n'utilise pas `fetch` et peut être testé avec Vitest sans réseau. |
| Défaillance partielle | `search-service.ts` | Avec `Promise.allSettled` et un timeout, les autres providers répondent même si l'un d'eux est en panne. |
| `server-only` | tout `src/server/` | Le build échoue si du code serveur (et donc une clé) se retrouve dans le bundle client. |
| Tests sur fixtures fictives | `tests/fixtures/` | Aucune vraie donnée de fuite n'est versionnée. |

## 5. Stack technique

Les raisons de chaque choix et les alternatives comparées sont dans
`DECISIONS.md`.

| Couche | Technologie |
|---|---|
| Framework | Next.js (App Router) |
| Langage | TypeScript (mode strict) |
| UI | Tailwind CSS, shadcn/ui |
| Animations | Framer Motion |
| Validation | zod |
| Tests | Vitest |
| Exécution | Docker compose, en local |
| Provider | XposedOrNot (email) ; Snusbase et Dehashed prévus (nom, téléphone) |

## 6. Exécution

- Build Docker multi-stage, Next.js en `output: "standalone"`, image
  `node:24-alpine`.
- Le conteneur tourne avec un utilisateur non-root.
- `read_only: true` et `tmpfs` sur `/tmp` : le conteneur ne peut pas écrire sur
  le disque.
- Les clés API sont dans un fichier `.env` non versionné. Le fichier
  `.env.example` est versionné et liste les variables attendues.
- Le navigateur du poste est lancé avec
  `--kiosk --incognito http://localhost:3000`.

## 7. Cadre légal

L'application traite des données personnelles en Suisse. La nLPD (en vigueur
depuis le 1er septembre 2023) s'applique, et le RGPD sert de référence
complémentaire. Les mesures prises sont le consentement explicite, la
minimisation des données (métadonnées uniquement, liste blanche) et l'absence
de conservation (pas de stockage, conteneur en lecture seule, pas de logs de
données personnelles).
