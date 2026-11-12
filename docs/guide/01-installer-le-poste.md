# Installer le poste

Cette page explique comment installer les outils nécessaires sur un PC
Windows, puis récupérer le projet. Les commandes se lancent dans un terminal
PowerShell.

## Node.js 24 LTS

Node.js exécute Next.js, les tests et le build. Il est livré avec npm, le
gestionnaire de paquets qui installe les dépendances du projet. Le projet
utilise Node.js 24 ; la raison est expliquée dans
[DECISIONS.md, D16](../DECISIONS.md#d16-version-de-nodejs).

```powershell
winget install OpenJS.NodeJS.LTS --version 24.22.1
```

L'option `--version` est nécessaire : sans elle, winget installe la dernière
LTS, c'est-à-dire Node.js 26.

Fermer le terminal et en ouvrir un nouveau, pour qu'il trouve les commandes
`node` et `npm`. Ensuite, vérifier les versions :

```powershell
node --version
npm --version
```

Résultat attendu :

```text
v24.22.1
11.19.1
```

Pour npm, n'importe quelle version 11.x convient.

## Git

Git garde l'historique du code et permet de le partager avec GitHub. Vérifier
qu'il est installé :

```powershell
git --version
```

La commande affiche une ligne qui commence par `git version`. Si elle n'est
pas trouvée, installer Git avec winget :

```powershell
winget install Git.Git
```

## GitHub CLI

La GitHub CLI (`gh`) permet de travailler avec GitHub depuis le terminal, par
exemple pour ouvrir une pull request.

```powershell
winget install GitHub.cli
```

Après avoir rouvert le terminal, vérifier l'installation, puis se connecter à
son compte GitHub :

```powershell
gh --version
gh auth login
```

`gh auth login` pose quelques questions dans le terminal et ouvre le
navigateur pour valider la connexion.

## Récupérer le projet

Cloner le dépôt, entrer dans le dossier, puis installer les dépendances :

```powershell
git clone https://github.com/SaltyKeed/osint-open-doors.git
cd osint-open-doors
npm ci
```

`npm ci` installe exactement les versions notées dans `package-lock.json`. Le
détail de cette commande et des suivantes est dans
[Commandes du projet](02-commandes.md).

Pour vérifier que tout fonctionne, lancer `npm run dev` et ouvrir l'adresse
affichée dans le terminal (`http://localhost:3000`). La page par défaut de
Next.js s'affiche.

## Docker Desktop

Docker Desktop servira plus tard à exécuter l'application sur le PC des
portes ouvertes ([DECISIONS.md, D7](../DECISIONS.md#d7-exécution-et-déploiement)).
Il n'est pas nécessaire pour l'instant.
