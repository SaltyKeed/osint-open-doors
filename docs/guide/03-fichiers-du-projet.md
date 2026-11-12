# Fichiers du projet

Cette page présente les fichiers et dossiers du dépôt, leur rôle et ceux qui
ne sont pas versionnés. L'organisation du code est décrite dans
[ARCHITECTURE.md, section 4](../ARCHITECTURE.md#4-structure-du-code-ports--adapters).

## Racine du dépôt

| Élément | Rôle | Versionné |
| --- | --- | --- |
| `.env.example` | Liste des variables d'environnement attendues, sans secret ; modèle pour `.env.surface` et `.env.deep` | Oui |
| `.claude/` | Réglages de Claude Code pour le projet et sous-agents | Oui |
| `.git/` | Historique Git du dépôt, géré par Git | Non |
| `.gitattributes` | Fins de ligne : tous les fichiers texte sont enregistrés en LF | Oui |
| `.github/workflows/` | Workflows de la CI (GitHub Actions) | Oui |
| `.gitignore` | Fichiers et dossiers que Git doit ignorer | Oui |
| `.next/` | Résultat de `npm run dev` et `npm run build`, recréé à chaque fois | Non |
| `AGENTS.md` | Règles écrites par Next.js pour les assistants de code | Oui |
| `CLAUDE.md` | Règles du projet pour Claude Code | Oui |
| `README.md` | Présentation du projet et démarrage rapide | Oui |
| `docs/` | Documentation du projet | Oui |
| `eslint.config.mjs` | Configuration d'ESLint | Oui |
| `next-env.d.ts` | Types de Next.js, généré automatiquement | Non |
| `next.config.ts` | Configuration de Next.js | Oui |
| `node_modules/` | Dépendances installées par `npm ci` | Non |
| `package.json` | Nom du projet, scripts et dépendances | Oui |
| `package-lock.json` | Versions exactes de toutes les dépendances | Oui |
| `public/` | Fichiers statiques servis tels quels | Oui |
| `src/` | Code de l'application | Oui |
| `tsconfig.json` | Configuration de TypeScript | Oui |
| `tsconfig.tsbuildinfo` | Cache de TypeScript, généré automatiquement | Non |
| `vitest.config.mts` | Configuration de Vitest (tests) | Oui |

Les dossiers non versionnés sont recréés par les outils : `node_modules/` par
`npm ci`, `.next/` par Next.js, `.git/` par `git clone`. Ils ne doivent pas
être modifiés à la main.

## Le dossier src aujourd'hui

Le dossier `src/` contient la page par défaut de Next.js et le premier module
serveur :

```text
src/
├── app/
│   ├── favicon.ico
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── server/
│   ├── env.ts
│   └── env.test.ts
└── tests/
    └── server-only-stub.ts
```

- `layout.tsx` est la mise en page commune à toutes les pages : il contient
  les balises `<html>` et `<body>` et charge les polices et `globals.css`.
- `page.tsx` est la page d'accueil, affichée à l'adresse `/`. Elle sera
  remplacée par le formulaire de recherche.
- `globals.css` importe Tailwind CSS et définit les couleurs et les polices
  de base.
- `favicon.ico` est l'icône affichée dans l'onglet du navigateur.

- `server/env.ts` lit la variable `APP_MODE` et la valide avec zod au
  démarrage. Sans valeur, le mode est `surface` ; une valeur inconnue arrête
  l'application (voir [DECISIONS.md, D10](../DECISIONS.md#d10-modes-surface-et-deep)).
- `server/env.test.ts` contient les tests de `env.ts`. Chaque test est placé
  à côté du fichier qu'il teste.
- `tests/server-only-stub.ts` est un fichier vide. Dans les tests, il remplace
  le paquet `server-only`, qui lève une erreur hors du serveur Next.js.

Avec l'App Router, chaque dossier de `src/app/` correspond à une route, et le
fichier `page.tsx` qu'il contient est la page affichée.

## Le dossier src prévu

La structure cible (`server/`, `providers/`, `domain/`, `components/`,
`tests/fixtures/`) est décrite et expliquée dans
[ARCHITECTURE.md, section 4](../ARCHITECTURE.md#4-structure-du-code-ports--adapters).
Les dossiers sont créés au fil des tâches du
[plan](../superpowers/plans/2026-11-11-socle-et-premier-provider.md).

## package.json et package-lock.json

`package.json` décrit le projet : son nom, ses scripts (`dev`, `build`,
`lint`…) et ses dépendances. Une version peut y être écrite comme une plage.
Par exemple, `"@types/node": "^24"` accepte la dernière version 24.x
disponible.

`package-lock.json` est le lockfile : il note la version exacte installée de
chaque paquet, y compris les dépendances des dépendances. Il est commité, pour
que `npm ci` installe les mêmes versions chez les deux élèves et dans la CI.
Il est modifié par npm, jamais à la main.

Le bloc `overrides` de `package.json` est expliqué dans
[Commandes du projet](02-commandes.md#le-bloc-overrides-de-packagejson).

## tsconfig.json

Configuration du compilateur TypeScript. Les options importantes pour le
projet :

- `strict: true` active toutes les vérifications strictes, par exemple
  l'interdiction d'utiliser une valeur qui peut être `null` sans la tester
  ([DECISIONS.md, D2](../DECISIONS.md#d2-langage)).
- `noUncheckedIndexedAccess: true` considère qu'un accès par index peut
  échouer : `array[0]` a le type `T | undefined`, il faut donc vérifier la
  valeur avant de l'utiliser.
- `paths` définit l'alias `@/`, qui pointe vers `src/`. On écrit
  `import … from "@/server/env"` au lieu d'un chemin relatif comme
  `../../server/env`.

## next.config.ts

Configuration de Next.js.

- `cacheComponents` et `partialPrefetching` sont activés par défaut dans les
  projets créés avec `create-next-app` pour Next.js 16. Ils concernent la mise
  en cache et le préchargement des pages.
- Le bloc `turbopack` branche Tailwind CSS sur les fichiers CSS : chaque
  fichier `*.css` passe par le loader `@tailwindcss/turbopack`, qui génère
  les classes Tailwind utilisées dans le code.

## eslint.config.mjs

Configuration d'ESLint. Elle reprend les règles fournies par Next.js
(`core-web-vitals` pour React et Next.js, `typescript` pour TypeScript) et
liste les dossiers ignorés : `.next/`, `out/`, `build/` et `next-env.d.ts`.

## AGENTS.md et CLAUDE.md

`AGENTS.md` est écrit par Next.js 16 pour les assistants de code. Il leur
demande de lire la documentation de Next.js installée dans
`node_modules/next/dist/docs/`, car Next.js 16 change des API connues.
`npm run dev` recrée ce fichier s'il manque et rétablit son bloc de règles
s'il a été modifié. Il est donc commité, sinon il apparaîtrait comme un
changement à chaque lancement.

`CLAUDE.md` contient les règles du projet pour Claude Code. Il importe
`AGENTS.md` avec la ligne `@AGENTS.md`.

## .gitignore

Liste ce que Git ne doit pas versionner : `node_modules/`, `.next/`, les
fichiers générés par TypeScript et les fichiers personnels de Claude Code
(`CLAUDE.local.md`, `.claude/settings.local.json`).

Tous les fichiers `.env*` sont ignorés, car ils contiendront les clés API.
Seul `.env.example` est versionné : il listera les variables attendues, sans
valeur.

## next-env.d.ts

Fichier de types généré par Next.js, par exemple à chaque `npm run dev` ou
`npm run build`. Il ne doit pas être modifié et n'est pas versionné.

## public

Fichiers statiques servis tels quels à la racine du site : `public/next.svg`
est accessible à l'adresse `/next.svg`. Les fichiers actuels sont les images
de la page par défaut de Next.js.

## .github

Le dossier `workflows/` contient les workflows GitHub Actions. `ci.yml`
cherche des secrets avec gitleaks à chaque pull request. `app.yml` lance le
lint, le typage, les tests et le build. `docs.yml` vérifie les fichiers de
`docs/` quand ils changent.

`dependabot.yml` indique à Dependabot quelles dépendances surveiller (paquets
npm et actions GitHub) et quand proposer des mises à jour. Le détail est dans
[DEVSECOPS.md](../DEVSECOPS.md).

## docs

Documentation du projet. Les fichiers principaux sont listés dans le
[README](../../README.md). Le dossier `docs/superpowers/plans/` contient les
plans de travail, et `docs/guide/` ce guide.

## .claude

Réglages de Claude Code partagés par les deux élèves. `settings.json` déclare
les plugins utilisés et désactive l'attribution automatique dans les commits.
`agents/` contient les sous-agents décrits dans `CLAUDE.md`.
