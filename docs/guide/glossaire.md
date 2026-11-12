# Glossaire

Termes utilisés dans la documentation du projet, classés par ordre
alphabétique. Le terme anglais est indiqué entre parenthèses quand il est
différent.

## App Router

Façon d'organiser une application Next.js dans le dossier `src/app/` : chaque
dossier correspond à une route et son fichier `page.tsx` est la page affichée.
Voir [Fichiers du projet](03-fichiers-du-projet.md#le-dossier-src-aujourdhui)
et [DECISIONS.md, D1](../DECISIONS.md#d1-framework-front-et-serveur).

## Build

Étape qui transforme le code source en une version optimisée, prête à être
exécutée en production. Dans le projet, elle se lance avec `npm run build`.
Voir [Commandes du projet](02-commandes.md#npm-run-build).

## Check obligatoire (required status check)

Contrôle de la CI qui doit réussir pour qu'une pull request puisse être
fusionnée dans `main`. Aujourd'hui, seul `gitleaks-scan` est obligatoire. Voir
[ARCHITECTURE.md, section 8](../ARCHITECTURE.md#ruleset-de-la-branche-main).

## CI, intégration continue (continuous integration)

Contrôles lancés automatiquement par GitHub Actions à chaque pull request ou
push sur `main`. Voir [DECISIONS.md, D13](../DECISIONS.md#d13-ci-de-vérification).

## Dépendance (dependency)

Paquet npm utilisé par l'application quand elle tourne, par exemple `next` ou
`react`. Elle est listée dans la section `dependencies` de `package.json`.
Voir [Commandes du projet](02-commandes.md#npm-install-avec-un-paquet).

## Dépendance de développement (devDependency)

Paquet npm qui sert seulement à développer, tester ou builder, par exemple
ESLint ou TypeScript. Elle est listée dans `devDependencies` et s'installe avec
`npm install -D`. Voir
[Commandes du projet](02-commandes.md#npm-install-avec-un-paquet).

## ESLint

Outil qui analyse le code et signale les erreurs courantes et les mauvaises
pratiques. Il se lance avec `npm run lint`. Voir
[Commandes du projet](02-commandes.md#npm-run-lint).

## Fixture

Fichier de données fictives utilisé par les tests, par exemple une réponse
d'API inventée. Dans le projet, les fixtures ne contiennent jamais de vraies
données de fuite. Voir
[ARCHITECTURE.md, section 4](../ARCHITECTURE.md#4-structure-du-code-ports--adapters).

## Lockfile

Fichier qui note la version exacte de chaque paquet installé. Pour npm, c'est
`package-lock.json`. Voir
[Fichiers du projet](03-fichiers-du-projet.md#packagejson-et-package-lockjson).

## LTS (Long Term Support)

Version de Node.js qui reçoit des correctifs de sécurité pendant une longue
période, jusqu'au 30 avril 2028 pour Node.js 24. Le projet utilise Node.js 24
LTS. Voir
[DECISIONS.md, D16](../DECISIONS.md#d16-version-de-nodejs).

## Mapper

Fonction qui transforme la réponse brute d'une API en objets du domaine. Elle
ne recopie que les champs d'une liste blanche, ce qui empêche par exemple un
mot de passe d'arriver jusqu'à l'écran. Voir
[ARCHITECTURE.md, section 2](../ARCHITECTURE.md#2-invariants-non-négociables).

## npm

Gestionnaire de paquets livré avec Node.js. Il installe les dépendances et
lance les scripts de `package.json`. Voir
[Commandes du projet](02-commandes.md).

## Override

Règle de `package.json` qui force la version d'un paquet installé par une
autre dépendance, par exemple pour corriger une vulnérabilité. Voir
[Commandes du projet](02-commandes.md#le-bloc-overrides-de-packagejson).

## Port et adaptateur (ports and adapters)

Organisation du code où le reste de l'application ne connaît qu'une interface
commune (le port). Chaque API externe est un adaptateur qui implémente cette
interface. Voir
[ARCHITECTURE.md, section 4](../ARCHITECTURE.md#4-structure-du-code-ports--adapters).

## Pull request

Demande d'intégrer le travail d'une branche dans `main`. Elle permet de relire
le code et de lancer la CI avant la fusion. Voir
[DECISIONS.md, D14](../DECISIONS.md#d14-protection-de-main-et-relecture).

## Route handler

Fichier `route.ts` de l'App Router qui répond à une requête HTTP au lieu
d'afficher une page. La recherche passera par le route handler
`src/app/api/search/route.ts`. Voir
[ARCHITECTURE.md, section 4](../ARCHITECTURE.md#4-structure-du-code-ports--adapters).

## Ruleset

Ensemble de règles GitHub qui protège une branche, par exemple en imposant
une pull request et des checks obligatoires avant la fusion. Voir
[ARCHITECTURE.md, section 8](../ARCHITECTURE.md#ruleset-de-la-branche-main).

## server-only

Paquet npm importé au début des fichiers de `src/server/`. Si un de ces
fichiers se retrouve dans le code envoyé au navigateur, le build échoue, ce
qui protège les clés API. Voir
[ARCHITECTURE.md, section 4](../ARCHITECTURE.md#4-structure-du-code-ports--adapters).

## TypeScript strict

Réglage de TypeScript qui active toutes les vérifications strictes des types.
Le projet ajoute aussi `noUncheckedIndexedAccess`. Voir
[Fichiers du projet](03-fichiers-du-projet.md#tsconfigjson) et
[DECISIONS.md, D2](../DECISIONS.md#d2-langage).

## Vitest

Outil qui lance les tests automatiques du projet. Il se lance avec `npm test`.
Voir [Commandes du projet](02-commandes.md#npm-test-et-npm-run-testwatch) et
[DECISIONS.md, D6](../DECISIONS.md#d6-tests).

## zod

Bibliothèque qui vérifie qu'une donnée a la forme attendue, par exemple une
saisie du visiteur ou une réponse d'API. Toute donnée externe passe par un
schéma zod. Voir
[DECISIONS.md, D5](../DECISIONS.md#d5-validation-des-données).
