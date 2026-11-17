# Modèle de données de l'enquête : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** écrire et tester les objets que le moteur d'enquête manipulera :
identifiant, champ de la fiche, niveau de confiance, chemin, constat, fiche,
piste de rebond, saisie du volontaire et port `Source`. Aucun appel réseau dans
cette étape.

**Architecture :** ports & adapters (`docs/ARCHITECTURE.md`, section 4). Tout
le code de ce plan est dans `src/server/domain/`, pur et testé avec Vitest.
Le port `Source` y est défini sous forme de types : les sources (étape
suivante) l'implémenteront.

**Tech Stack :** TypeScript strict, zod 4, Vitest 5, libphonenumber-js
(nouvelle dépendance, déjà prévue dans `SOURCES.md`).

**Spec :** `docs/CADRAGE.md` (sections 4 à 7), `docs/DECISIONS.md` (D19,
D25), réponses d'Enzo du 2026-11-17 (D26, tâche 12).

## Façon de travailler

- Branche `sandbox` (D19, D25 : une seule pull request vers `main` à la fin).
- Une tâche à la fois. Les tests sont écrits d'abord, lancés pour les voir
  échouer, puis le code est écrit jusqu'à ce qu'ils passent (CLAUDE.md).
- Claude explique chaque choix (pattern, structure, bibliothèque) en quelques
  phrases. Enzo relit avant de passer à la tâche suivante.
- Un commit par tâche, en anglais, style Conventional Commits.

## Global Constraints

- Code et commentaires en anglais ; libellés visibles en français.
- Tout module de `src/server/` commence par `import "server-only";`.
- Toute donnée externe passe par un schéma zod. Les messages d'erreur ne
  recopient jamais la valeur saisie.
- Fixtures et exemples inventés uniquement (`example.ch`, personnes fictives).
- Le code existant (`types.ts`, `search-query.ts`, `matching.ts`, provider
  XposedOrNot, `search-service.ts`) reste en place : la route `/api/search`
  en dépend. Il est retiré à l'étape du moteur (hors de ce plan).

## Review Focus

- Homonymes : un résultat trouvé seulement par un nom, une IP ou une
  organisation ne doit jamais être « confirmé » ni « probable » sans un autre
  identifiant confirmé. Tests : tâches 5 et 9.
- Indépendance des sources : la même fiche Pandabuy renvoyée par LeakCheck et
  par Snusbase n'est pas une deuxième preuve. Tests : tâche 8.
- Rebond sur « probable » : un seul niveau (D25). Tests : tâche 9.
- Entourage : un identifiant de proche ne repart jamais dans la boucle.
  Tests : tâche 9.
- Formats de téléphone : `079 123 45 67`, `+41 79…`, `0041…` et un numéro
  français donnent chacun une seule valeur E.164. Tests : tâche 3.

## Tâche 0 : remettre `sandbox` à jour

- [ ] `git fetch`, puis fusionner `origin/main` dans `sandbox` (une mise à
  jour Dependabot de `package.json` et `package-lock.json`).
- [ ] `npm ci`, `npm test`, `npm run typecheck` : tout passe avant de
  commencer.

## Tâche 1 : dépendance libphonenumber-js

**Files :** `package.json`, `package-lock.json`.

- [ ] `npm install libphonenumber-js` (version exacte notée dans le commit).
- [ ] Pourquoi : le prototype ne savait normaliser que les numéros suisses.
  Les fiches de fuites contiennent des numéros de tous les pays et de tous les
  formats. libphonenumber-js est la version JavaScript de la bibliothèque de
  Google, sans appel réseau ; elle sert aussi plus tard à la source « analyse
  locale du numéro » (`SOURCES.md`).

## Tâche 2 : champs de la fiche (`fiche-fields.ts`)

**Files :** create `src/server/domain/fiche-fields.ts`,
`src/server/domain/fiche-fields.test.ts`.

