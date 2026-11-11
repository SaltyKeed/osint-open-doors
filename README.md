# OSINT Open Doors

Outil de sensibilisation pour les portes ouvertes du CPNE. Un visiteur teste
ses propres informations (email, téléphone, nom et prénom) et voit ce qu'on
peut trouver sur lui en ligne, avec un plan d'action.

L'architecture est décrite dans [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
et les choix du projet dans [docs/DECISIONS.md](docs/DECISIONS.md).

## Prérequis

- Node.js 24 et npm.
- Docker Desktop pour l'exécution sur le poste de l'école (à venir).

## Installation

```
npm ci
```

Copier `.env.example` en `.env`, puis renseigner les clés API. Le fichier
`.env` n'est jamais versionné : le dépôt est public, aucune clé ne doit y
apparaître.

## Commandes

| Commande | Rôle |
|---|---|
| `npm run dev` | Lance l'application en développement sur http://localhost:3000 |
| `npm run build` | Construit la version de production (`.next/standalone`) |
| `npm run start` | Lance la version construite |
| `npm run lint` | Vérifie le code avec ESLint |
| `npm run typecheck` | Vérifie les types TypeScript |
| `npm test` | Lance les tests Vitest une fois |
| `npm run test:watch` | Relance les tests à chaque modification |
