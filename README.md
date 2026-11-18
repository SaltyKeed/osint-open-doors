# OSINT Open Doors

Outil d'enquête OSINT pour les portes ouvertes du CPNE. Un volontaire saisit
ses propres informations (email, téléphone, pseudo, nom et prénom) sur un PC
de l'école. L'outil rebondit d'une information à l'autre et reconstitue sa
fiche de vie à partir de ce qui est public et légal, avec un plan d'action
(`docs/DECISIONS.md`, T1). Aujourd'hui, une seule source est branchée :
XposedOrNot, pour les fuites liées à un email.

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
3. [Comment marche une application web](docs/guide/03-application-web.md) :
   client et serveur, requêtes HTTP, routage de Next.js, ce qui tourne où.
4. [Fichiers du projet](docs/guide/04-fichiers-du-projet.md) : rôle de chaque
   fichier et dossier du dépôt.
5. [Flux des données d'une source](docs/guide/05-flux-des-donnees.md) :
   chemin des données d'une API jusqu'à l'écran et fichier à modifier.
6. [Fonctionnement de l'enquête](docs/guide/06-fonctionnement-de-l-enquete.md) :
   identifiants, niveaux de confiance, rebonds, constats et sources,
   expliqués simplement.
7. [Glossaire](docs/guide/glossaire.md) : définition des termes techniques.

Documents de référence :

- [ARCHITECTURE.md](docs/ARCHITECTURE.md) : architecture en place, structure
  du code et CI.
- [DEVSECOPS.md](docs/DEVSECOPS.md) : CI, outils de sécurité, règles des
  workflows et réglages GitHub.
- [DECISIONS.md](docs/DECISIONS.md) : options comparées et raison de chaque
  choix.
- [BUDGET.md](docs/BUDGET.md) : services payants envisagés et leur coût.
- [IDEES.md](docs/IDEES.md) : idées d'amélioration pas encore décidées.