```ts
export const CATEGORIES = [
  { code: "A", label: "Identité" },
  // … B à J, dans l'ordre de CADRAGE.md, section 5
] as const;

export const FIELDS = [
  { code: "A1", category: "A", label: "Nom et prénom" },
  // … jusqu'à J1 : 30 champs
] as const;

export type CategoryCode = (typeof CATEGORIES)[number]["code"];
export type FieldCode = (typeof FIELDS)[number]["code"];
export const fieldCodeSchema: z.ZodType<FieldCode>;
```

Tests :

- [ ] 10 catégories (A à J) et 30 champs, dans l'ordre de la section 5.
- [ ] Chaque champ appartient à une catégorie existante ; aucun code en double.
- [ ] `fieldCodeSchema` accepte `H3`, refuse `H9` et `h3`.

Pourquoi `as const` : la liste sert à la fois de donnée (affichage, taux de
remplissage) et de type. Un code mal écrit (`"H6"`) devient une erreur de
compilation, pas un bug à l'écran.

## Tâche 3 : identifiants (`identifier.ts`)

**Files :** create `src/server/domain/identifier.ts`,
`src/server/domain/identifier.test.ts`.

```ts
export const IDENTIFIER_TYPES = [
  "EMAIL", "TEL", "PSEUDO", "NOM", "PROFIL", "DOMAINE", "IP", "ORGA",
] as const;
export type IdentifierType = (typeof IDENTIFIER_TYPES)[number];

/** Value already normalized: two equal identifiers have the same key. */
export interface Identifier {
  type: IdentifierType;
  value: string;
}

/** Returns null when the raw value is not a valid identifier of this type. */
export function normalizeIdentifier(type: IdentifierType, raw: string): Identifier | null;

/** Key used for the "already seen" set and for merging findings. */
export function identifierKey(identifier: Identifier): string;

export const UNIQUE_TYPES: readonly IdentifierType[]; // EMAIL, TEL, PROFIL, DOMAINE
```

Règles de normalisation et tests :

| Type | Normalisation | Cas testés |
| --- | --- | --- |
| `EMAIL` | Espaces retirés, minuscules, format vérifié par zod | `" Lea.Martin@Example.CH "` donne `lea.martin@example.ch` ; `lea@` donne `null` |
| `TEL` | libphonenumber-js, pays par défaut `CH`, format E.164 | `079 123 45 67`, `+41 79 123 45 67`, `0041791234567` donnent `+41791234567` ; `06 12 34 56 78` donne `+33612345678` ; `123` donne `null` |
| `PSEUDO` | Espaces retirés, `@` initial retiré, minuscules ; 1 à 64 caractères sans espace | `@LMartin_06` donne `lmartin_06` ; `lea martin` donne `null` |
| `NOM` | Espaces multiples réduits ; la valeur garde la casse et les accents | Clé : minuscules, sans accents, mots triés : `Léa Martin` et `MARTIN Lea` ont la même clé |
| `PROFIL` | URL `http` ou `https`, hôte en minuscules sans `www.`, sans `?…`, `#…` ni `/` final, en `https` | `http://www.GitHub.com/lmartin06/?tab=repos` donne `https://github.com/lmartin06` ; `javascript:…` donne `null` |
| `DOMAINE` | Minuscules, sans `www.` ni point final ; au moins un point | `WWW.LeaMartin.ch.` donne `leamartin.ch` ; `localhost` donne `null` |
| `IP` | IPv4 ou IPv6 valide (zod) | `85.1.2.3` accepté ; `999.1.2.3` donne `null` |
| `ORGA` | Espaces multiples réduits | Clé sans accents ni casse : `CPNE` et `cpne` ont la même clé |

- [ ] `identifierKey` préfixe le type : `EMAIL:lea@example.ch` et
  `PSEUDO:lea@example.ch` sont deux clés différentes.

