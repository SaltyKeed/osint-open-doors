# Commandes du projet

Cette page décrit les commandes utilisées dans le projet : ce qu'elles font,
quand les lancer et ce qu'elles affichent. Elles se lancent depuis le dossier
du projet. Les commandes `npm run …` exécutent les scripts définis dans la
section `scripts` de `package.json`.

## Installer les dépendances

### npm ci

Installe les dépendances exactement comme elles sont notées dans
`package-lock.json`. La commande supprime d'abord le dossier `node_modules`,
puis le recrée. Elle ne modifie jamais `package.json` ni
`package-lock.json`.

À utiliser après un `git clone` et après chaque `git pull` qui change les
dépendances. C'est aussi la commande utilisée par la CI, ce qui garantit que
tout le monde travaille avec les mêmes versions.

```powershell
npm ci
```

### npm install

Sans argument, installe les dépendances de `package.json` et met à jour
`package-lock.json` si besoin. Quand `package-lock.json` change, il faut le
commiter avec le reste du travail.

```powershell
npm install
```

### npm install avec un paquet

Ajoute un paquet au projet. npm l'inscrit dans `package.json` et note la
version exacte dans `package-lock.json`.

```powershell
npm install zod
npm install -D vitest
```

Sans option, le paquet va dans `dependencies` : il est utilisé par
l'application quand elle tourne (par exemple zod). Avec `-D`, il va dans
`devDependencies` : il sert seulement à développer, à tester ou à builder
(par exemple Vitest ou ESLint).

Toute nouvelle dépendance est ajoutée comme décision dans
[DECISIONS.md](../DECISIONS.md).

## Lancer l'application

### npm run dev

Lance le serveur de développement (`next dev`). L'application est disponible
sur `http://localhost:3000` et la page se met à jour à chaque enregistrement
d'un fichier. Pour arrêter le serveur, taper Ctrl+C dans le terminal.

```powershell
npm run dev
```

### npm run build

Prépare la version de production de l'application (`next build`) dans le
dossier `.next`. La commande vérifie aussi les types TypeScript. Si tout va
bien, la sortie contient notamment :

```text
✓ Compiled successfully in 620ms
```

La durée change à chaque build. La commande se termine par la liste des
routes de l'application.

### npm run start

Lance l'application à partir du dernier build (`next start`), sur le port
3000 comme en développement. Il faut avoir lancé `npm run build` avant. Cette
commande sert à tester l'application dans les conditions de production.

```powershell
npm run build
npm run start
```

## Vérifier le code

### npm run lint

Lance ESLint sur le projet. ESLint signale les erreurs courantes et les
mauvaises pratiques de React et Next.js. Les règles viennent de
`eslint.config.mjs`. Quand il n'y a aucun problème, la commande n'affiche
rien d'autre que son nom.

```powershell
npm run lint
```

### npm run typecheck

Vérifie les types TypeScript sans produire de fichier. Le script lance deux
commandes à la suite :

```text
next typegen && tsc --noEmit
```

Next.js génère lui-même certains types dans le dossier `.next`, par exemple
`LayoutProps`, utilisé dans `src/app/layout.tsx`. `next typegen` crée ces
types sans faire de build complet. Lancé seul sur un projet qui vient d'être
cloné, `tsc` ne les trouverait pas et signalerait des erreurs. Sortie
attendue :

```text
Generating route types...
✓ Types generated successfully
```

### npm test et npm run test:watch

Lancent les tests avec Vitest. `npm test` lance tous les tests une fois et
s'arrête (`vitest run`). `npm run test:watch` reste ouvert et relance les
tests à chaque modification d'un fichier.

Sortie attendue quand tous les tests passent (le nombre de tests augmente
avec le projet) :

```text
 Test Files  1 passed (1)
      Tests  3 passed (3)
```

Un test qui échoue affiche `FAIL`, le nom du test et la ligne en cause.

## Sécurité des dépendances

### npm audit

Compare les versions installées avec la base de vulnérabilités connues de npm.
Quand aucun problème n'est trouvé, la sortie se termine par :

```text
found 0 vulnerabilities
```

### npm audit fix

Met à jour les paquets vulnérables quand une version corrigée est compatible
avec `package.json`. La commande modifie `package-lock.json`, qu'il faut
ensuite commiter. Si aucune version compatible n'existe, une solution est de
forcer la version d'un sous-paquet avec un override (section suivante).

## Le bloc overrides de package.json

Un override force la version d'un paquet installé par une autre dépendance.
Le projet en contient un :

```json
"overrides": {
  "@typescript-eslint/typescript-estree": {
    "minimatch": "^11.0.1"
  }
}
```

Il corrige l'alerte GHSA-g3hv-75wg-m249 : une vulnérabilité de gravité
moyenne dans minimatch, qui permet un déni de service. Elle est corrigée dans
minimatch 11.0.1. Le paquet `typescript-eslint` 8.72.2, utilisé par ESLint,
demande encore minimatch ^10. L'override impose minimatch 11 à cet endroit
seulement. Nous avons vérifié que `npm run lint` fonctionne toujours avec
cette version.

L'override sera retiré quand une version de `typescript-eslint` acceptera
minimatch 11.

## Avant de pousser

Avant un `git push`, lancer ces quatre commandes et corriger les erreurs :

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```
