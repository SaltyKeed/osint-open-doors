# Modèle de données de l'enquête : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** écrire et tester les objets que le moteur d'enquête manipulera :
champs de la fiche, identifiants, pseudo rare, niveaux de confiance, constats
et port `Source`. Issue #63.

**Architecture :** ports & adapters (`docs/ARCHITECTURE.md`, section 4). Tout
le code est dans `src/server/domain/`, pur, sans appel réseau, testé avec
Vitest. Le port `Source` y est défini sous forme de types ; XposedOrNot
l'implémentera dans #64.

**Tech Stack :** TypeScript strict, zod 4, Vitest. Aucune nouvelle dépendance.

**Spec :** `docs/CADRAGE.md` (sections 4 à 7), `docs/DECISIONS.md` (T1).

## Façon de travailler

- Branche `feat/investigation-model`, depuis `main`.
- Tiago écrit le code et les tests (`CLAUDE.local.md`). Le plan donne les
  noms, les signatures et les cas à tester ; il ne donne pas le corps des
  fonctions ni le code des tests.
- Pour chaque tâche : écrire les tests, les voir échouer, écrire le code,
  les voir passer, commit. Claude relit avant la tâche suivante.
- À la fin, Tiago explique en quelques phrases ce qu'il a fait et pourquoi.

## Notions à connaître