Pourquoi normaliser à l'entrée : la boucle d'enquête s'arrête grâce à la liste
« déjà vus ». Si `079 123 45 67` et `+41791234567` étaient deux identifiants,
la même recherche partirait deux fois et la fiche aurait deux téléphones.

## Tâche 4 : pseudo rare (`rare-pseudo.ts`)

**Files :** create `src/server/domain/rare-pseudo.ts`,
`src/server/domain/rare-pseudo.test.ts`,
`src/server/domain/wordlists/first-names.json`,
`src/server/domain/wordlists/common-words.json`,
`scripts/build-wordlists.mjs`.

Listes de mots (choix d'Enzo du 2026-11-17) :

- [ ] Prénoms : liste de l'Office fédéral de la statistique (prénoms de la
  population résidante permanente, opendata.swiss). Licence à relever au
  téléchargement et à noter dans `SOURCES.md`.
- [ ] Mots courants : les 10 000 mots les plus fréquents en français, anglais
  et allemand (FrequencyWords, dérivé d'OpenSubtitles). Licence à relever au
  téléchargement.
- [ ] `scripts/build-wordlists.mjs` lit les fichiers téléchargés (chemins en
  arguments), garde les mots de 3 lettres ou plus, retire les accents, met en
  minuscules, supprime les doublons, trie, et écrit les deux JSON. Les fichiers
  téléchargés ne sont pas versionnés.

```ts
export const ABNORMAL_SITE_COUNT = 25; // to tune during the trials

export function isRarePseudo(pseudo: string, sitesFound?: number): boolean;
```

Règle (CADRAGE section 7, D25) : le pseudo sans séparateurs (`._-`) fait au
moins 6 caractères ; une fois les chiffres retirés, il reste des lettres qui
ne sont ni un prénom ni un mot courant ; et il n'est pas trouvé sur plus de
`ABNORMAL_SITE_COUNT` sites.

Tests (pseudos inventés) :

- [ ] Rares : `lmartin06`, `zorvak_ch`, `leamartin`.
- [ ] Trop courts : `lea06`, `x_y_z`.
- [ ] Prénom ou mot seul, avec ou sans chiffres : `nicolas`, `nicolas2008`,
  `dragon92`, `sunshine`, `schmetterling`.
- [ ] Que des chiffres : `123456`.
- [ ] Trouvé sur 26 sites : pas rare ; sur 25 : rare ; sans nombre : on ne
  juge que le texte.

## Tâche 5 : niveaux de confiance (`confidence.ts`)

**Files :** create `src/server/domain/confidence.ts`,
`src/server/domain/confidence.test.ts`.

```ts
/** From the weakest to the strongest. */
export const CONFIDENCE_LEVELS = ["homonyme", "possible", "probable", "confirme"] as const;
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];

export interface RecordEvidence {
  /** The identifier given to the source, and its own confidence. */
  queried: { type: IdentifierType; confidence: Confidence };
  /** The record contains an EMAIL, TEL, PROFIL or DOMAINE already confirmed. */
  linksToConfirmed: boolean;
  /** Only meaningful when queried.type is PSEUDO. */
  rarePseudo: boolean;
  /** Consistent hints: same city, same photo, same name, same birth year. */
  hints: number;
}

export function assessConfidence(evidence: RecordEvidence): Confidence;
export function isDetailed(level: Confidence): boolean; // confirme, probable
```

Règle :

| Cas | Résultat |
| --- | --- |
| `linksToConfirmed` | confirmé |
| Recherche par `EMAIL`, `TEL`, `PROFIL` ou `DOMAINE` | le niveau de l'identifiant interrogé |
| Recherche par `PSEUDO` rare avec au moins 1 indice | probable |
| Recherche par `PSEUDO` dans les autres cas | possible |
| Recherche par `NOM`, `IP` ou `ORGA` avec au moins 1 indice | possible |
| Recherche par `NOM`, `IP` ou `ORGA` sans indice | homonyme probable |

Tests :

- [ ] Une ligne de test par case du tableau.
- [ ] Recherche par `NOM` avec 3 indices mais sans identifiant confirmé : au
  mieux « possible » (un nom ne suffit jamais).
- [ ] Recherche par un `EMAIL` « probable » : résultat « probable », pas
  « confirmé ».
- [ ] `isDetailed` : vrai pour confirmé et probable seulement.

## Tâche 6 : indices cohérents (`hints.ts`)

**Files :** create `src/server/domain/hints.ts`,
`src/server/domain/hints.test.ts`.

```ts
/** What is already known about the volunteer: input context and detailed findings. */
export interface Reference {
  nameKeys: ReadonlySet<string>;   // identifierKey of confirmed NOM
  cities: ReadonlySet<string>;     // lowercased, without accents
  birthYear: number | null;
  photoUrls: ReadonlySet<string>;  // same URL only: no face recognition (CADRAGE 6.4)
}

export function countHints(candidate: Candidate, reference: Reference): number;
```

`Candidate` regroupe ce qu'une fiche trouvée contient : noms, ville, année de
naissance, adresses de photos.

Tests :

- [ ] Même ville avec une casse et des accents différents (`Neuchâtel`,
  `neuchatel`) : 1 indice.
- [ ] Même nom, même ville, même année : 3 indices.
- [ ] Année de naissance différente : 0, même si le nom est le même.
- [ ] Photo : seule la même adresse compte.

## Tâche 7 : chemin (`path.ts`)

**Files :** create `src/server/domain/path.ts`,
`src/server/domain/path.test.ts`.

```ts
export interface PathStep {
  identifier: Identifier;
  /** "saisie" for the first step, else the id of the source that found it. */
  sourceId: string;
}
export type Path = readonly PathStep[];

export function startPath(identifier: Identifier): Path;
export function extendPath(path: Path, sourceId: string, identifier: Identifier): Path;
```

Tests :

- [ ] `startPath` donne une étape `saisie`.
- [ ] `extendPath` renvoie un nouveau chemin et ne modifie pas l'ancien (deux
  rebonds depuis le même identifiant ne se mélangent pas).

