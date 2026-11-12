# OSINT Open Doors

Outil de sensibilisation pour les portes ouvertes du CPNE. Un visiteur teste
ses propres informations (email, téléphone, nom et prénom) sur un PC de
l'école et voit dans quelles fuites de données elles apparaissent, avec un plan
d'action.

## Démarrage rapide

Prérequis : Node.js 24 et Git, installés comme décrit dans
[Installer le poste](docs/guide/01-installer-le-poste.md).

```powershell
npm ci
npm run dev
```

Ouvrir ensuite `http://localhost:3000` dans le navigateur.

## Documentation

Guide, à lire dans l'ordre :

1. [Installer le poste](docs/guide/01-installer-le-poste.md) : Node.js, Git,
   GitHub CLI et première installation.
2. [Commandes du projet](docs/guide/02-commandes.md) : rôle et résultat de
   chaque commande npm.
3. [Fichiers du projet](docs/guide/03-fichiers-du-projet.md) : rôle de chaque
   fichier et dossier du dépôt.
4. [Glossaire](docs/guide/glossaire.md) : définition des termes techniques.

Documents de référence :

- [ARCHITECTURE.md](docs/ARCHITECTURE.md) : architecture en place, structure
  du code et CI.
- [DEVSECOPS.md](docs/DEVSECOPS.md) : CI, outils de sécurité, règles des
  workflows et réglages GitHub.
- [DECISIONS.md](docs/DECISIONS.md) : options comparées et raison de chaque
  choix.
- [BUDGET.md](docs/BUDGET.md) : services payants envisagés et leur coût.
- [IDEES.md](docs/IDEES.md) : idées d'amélioration pas encore décidées.