| Notion | Où elle sert | Documentation |
| --- | --- | --- |
| Types littéraux et unions (`"A1" \| "A2"`) | Codes des champs, types d'identifiants, niveaux de confiance | [TypeScript, Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html) |
| `as const` et `(typeof X)[number]` | Déduire une union d'un tableau, pour n'écrire la liste qu'une fois | [TypeScript, Typeof Type Operator](https://www.typescriptlang.org/docs/handbook/2/typeof-types.html) |
| Formats zod (`z.email()`, `z.ipv4()`, `z.url()`) | Valider un identifiant sans écrire de regex | [zod, API](https://zod.dev/api) |
| `it.each` | Un test par ligne d'un tableau de cas | [Vitest, API](https://vitest.dev/api/) |
| `satisfies` | Vérifier qu'un objet respecte une interface sans perdre son type | [TypeScript 4.9](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html) |
| Diagrammes Mermaid | Diagrammes de la documentation, affichés par GitHub | [GitHub, Creating diagrams](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/creating-diagrams) |

## Global Constraints

- Code et commentaires en anglais ; libellés visibles et documentation en
  français.
- Tout nouveau module de `src/server/domain/` commence par
  `import "server-only";`, comme les modules existants.
- Une fonction qui reçoit une valeur invalide renvoie `null` ; elle ne lance
  pas d'erreur qui contiendrait la valeur.
- Fixtures inventées uniquement (`example.ch`, personnes fictives).
- Le code existant (`types.ts`, `search-query.ts`, `masking.ts`, provider XposedOrNot, `search-service.ts`) ne change pas : la
  route `/api/search` en dépend. Il est remplacé dans #64 et #65.
- Les noms de code suivent la spec en anglais : `Finding` pour constat,
  `Identifier` pour identifiant, `Confidence` pour niveau de confiance.

## Review Focus

- Homonymes : un résultat trouvé par un nom, une IP ou une organisation,
  sans lien avec un identifiant confirmé, n'est jamais « confirmé » ni
  « probable ». Tests : tâche 4.
- Entourage : un identifiant trouvé dans la fiche d'un proche ne relance
  jamais de recherche. Tests : tâche 4.
- Rebond en chaîne : ce qu'un identifiant « probable » trouve ne relance une
  recherche que si c'est « confirmé ». Sans cette règle, l'enquête dérive
  d'homonyme en homonyme. Tests : tâche 4.
- Même valeur sous deux formes (`079 123 45 67` et `+41791234567`,
  `Lea@Example.ch` et `lea@example.ch`) : un seul constat. Tests : tâches 2
  et 5.
- Saisie vide ou faite d'espaces : aucun identifiant, pas d'erreur. Tests :
  tâche 2.

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `src/server/domain/fiche-fields.ts` | Codes et libellés des champs de la fiche (A1 à J1) |
| `src/server/domain/identifier.ts` | Types d'identifiants, normalisation, clé unique |
| `src/server/domain/pseudo.ts` | Règle du pseudo rare |
| `src/server/domain/confidence.ts` | Niveaux de confiance et règle de rebond |
| `src/server/domain/finding.ts` | Constat et fusion des constats en double |
| `src/server/domain/source.ts` | Port `Source` : ce qu'une source reçoit et renvoie |

Chaque fichier a son test à côté (`*.test.ts`), comme le domaine existant.

## Tâche 1 : champs de la fiche

**Files :** create `src/server/domain/fiche-fields.ts`,
`src/server/domain/fiche-fields.test.ts`.

**Interfaces :**

- Produces : `FIELD_CODES` (tableau `as const` des 30 codes, dans l'ordre de
  `CADRAGE.md`, section 5), `type FieldCode`, `FIELD_LABELS:
  Record<FieldCode, string>` (libellés français de la section 5).

- [x] **Étape 1 : tests**

| Test | Attendu |
| --- | --- |
| nombre de champs | `FIELD_CODES` a 30 éléments |
| ordre | commence par `"A1"`, finit par `"J1"` ; `"H3"` vient après `"H2"` |
| pas de doublon | `new Set(FIELD_CODES).size` vaut 30 |
| libellés | chaque code a un libellé non vide ; `FIELD_LABELS.B2` vaut `"Numéros de téléphone"` |

- [x] **Étape 2 :** `npx vitest run src/server/domain/fiche-fields.test.ts`
  échoue (module introuvable).
- [x] **Étape 3 :** écrire `fiche-fields.ts`. `FieldCode` est déduit de
  `FIELD_CODES`, pas écrit une deuxième fois.
- [x] **Étape 4 :** le test passe ; `npm run typecheck` passe.
- [x] **Étape 5 :** commit `feat(domain): add life record field codes`.

Question : pourquoi `Record<FieldCode, string>` oblige-t-il à écrire un
libellé pour chaque code, et que se passe-t-il au typecheck si on en oublie
un ?

## Tâche 2 : identifiants

**Files :** create `src/server/domain/identifier.ts`,
`src/server/domain/identifier.test.ts`.

**Interfaces :**

- Consumes : `normalizeEmail`, `normalizeSwissPhone` de `search-query.ts`.
- Produces :
  - `IDENTIFIER_TYPES` (`as const` : `EMAIL`, `TEL`, `PSEUDO`, `NOM`,
    `PROFIL`, `DOMAINE`, `IP`, `ORGA`) et `type IdentifierType`
  - `interface Identifier { type: IdentifierType; value: string }`
  - `normalizeIdentifier(type: IdentifierType, raw: string): Identifier | null`
  - `identifierKey(id: Identifier): string`, de la forme `"EMAIL:lea@example.ch"`

- [ ] **Étape 1 : tests**

| Type | Entrée | Attendu |
| --- | --- | --- |
| `EMAIL` | `" Lea.Martin@Example.CH "` | `{ type: "EMAIL", value: "lea.martin@example.ch" }` |
| `EMAIL` | `"pas-un-email"` | `null` |
| `TEL` | `"079 123 45 67"` | valeur `"+41791234567"` |
| `TEL` | `"+33 6 12 34 56 78"` | `null` (voir le raccourci plus bas) |
| `PSEUDO` | `"@LMartin_06"` | valeur `"lmartin_06"` (sans `@`, en minuscules) |
| `NOM` | `"  Léa   Martin "` | valeur `"Léa Martin"` (espaces réduits, casse gardée) |
| `PROFIL` | `"HTTPS://GitHub.com/lmartin06/"` | valeur `"https://github.com/lmartin06"` |
| `PROFIL` | `"javascript:alert(1)"` | `null` (seulement `http` et `https`) |
| `DOMAINE` | `"WWW.LeaMartin.ch"` | valeur `"leamartin.ch"` |
| `IP` | `"85.1.2.3"` | valeur `"85.1.2.3"` |
| `IP` | `"999.1.2.3"` | `null` |
| `ORGA` | `" CPNE "` | valeur `"CPNE"` |
| tous | `""` et `"   "` | `null` |

Et `identifierKey` : deux saisies différentes du même email donnent la même
clé ; un `PSEUDO` et un `NOM` de même texte donnent deux clés différentes.

- [ ] **Étape 2 :** le test échoue.
- [ ] **Étape 3 :** écrire `identifier.ts`. Un `switch` sur le type ; les
  formats zod pour `EMAIL` et `IP` (`safeParse`, jamais `parse`) ; `new URL()`
  dans un `try` pour `PROFIL`. Pour `TEL`, réutiliser `normalizeSwissPhone`
  avec ce commentaire au-dessus :
  `// shortcut: Swiss numbers only; switch to libphonenumber-js when a source returns foreign numbers.`
- [ ] **Étape 4 :** le test passe ; `npm run typecheck` passe.
- [ ] **Étape 5 :** commit `feat(domain): add investigation identifiers`.

Questions :

- Pourquoi la casse d'un `NOM` est-elle gardée, alors que celle d'un
  `PSEUDO` est mise en minuscules ?
- Pourquoi `identifierKey` contient-il le type, et pas seulement la valeur ?

## Tâche 3 : pseudo rare

**Files :** create `src/server/domain/pseudo.ts`,
`src/server/domain/pseudo.test.ts`.

**Interfaces :**

- Produces : `isRarePseudo(pseudo: string): boolean`. Reçoit un pseudo déjà
  normalisé (tâche 2).

Règle (`CADRAGE.md`, section 7) : au moins 6 caractères et au moins une
lettre. Pas de liste de prénoms ou de mots courants : un mot courant comme
`thomas` est attrapé par le moteur, parce qu'il existe sur un nombre anormal
de sites (#65). Une liste (prénoms de l'OFS) sera ajoutée seulement si les
essais sur volontaires montrent des homonymes. Options comparées dans T2.

- [ ] **Étape 1 : tests**

| Pseudo | Attendu | Raison |
| --- | --- | --- |
| `"lmartin_06"` | `true` | |
| `"lea"` | `false` | moins de 6 caractères |
| `"123456"` | `false` | aucune lettre |
| `"thomas_vs_42"` | `true` | |
| `"thomas"` | `true` | limite connue : attrapé par le nombre de sites (#65) |
| `"azerty"` | `true` | limite connue : attrapé par le nombre de sites (#65) |

- [ ] **Étape 2 :** le test échoue.
- [ ] **Étape 3 :** écrire `pseudo.ts` (une seule expression booléenne).
- [ ] **Étape 4 :** le test passe.
- [ ] **Étape 5 :** commit `feat(domain): add rare pseudo rule`.

## Tâche 4 : niveaux de confiance et rebond

**Files :** create `src/server/domain/confidence.ts`,
`src/server/domain/confidence.test.ts` ; delete
`src/server/domain/matching.ts` et `src/server/domain/matching.test.ts`
(ancienne règle anti-homonymes, remplacée par les niveaux de confiance en T1 ;
aucun code de l'application ne les appelle).

**Interfaces :**

- Consumes : `IdentifierType`, `Identifier` (tâche 2).
- Produces :
  - `CONFIDENCE_LEVELS` (`as const`, du plus sûr au moins sûr : `confirmed`,
    `probable`, `possible`, `namesake`) et `type Confidence`
  - `interface Evidence { queried: { type: IdentifierType; confidence: Confidence }; linkedToConfirmed: boolean; rarePseudo: boolean; coherentHints: number }`
  - `assessConfidence(evidence: Evidence): Confidence`
  - `isDetailed(confidence: Confidence): boolean` : vrai pour `confirmed`
    et `probable`
  - `shouldRebound(lead: { identifier: Identifier; confidence: Confidence; about: "subject" | "relative"; foundFrom: Confidence }): boolean`

Règles de `assessConfidence`, dans cet ordre (`CADRAGE.md`, section 7) :

1. La fiche contient un `EMAIL`, un `TEL` ou un `PROFIL` déjà confirmé
   (`linkedToConfirmed`) : `confirmed`.
2. Recherche faite avec un identifiant unique (`EMAIL`, `TEL`, `PROFIL`,
   `DOMAINE`) : le résultat a la confiance de cet identifiant.
3. Recherche faite avec un `PSEUDO` : `probable` s'il est rare et qu'il y a
   au moins un indice cohérent, sinon `possible`.
4. Recherche faite avec un `NOM` : `possible` s'il y a au moins un indice
   cohérent, sinon `namesake`.
5. Recherche faite avec une `IP` ou une `ORGA` : `possible`.

Pour les règles 2 à 5, le résultat ne dépasse pas la confiance de
l'identifiant recherché. La règle 1 n'a pas cette limite : un lien avec un
identifiant déjà confirmé suffit.

Règles de `shouldRebound` : jamais pour un `NOM`, jamais pour un proche
(`about: "relative"`), jamais en dessous de `probable`. Si l'identifiant a
été trouvé à partir d'un identifiant `probable` (`foundFrom`), il doit être
`confirmed`.

- [ ] **Étape 1 : tests**

`assessConfidence` :

| Recherche | Lien confirmé | Pseudo rare | Indices | Attendu |
| --- | --- | --- | --- | --- |
| `NOM` confirmé | oui | non | 0 | `confirmed` |
| `EMAIL` confirmé | non | non | 0 | `confirmed` |
| `EMAIL` probable | non | non | 0 | `probable` |
| `PSEUDO` confirmé | non | oui | 1 | `probable` |
| `PSEUDO` confirmé | non | oui | 0 | `possible` |
| `PSEUDO` confirmé | non | non | 2 | `possible` |
| `NOM` confirmé | non | non | 1 | `possible` |
| `NOM` confirmé | non | non | 0 | `namesake` |
| `PSEUDO` probable | oui | non | 0 | `confirmed` |
| `IP` confirmé | non | non | 3 | `possible` |
| `PSEUDO` probable | non | oui | 1 | `probable` |

`shouldRebound` :

| Identifiant | Confiance | Proche | Trouvé depuis | Attendu |
| --- | --- | --- | --- | --- |
| `PSEUDO` | `probable` | non | `confirmed` | `true` |
| `NOM` | `confirmed` | non | `confirmed` | `false` |
| `EMAIL` | `confirmed` | oui | `confirmed` | `false` |
| `EMAIL` | `possible` | non | `confirmed` | `false` |
| `PSEUDO` | `probable` | non | `probable` | `false` |
| `EMAIL` | `confirmed` | non | `probable` | `true` |

- [ ] **Étape 2 :** le test échoue.
- [ ] **Étape 3 :** écrire `confidence.ts`. Pour « ne dépasse pas »,
  comparer les positions dans `CONFIDENCE_LEVELS`.
- [ ] **Étape 4 :** supprimer `matching.ts` et `matching.test.ts` ; `npm test`
  et `npm run typecheck` passent.
- [ ] **Étape 5 :** commit `feat(domain): add confidence levels and rebound rule`.

Questions :

- Pourquoi un `NOM` qui a un lien confirmé devient-il `confirmed`, alors
  qu'un `NOM` ne relance jamais de recherche ?
- La règle « depuis probable, seulement confirmé » vient de D25 de
  `sandbox`. Elle limite les rebonds en chaîne. Si tu la gardes, elle va dans
  T2 ; sinon, retire les deux dernières lignes du tableau.

## Tâche 5 : constats

**Files :** create `src/server/domain/finding.ts`,
`src/server/domain/finding.test.ts`.

**Interfaces :**

- Consumes : `FieldCode` (tâche 1), `Identifier` (tâche 2), `Confidence`,
  `CONFIDENCE_LEVELS` (tâche 4), `normalizeEmail`, `normalizeSwissPhone`.
- Produces :
  - `interface Finding { field: FieldCode; value: string; sources: string[]; confidence: Confidence; path: Identifier[] }`.
    `sources` contient les `id` des sources ; `path` va de l'identifiant
    saisi à celui qui a donné le constat.
  - `mergeFindings(findings: Finding[]): Finding[]`

`mergeFindings` regroupe les constats de même champ et de même valeur. La
comparaison des valeurs passe par `normalizeEmail` pour `B1`, par
`normalizeSwissPhone` (ou la valeur telle quelle s'il renvoie `null`) pour
`B2`, et par `trim` et minuscules pour les autres champs. Le constat fusionné
garde la première forme rencontrée de la valeur, l'union des sources sans
doublon, la confiance la plus haute et le chemin le plus court.

- [x] **Étape 1 : tests**

| Cas | Attendu |
| --- | --- |
| `B2` `"079 123 45 67"` (source `a`) et `"+41791234567"` (source `b`) | un constat, sources `["a", "b"]` |
| `B1` `"Lea@Example.ch"` et `"lea@example.ch"` | un constat |
| même valeur, champs `C1` et `C2` | deux constats |
| `C1` `"Neuchâtel"` et `"Lausanne"` | deux constats : les valeurs contradictoires sont toutes gardées |
| même constat `possible` puis `probable` | confiance `probable` |
| chemins de longueur 3 et 1 | chemin de longueur 1 |
| même source deux fois | elle apparaît une fois |
| liste vide | liste vide |

- [x] **Étape 2 :** le test échoue.
- [x] **Étape 3 :** écrire `finding.ts` (une `Map` dont la clé est le champ
  et la valeur comparée).
- [x] **Étape 4 :** le test passe.
- [x] **Étape 5 :** commit `feat(domain): add findings and merge rule`.

## Tâche 6 : port Source

**Files :** create `src/server/domain/source.ts`,
`src/server/domain/source.test.ts`.

**Interfaces :**

- Consumes : `FieldCode`, `Identifier`, `IdentifierType`.
- Produces :
  - `interface SourceRecord { about: "subject" | "relative"; fields: { field: FieldCode; value: string }[]; identifiers: Identifier[] }` :
    une fiche renvoyée par une source (une ligne de fuite, un profil). La
    source ne calcule pas la confiance : le moteur le fait (#65), parce que
    lui seul connaît les identifiants déjà confirmés.
  - `interface SourceInspection { raw: unknown; parsed: unknown; records: SourceRecord[] }` :
    même rôle que `Inspection` aujourd'hui, pour la console `/dev` (D18).
  - `interface Source { id: string; accepts: readonly IdentifierType[]; investigate(input: Identifier, signal: AbortSignal): Promise<SourceRecord[]>; inspect(input: Identifier, signal: AbortSignal): Promise<SourceInspection> }`

- [ ] **Étape 1 : test.** Une source factice déclarée avec
  `satisfies Source`, qui accepte `EMAIL` et renvoie une fiche fixe. Le test
  vérifie que `investigate` renvoie cette fiche. Son vrai rôle est le
  typecheck : si le port change, la source factice ne compile plus.
- [ ] **Étape 2 :** `npm run typecheck` échoue (module introuvable).
- [ ] **Étape 3 :** écrire `source.ts` (types seulement, plus
  `import "server-only";`).
- [ ] **Étape 4 :** le test et `npm run typecheck` passent.
- [ ] **Étape 5 :** commit `feat(domain): add Source port`.

Question : pourquoi la source renvoie-t-elle des `SourceRecord` et pas
directement des `Finding` ?

## Tâche 7 : documentation et diagrammes

**Files :** modify `docs/DECISIONS.md`, `docs/ARCHITECTURE.md`, `CLAUDE.md`,
`docs/CADRAGE.md`.

Les diagrammes sont écrits en Mermaid, dans le document qui les explique :
GitHub les affiche, et ils changent dans la même pull request que le texte.
Pas de dossier `docs/diagrams` : un diagramme séparé de son texte n'est plus
mis à jour.

- [ ] **T2 dans `DECISIONS.md`** : « Modèle de données de l'enquête ».
  Options comparées pour la confiance (calculée par la source ou par le
  moteur, retenu : le moteur) et pour le rebond en chaîne (garder ou non la
  règle de la tâche 4) et pour le pseudo rare (liste à la main, prénoms de
  l'OFS, modèle de Markov de Perito et al. 2011, retenu : règle minimale et
  nombre de sites mesuré par le moteur). Raccourci noté : téléphone suisse
  seulement. Suppression de `matching.ts`, remplacé
  par `confidence.ts`.
- [ ] **`ARCHITECTURE.md`, section 4** : sous-section « Modèle de l'enquête »
  avec un diagramme de classes (`classDiagram`) de `Source`, `SourceRecord`,
  `Identifier`, `Finding` et `Confidence`, et le rôle de chaque fichier de la
  tâche. Préciser que l'ancien modèle (`Exposure`, `BreachProvider`) reste
  jusqu'à #64.
- [ ] **`CADRAGE.md`, section 7** : remplacer le pseudo-code de la boucle par
  un diagramme de flux (`flowchart`), et ajouter un diagramme de décision de
  la confiance qui suit les règles de la tâche 4.
- [x] **`CLAUDE.md`, Style des documents** : règle des diagrammes Mermaid
  (fait avec la tâche 4).
- [x] **Guide simple** `docs/guide/05-fonctionnement-de-l-enquete.md` :
  identifiants, fiche, niveaux de confiance, rebonds, avec diagrammes (fait
  avec la tâche 4). À compléter avec les constats (tâche 5) et le port
  `Source` (tâche 6).
- [ ] **Vérification** : `npx markdownlint-cli2 "docs/**/*.md"` passe ;
  aperçu des diagrammes sur la pull request GitHub.
- [ ] **Commit** `docs: document investigation data model (T2)`.

## Vérification finale

- [ ] `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`
  passent.
- [ ] Pull request avec `Closes #63`.

## Hors de ce plan

- Saisie du volontaire et identifiants de départ : #48 et #65.
- Calcul des indices cohérents et du nombre anormal de sites pour un
  pseudo : #65.
- Masquage par champ avec le bouton « œil » : #31.
- Diagrammes de l'architecture actuelle (vue d'ensemble, flux d'une
  recherche) : à faire avec #64, quand l'ancien modèle disparaît.