Pourquoi un tableau immuable : un même identifiant donne plusieurs rebonds.
Chacun garde son propre chemin pour que l'écran puisse afficher « trouvé grâce
à : email, fuite Pandabuy, pseudo, profil Steam ».

## Tâche 8 : constats et fiche (`fiche.ts`)

**Files :** create `src/server/domain/fiche.ts`,
`src/server/domain/fiche.test.ts`.

```ts
/** One column of a leak record or one detail of an account. */
export interface Attribute {
  label: string;
  value: string;
  /** false: unknown leak column, shown under "autres données de la fuite" (D25). */
  known: boolean;
}

/** One time a source found the value. */
export interface Sighting {
  sourceId: string;
  /** Where the data comes from: breach name, site host, page host. */
  origin: string;
  /** Link to the profile or page, never a raw response. */
  evidence: string | null;
  confidence: Confidence;
  path: Path;
}

export interface Finding {
  field: FieldCode;
  value: string;
  attributes: Attribute[];
  sightings: Sighting[];
  confidence: Confidence;
  thirdParty: boolean; // J1 entourage
}

export type Fiche = Map<string, Finding>;

export function addSighting(fiche: Fiche, found: FoundValue, sighting: Sighting): Finding;
export function combineConfidence(sightings: readonly Sighting[]): Confidence;
export function fillRate(fiche: Fiche): { category: CategoryCode; filled: number; total: number }[];
```

