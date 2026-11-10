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

## 5. Choix de la stack

Les choix ont été faits selon trois critères :

1. Une seule codebase pour le front et le serveur, car la clé API doit rester
   côté serveur.
2. Une mise en place rapide et une interface soignée pour les visiteurs.
3. Un intérêt pour notre formation : des outils standards, bien documentés et
   réutilisables après le projet.

### 5.1 Framework (front et serveur)

| Option | Avantages | Inconvénients |
|---|---|---|
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

### 5.2 Langage

| Option | Avantages | Inconvénients |
|---|---|---|
| **TypeScript strict (retenu)** | Erreurs détectées avant l'exécution ; garantit qu'un type « brut » (avec mot de passe) ne peut pas atteindre l'UI ; autocomplétion. | Un peu plus verbeux ; les erreurs de typage peuvent être difficiles à comprendre au début. |
| JavaScript | Aucune configuration. | Rien n'empêche de passer `rawRecord.password` à un composant par erreur, ce qui n'est pas acceptable avec des données sensibles. |

TypeScript en mode strict est retenu parce que le système de types sert aussi
de protection pour la sécurité, et pas seulement de confort de développement.

### 5.3 UI et style

| Option | Avantages | Inconvénients |
|---|---|---|
| **Tailwind + shadcn/ui (retenu)** | Le code des composants est copié dans le projet (lisible, modifiable) ; accessible (Radix) ; design moderne par défaut. | HTML chargé de classes ; apparence « shadcn » courante, à personnaliser. |
| MUI (Material UI) | Très complet. | Apparence « Google » difficile à personnaliser ; lourd ; ne permet pas d'apprendre le CSS. |
| Chakra UI / Mantine | Rapides à prendre en main, bonne documentation. | Composants peu modifiables, moins de contrôle. |
| CSS Modules / CSS pur | Permet de vraiment apprendre le CSS ; aucune dépendance. | Beaucoup plus long pour obtenir un rendu soigné ; tout est à coder (modales, accessibilité…). |
| Bootstrap | Connu, simple. | Apparence datée. |

Tailwind et shadcn/ui sont retenus parce qu'ils permettent d'obtenir
rapidement une interface soignée tout en gardant un code que nous comprenons,
puisque les composants font partie du projet. La solution de repli est Mantine.

### 5.4 Animations

| Option | Avantages | Inconvénients |
|---|---|---|
| **Framer Motion (Motion) (retenu)** | API déclarative simple ; animations en cascade faciles à écrire. | Augmente la taille du bundle (négligeable en local). |
| Animations CSS / Tailwind | Aucune dépendance, performant. | Fastidieux pour enchaîner des animations. |
| GSAP | Très complet (timelines complexes). | Trop puissant pour nos besoins ; API impérative moins naturelle en React. |

Framer Motion est retenu parce qu'il permet de réaliser les animations prévues
(scan, cartes qui apparaissent une par une) avec peu de code.

### 5.5 Validation des données

| Option | Avantages | Inconvénients |
|---|---|---|
| **zod (retenu)** | Un même schéma fournit la validation à l'exécution et le type TypeScript ; très répandu. | Un peu plus lourd que Valibot. |
| Valibot | Même principe, beaucoup plus léger. | Moins répandu, moins d'exemples. |
| Validation manuelle | Aucune dépendance. | Verbeux, oublis fréquents, types et validation désynchronisés. |

zod est retenu parce que les réponses de Snusbase et Dehashed sont des données
que nous ne contrôlons pas. Si leur format change, l'application rejette la
réponse au lieu d'afficher des informations incorrectes.

### 5.6 Tests

| Option | Avantages | Inconvénients |
|---|---|---|
| **Vitest (retenu)** | Rapide, presque aucune configuration, TypeScript natif ; API compatible avec Jest. | Un peu moins de ressources disponibles que pour Jest. |
| Jest | Le plus connu. | Configuration TypeScript/ESM pénible, plus lent. |
| Playwright (E2E) | Teste le parcours complet dans un vrai navigateur. | Plus lent ; à ajouter plus tard en complément. |

Vitest est retenu pour les tests. Playwright pourra être ajouté plus tard pour
tester le parcours complet.

### 5.7 Exécution et déploiement

| Option | Avantages | Inconvénients |
|---|---|---|
| **Docker compose en local (retenu)** | Reproductible sur n'importe quel PC ; `read_only` garantit l'absence de stockage ; aucune donnée n'est envoyée à un hébergeur. | Docker Desktop doit être installé sur le PC de l'école (droits administrateur). |
| `npm run start` direct | Le plus simple. | Dépend de la configuration du poste ; pas d'isolation. |
| Vercel / cloud | Déploiement en un clic. | Les logs de la plateforme échappent à notre contrôle, on ne peut donc plus garantir l'absence de stockage ; inutile pour un seul PC. |

Docker compose est retenu, avec la configuration suivante :

- build multi-stage, Next.js en `output: "standalone"`, image `node:24-alpine` ;
- utilisateur non-root ;
- `read_only: true` et `tmpfs` sur `/tmp`, ce qui empêche le conteneur d'écrire
  sur le disque ;
- clés API dans un fichier `.env` (non versionné) ; le fichier `.env.example`
  est versionné.

### 5.8 Sources de données (providers)

| Provider | Recherche | Coût | Rôle |
|---|---|---|---|
| **XposedOrNot (retenu)** | Email | Gratuit | Premier provider implémenté. |
| Have I Been Pwned | Email | Payant (abonnement mensuel) | Remplaçant ou complément possible ; clé et comptes de test disponibles. |
| Snusbase | Email, nom, téléphone… | Payant | Recherche par nom ou téléphone ; les réponses contiennent des données en clair, qui sont filtrées par la liste blanche. |
| Dehashed | Email, nom, téléphone… | Payant | Même usage que Snusbase. |

Remarque : Snusbase et Dehashed renvoient des données volées en clair. Leur
utilisation doit être validée par l'enseignant responsable, et les invariants
de la section 2 s'appliquent sans exception.

### 5.9 Récapitulatif

| Couche | Choix | Plan B |
|---|---|---|
| Framework | Next.js (App Router) | Vite + React + Express |
| Langage | TypeScript strict | Aucun |
| UI | Tailwind + shadcn/ui | Mantine |
| Animations | Framer Motion | CSS pur |
| Validation | zod | Valibot |
| Tests | Vitest (+ Playwright plus tard) | Jest |
| Exécution | Docker compose (local) | `npm run start` |
| Premier provider | XposedOrNot | Have I Been Pwned |

## 6. Cadre légal

L'application traite des données personnelles en Suisse. La nLPD (en vigueur
depuis le 1er septembre 2023) s'applique, et le RGPD sert de référence
complémentaire. Les mesures prises sont le consentement explicite, la
minimisation des données (métadonnées uniquement, liste blanche) et l'absence
de conservation (pas de stockage, conteneur en lecture seule, pas de logs de
données personnelles).