Règles (D25 et choix d'Enzo du 2026-11-17) :

- Une valeur trouvée plusieurs fois devient un seul constat, avec la liste de
  ses sources. La clé est le champ et la valeur normalisée (email, téléphone
  avec les règles de la tâche 3 ; sinon minuscules, sans accents).
- Des valeurs différentes pour le même champ sont toutes gardées.
- Le niveau du constat est celui de la meilleure source. S'il y a au moins deux
  sources indépendantes, il monte d'un cran, une seule fois, jusqu'à
  « confirmé ». « Homonyme probable » ne monte jamais.
- Deux sources sont indépendantes si leur `origin` est différente : la fiche
  Pandabuy renvoyée par LeakCheck et par Snusbase compte une fois.
- Les attributs sont fusionnés par libellé, sans doublon.
- Taux de remplissage : un champ est rempli s'il a au moins un constat
  « confirmé » ou « probable ».

Tests :

- [ ] Même email trouvé par deux sources : un constat, deux sources.
- [ ] Possible et possible d'origines différentes : probable.
- [ ] Probable et possible d'origines différentes : confirmé.
- [ ] Probable et probable de même origine (`Pandabuy`, `pandabuy`) : probable.
- [ ] Trois sources « possible » indépendantes : probable (un seul cran).
- [ ] Homonyme et homonyme indépendants : homonyme.
- [ ] Deux villes différentes en C1 : deux constats.
- [ ] Fiche avec A1 confirmé, B1 probable et C1 possible : A = 1 sur 5,
  B = 1 sur 3, C = 0 sur 3.

## Tâche 9 : pistes de rebond (`lead.ts`)

**Files :** create `src/server/domain/lead.ts`,
`src/server/domain/lead.test.ts`.

```ts
/** An identifier waiting in the investigation queue. */
export interface Lead {
  identifier: Identifier;
  confidence: Confidence;
  path: Path;
  /** Found from a "probable" lead, or from one of its descendants. */
  viaProbable: boolean;
  thirdParty: boolean;
}

export function canPivot(lead: Lead): boolean;
export function childLead(parent: Lead, sourceId: string, identifier: Identifier,
  confidence: Confidence, thirdParty: boolean): Lead;
```

Règles (CADRAGE section 7, D25, choix d'Enzo du 2026-11-17) :

- Un proche (`thirdParty`) ne relance jamais.
- « Possible » et « homonyme probable » ne relancent jamais.
- Un `NOM` relance seulement s'il est « confirmé » (le nom saisi ou un nom
  trouvé dans une source confirmée).
- « Probable » relance sur un niveau : ce qu'il trouve ne relance que si c'est
  « confirmé ».

Tests :

- [ ] Saisie (confirmé) : relance.
- [ ] Pseudo probable trouvé depuis une saisie : relance.
- [ ] Profil probable trouvé depuis ce pseudo probable : ne relance pas.
- [ ] Email confirmé trouvé depuis ce pseudo probable : relance, et ses
  enfants aussi.
- [ ] `NOM` confirmé trouvé dans une fuite : relance ; `NOM` probable : non.
- [ ] Pseudo d'un proche, même confirmé : ne relance pas.
- [ ] Partie avant le @ (`PSEUDO` possible, matrice 6.2) : ne relance pas.

## Tâche 10 : saisie du volontaire (`investigation-input.ts`)

**Files :** create `src/server/domain/investigation-input.ts`,
`src/server/domain/investigation-input.test.ts`.

```ts
export const investigationInputSchema = z.object({
  email: z.string().optional(),
  phone: z.string().optional(),
  pseudo: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  locality: z.string().optional(),
  birthDate: z.iso.date().optional(),
  consent: z.literal(true),
});

export function toInitialLeads(input: InvestigationInput): {
  leads: Lead[];
  context: { locality: string | null; birthYear: number | null };
};
```

Tests :

- [ ] Email seul : un `Lead` `EMAIL` confirmé, chemin `saisie`.
- [ ] Les quatre identifiants : quatre leads ; prénom et nom donnent un seul
  `NOM`.
- [ ] Prénom sans nom : refusé.
- [ ] Seulement localité et date de naissance : refusé (au moins un
  identifiant).
- [ ] Case non cochée : refusé.
- [ ] Email invalide : refusé, et le message d'erreur ne contient pas la
  valeur saisie.

## Tâche 11 : masquage par champ (`masking.ts`)

**Files :** modify `src/server/domain/masking.ts`,
`src/server/domain/masking.test.ts`.

```ts
export function maskValue(field: FieldCode, value: string): string;
```

Tests :

- [ ] B1 : `lea.martin@example.ch` donne `l•••@example.ch`.
- [ ] B2 : `+41791234567` donne `+41 79 ••• •• 67` ; un numéro français garde
  l'indicatif et les deux derniers chiffres.
- [ ] H3 (mot de passe) : toujours `•••`, quelle que soit la longueur.
- [ ] H4 : `85.1.2.3` donne `85.•••.•••.•••`.
- [ ] Autres champs : première lettre et `•••`.
- [ ] Les tests existants de `maskPhone` et `maskEmail` passent toujours.

## Tâche 12 : port `Source` (`source.ts`)

**Files :** create `src/server/domain/source.ts` (types seulement, vérifiés
par `npm run typecheck`).

```ts
export type SourceStatus =
  | "found" | "not_found" | "unknown" | "quota" | "error" | "no_key";

/** What one record of a source contains, before the engine rates it. */
export interface SourceRecord {
  origin: string;
  evidence: string | null;
  values: { field: FieldCode; value: string; attributes?: Attribute[]; thirdParty?: boolean }[];
  identifiers: { identifier: Identifier; thirdParty?: boolean }[];
}

export interface SourceResult {
  status: SourceStatus;
  records: SourceRecord[];
}

export interface Source {
  id: string;
  accepts: readonly IdentifierType[];
  /** Environment variables needed; the source is skipped when one is missing (D25). */
  requiredEnv: readonly string[];
  run(identifier: Identifier, signal: AbortSignal): Promise<SourceResult>;
}
```

Pourquoi la source ne calcule pas la confiance : la règle dépend de ce que
l'enquête sait déjà (identifiants confirmés, indices). Une source décrit ce
qu'elle a trouvé ; le moteur juge. Ainsi la règle est écrite une seule fois,
dans `confidence.ts`, et pas dans chaque source.

`unknown` correspond à « un site qui ne répond pas clairement donne inconnu,
jamais trouvé » (CADRAGE section 7). L'adaptation de la console `/dev` (D18) à
ce port se fait à l'étape du moteur.

## Tâche 13 : documentation

- [ ] `DECISIONS.md` : D26, modèle de données. Contenu : libphonenumber-js ;
  listes de mots figées ; deux sources indépendantes font monter d'un cran
  (autres options : seulement probable vers confirmé ; aucune hausse) ; un nom
  confirmé relance (autre option : seulement le nom saisi) ; indépendance par
  origine ; port `Source` sans calcul de confiance. Ligne dans le
  récapitulatif.
- [ ] `ARCHITECTURE.md` : section 4 (nouveaux fichiers du domaine, port
  `Source`), section 5 (libphonenumber-js).
- [ ] `CADRAGE.md` : section 7, critère du pseudo rare défini (tâche 4) ;
  section 10, ligne « Critère de pseudo rare » marquée faite ; section 12,
  étape 6 faite.
- [ ] `SOURCES.md` : listes de prénoms et de mots, avec source et licence.
- [ ] `docs/guide/glossaire.md` : identifiant, constat, chemin, piste,
  rebond, niveau de confiance.

## Vérification

- [ ] `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`
  passent.
- [ ] Les fichiers de `docs/` passent markdownlint.
- [ ] Push de `sandbox`.

## Hors de ce plan

- Le moteur d'enquête (file, « déjà vus », streaming SSE, quotas) et le
  retrait de l'ancien code : étape du 1 au 15 décembre.
- Le dictionnaire des colonnes de fuites : avec les sources payantes.
- Le seuil `ABNORMAL_SITE_COUNT` : ajusté pendant les essais, avec la base de
  sites WhatsMyName et Maigret.
