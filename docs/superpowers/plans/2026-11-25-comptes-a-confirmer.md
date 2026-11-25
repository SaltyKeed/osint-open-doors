# Comptes à confirmer et enquête complète dans /dev : plan de mise en œuvre

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** tester le moteur complet depuis `/dev`, ajouter le niveau de confiance « à confirmer » pour les comptes trouvés par pseudo, et permettre un deuxième tour d'enquête à partir des comptes que le visiteur confirme.

**Architecture:** le domaine (`src/server/domain/`) reçoit le niveau `to_confirm` et un schéma pour les données du deuxième tour. Le moteur (`investigate`) accepte une liste d'identifiants déjà cherchés. La console `/dev` reçoit un second panneau qui appelle `/api/search`, lit le flux NDJSON et propose la confirmation des comptes.

**Tech Stack:** Next.js 16 (App Router), TypeScript strict, zod 4, Vitest, Tailwind.

**Spec:** `docs/DECISIONS.md`, T9 (et T2, T4, T7 pour le contexte). `docs/CADRAGE.md`, section 7.

## Global Constraints

- Lire `CLAUDE.md` et `AGENTS.md` avant de coder (Next.js 16 : lire le guide concerné dans `node_modules/next/dist/docs/` avant d'écrire du code Next.js).
- Code, identifiants et commentaires en anglais ; documentation et textes de l'interface en français.
- Tests écrits avant le code pour le domaine et le moteur ; valeurs de test inventées (`exemple.ch`, `lmartin_06`).
- Aucun message d'erreur ni log ne contient une saisie du visiteur : messages fixes (comme `"Invalid pseudo"` dans `search-query.ts`).
- Rien n'est stocké : pas de `localStorage`, de cookie ni de fichier, côté serveur comme côté navigateur.
- Aucune nouvelle dépendance.
- Ne pas commiter, ne pas pousser : l'élève lance les commandes Git lui-même.
- Documentation sobre, sans emoji, sans séparateur `---`, tableaux au format `| --- |`. Après chaque tâche, chercher (grep) les documents qui parlent de ce qui a changé et les mettre à jour.
- Vérification de fin de tâche : `npm test`, `npx tsc --noEmit`, `npm run lint` passent ; `npx markdownlint-cli2` sur chaque fichier de `docs/` modifié.
- Les fichiers doivent garder des fins de ligne LF.

## Review Focus

- Un deuxième tour envoyé avec des listes énormes ou des valeurs invalides doit être refusé (400) sans écho de la saisie : testé en tâche 3.
- Un identifiant déjà cherché au premier tour ne doit jamais être redonné aux sources au deuxième tour, même s'il réapparaît comme nouvel identifiant : testé en tâche 3.
- Un compte « à confirmer » ne doit jamais relancer de recherche ni ajouter d'identifiant confirmé : testé en tâche 2.
- La fusion de deux constats de niveaux différents (`to_confirm` et `probable`) garde le plus sûr : testé en tâche 2.
- Le flux NDJSON peut arriver coupé au milieu d'une ligne : testé en tâche 1.

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `src/app/dev/ndjson.ts` (nouveau) | Découpe le texte reçu en événements JSON, garde la ligne incomplète |
| `src/app/dev/investigation-console.tsx` (nouveau) | Panneau « Enquête complète » : formulaire, lecture du flux, affichage, confirmation, deuxième tour |
| `src/app/dev/dev-console.tsx` | Exporte `FIELDS` pour le réutiliser |
| `src/app/dev/page.tsx` | Affiche les deux panneaux |
| `src/server/domain/confidence.ts` | Niveau `to_confirm`, nouvelle règle pour `PSEUDO` |
| `src/server/domain/follow-up.ts` (nouveau) | Schéma zod du deuxième tour |
| `src/server/investigation.ts` | Option `alreadySearched`, retrait de `existenceCheck` |
| `src/app/api/search/route.ts` | Lit le deuxième tour et le passe au moteur |

### Task 1: Mode « enquête complète » dans /dev

**Files:**

- Create: `src/app/dev/ndjson.ts`, `src/app/dev/ndjson.test.ts`, `src/app/dev/investigation-console.tsx`
- Modify: `src/app/dev/dev-console.tsx` (exporter `FIELDS`), `src/app/dev/page.tsx`
- Docs: `docs/guide/05-flux-des-donnees.md` (section « Méthode avec la console /dev »), `docs/ARCHITECTURE.md` (paragraphe sur `inspect` et la console), `docs/DECISIONS.md` (D18 : une phrase ajoutée, la console peut aussi lancer `/api/search`)

**Interfaces:**

- Consumes: `POST /api/search` (corps `{ email?, phone?, pseudo?, firstName?, lastName?, consent }`, réponse NDJSON d'`InvestigationEvent`), `type InvestigationEvent` de `@/server/investigation` (import de type seulement).
- Produces: `splitNdjson(buffer: string): { events: unknown[]; rest: string }` ; composant `InvestigationConsole` (sans props) ; `export const FIELDS` dans `dev-console.tsx`.

- [ ] **Step 1: Write the failing tests** in `src/app/dev/ndjson.test.ts`

```ts
it("parses complete lines and keeps the unfinished one", () => {
  expect(splitNdjson('{"a":1}\n{"b":2}\n{"c":')).toEqual({ events: [{ a: 1 }, { b: 2 }], rest: '{"c":' });
});
it("ignores empty lines", () => {
  expect(splitNdjson('{"a":1}\n\n')).toEqual({ events: [{ a: 1 }], rest: "" });
});
it("returns the whole text as rest when no line is complete", () => {
  expect(splitNdjson('{"a"')).toEqual({ events: [], rest: '{"a"' });
});
```

- [ ] **Step 2: Run** `npx vitest run src/app/dev/ndjson.test.ts`. Expected: FAIL, module not found.

- [ ] **Step 3: Implement `splitNdjson`** in `src/app/dev/ndjson.ts` (pas de `server-only` : il tourne dans le navigateur). Une ligne JSON invalide lève l'erreur de `JSON.parse` : c'est une console de développement.

- [ ] **Step 4: Run** the test. Expected: PASS.

- [ ] **Step 5: Build `InvestigationConsole`** (`"use client"`) in `src/app/dev/investigation-console.tsx`:
  - Formulaire avec les mêmes champs que `DevConsole` (`FIELDS` exporté depuis `dev-console.tsx`) et la case de consentement, bouton « Lancer l'enquête complète ». Les champs vides ne sont pas envoyés.
  - `fetch("/api/search", { method: "POST", ... , signal })` avec un `AbortController` : une nouvelle recherche ou le démontage du composant annule la précédente.
  - Lecture de `response.body` avec `getReader()` et `TextDecoder` (`{ stream: true }`), découpe par `splitNdjson`, ajout des événements à l'état au fur et à mesure.
  - Affichage, dans l'ordre : identifiants relancés (événements `lead` : `type:value`, confiance, chemin joint par ` → `) ; tableau des constats (`finding` : champ, valeur, confiance, sources, chemin), un constat mis à jour remplace l'ancien (clé `field` + `value`) ; sources en échec (`source-failed`) ; à la fin (`done`), le nombre de fiches « possible » et « homonyme » cachées.
  - Réponse HTTP non 200 : afficher le code et le corps, comme `DevConsole`.
  - Styles : mêmes classes Tailwind que `DevConsole` (texte foncé sur fond clair, lisible).

- [ ] **Step 6: Modify `src/app/dev/page.tsx`** : afficher `DevConsole` puis `InvestigationConsole`, chacun sous un titre (« Sources une par une », « Enquête complète »). La page reste en 404 hors développement.

- [ ] **Step 7: Docs** : mettre à jour les trois documents listés plus haut (la console a deux modes ; le mode « enquête complète » passe par `/api/search` et ne montre que les événements, jamais la réponse brute).

- [ ] **Step 8: Verify** : `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build` passent ; markdownlint sur les docs modifiés.

### Task 2: Niveau « à confirmer »

**Files:**

- Modify: `src/server/domain/confidence.ts`, `src/server/domain/confidence.test.ts`, `src/server/investigation.ts`, `src/server/investigation.test.ts`, `src/server/domain/finding.test.ts`
- Docs: `docs/CADRAGE.md` (section 7 : tableau des niveaux et diagramme Mermaid ; ligne `PSEUDO` de la matrice qui parle de T7), `docs/guide/06-fonctionnement-de-l-enquete.md` (niveaux de confiance), `docs/DECISIONS.md` (dans T7, au paragraphe « Exception », ajouter « Remplacé par T9. » ; ligne T7 du récapitulatif), `docs/SOURCES.md` si une ligne dit que les comptes WhatsMyName sont « probables »

**Interfaces:**

- Consumes: rien de la tâche 1.
- Produces: `CONFIDENCE_LEVELS = ["confirmed", "probable", "to_confirm", "possible", "namesake"] as const` ; `Evidence` garde `existenceCheck` (correction après relecture : seule une source à liste de sites donne `to_confirm`) ; `InvestigationEvent` `finding` peut porter `confidence: "to_confirm"`.

- [ ] **Step 1: Write the failing tests** in `confidence.test.ts`. Remplacer les cas qui utilisent `existenceCheck` (le champ disparaît). Base : `{ linkedToConfirmed: false, coherentHints: 0 }`, `queried: { type: "PSEUDO", confidence: "confirmed" }`.

```ts
it("asks the visitor about an account found by a rare pseudo, without hint", () => {
  expect(assessConfidence({ ...base, rarePseudo: true })).toBe("to_confirm");
});
it("keeps an account with a coherent hint probable", () => {
  expect(assessConfidence({ ...base, rarePseudo: true, coherentHints: 1 })).toBe("probable");
});
it("does not ask about a short or common pseudo", () => {
  expect(assessConfidence({ ...base, rarePseudo: false })).toBe("possible");
});
it("asks too when the pseudo searched was only probable", () => {
  expect(assessConfidence({ ...base, queried: { type: "PSEUDO", confidence: "probable" }, rarePseudo: true })).toBe("to_confirm");
});
it("never details nor rebounds an account to confirm", () => {
  expect(isDetailed("to_confirm")).toBe(false);
  expect(shouldRebound({ identifier: { type: "PROFIL", value: "https://exemple.ch/lmartin_06" }, confidence: "to_confirm", about: "subject", foundFrom: "confirmed" })).toBe(false);
});
```

In `finding.test.ts`: merging the same value found as `to_confirm` and as `probable` gives `probable`.

In `investigation.test.ts`: a fake source with `sitesChecked: 100` returns two records `{ fields: [{ field: "F2", value: "https://site-a.exemple.ch/lmartin_06" }] }` (and site-b) for the input `{ type: "PSEUDO", value: "lmartin_06" }`. Expected: two `finding` events with `confidence: "to_confirm"`, no `lead` event, `done.hidden` equal to `{ possible: 0, namesake: 0 }`. Remplacer le test existant qui attendait « probable » pour ce cas (T7).

- [ ] **Step 2: Run** `npx vitest run src/server/domain src/server/investigation.test.ts`. Expected: the new tests FAIL (`"probable"` or `"possible"` received).

- [ ] **Step 3: Implement** in `confidence.ts` : ajouter `to_confirm` entre `probable` et `possible` ; règle `PSEUDO` : rare et au moins un indice cohérent donne `probable`, rare sans indice donne `to_confirm`, sinon `possible`. Retirer `existenceCheck` d'`Evidence` et de l'appel dans `investigation.ts`. `capAt` et `surer` fonctionnent par l'ordre de `CONFIDENCE_LEVELS` : ne pas les réécrire. Mettre à jour les commentaires qui citent T7 et celui de l'événement `finding` (« confirmed, probable or to confirm »).

- [ ] **Step 4: Run** the tests. Expected: PASS. Then `npm test` (toute la suite) and `npx tsc --noEmit`: tout passe (corriger les endroits qui énumèrent les niveaux, par exemple un `Record<Confidence, ...>`).

- [ ] **Step 5: Docs** : mettre à jour les documents listés. Dans CADRAGE, la ligne « À confirmer » : condition « `PSEUDO` rare et pas courant, sans indice cohérent », affiché « À la fin, pour confirmation par le visiteur », rebond « Non (oui une fois confirmé, T9) ». Le diagramme : la branche `PSEUDO` a trois sorties.

- [ ] **Step 6: Verify** : `npm test`, `npx tsc --noEmit`, `npm run lint`, markdownlint.

### Task 3: Deuxième tour

**Files:**

- Create: `src/server/domain/follow-up.ts`, `src/server/domain/follow-up.test.ts`
- Modify: `src/server/investigation.ts`, `src/server/investigation.test.ts`, `src/app/api/search/route.ts`, `src/app/dev/investigation-console.tsx`
- Docs: `docs/ARCHITECTURE.md` (paragraphe `/api/search`), `docs/guide/06-fonctionnement-de-l-enquete.md` (une section courte « Deuxième tour »), `docs/guide/04-fichiers-du-projet.md` (arborescence : `follow-up.ts`, `ndjson.ts`, `investigation-console.tsx`)

**Interfaces:**

- Consumes: `to_confirm` (tâche 2) ; `InvestigationConsole` et `splitNdjson` (tâche 1) ; `normalizeIdentifier`, `IDENTIFIER_TYPES` de `identifier.ts`.
- Produces:
  - `MAX_CONFIRMED_PROFILES = 60`, `MAX_SEARCHED = 300`
  - `followUpSchema` : entrée `{ confirmedProfiles?: string[]; searched?: { type: IdentifierType; value: string }[] }`, sortie `FollowUp`
  - `interface FollowUp { confirmedProfiles: Identifier[]; searched: Identifier[] }` (listes vides par défaut)
  - `InvestigationOptions.alreadySearched?: readonly Identifier[]`

- [ ] **Step 1: Write the failing tests** in `follow-up.test.ts`

```ts
it("turns confirmed profile addresses into PROFIL identifiers", () => {
  expect(followUpSchema.parse({ confirmedProfiles: ["HTTPS://Site-A.exemple.ch/lmartin_06/"] })).toEqual({
    confirmedProfiles: [{ type: "PROFIL", value: "https://site-a.exemple.ch/lmartin_06" }],
    searched: [],
  });
});
it("normalizes the identifiers already searched", () => {
  expect(followUpSchema.parse({ searched: [{ type: "EMAIL", value: "Lea@Exemple.ch" }] }).searched).toEqual([
    { type: "EMAIL", value: "lea@exemple.ch" },
  ]);
});
it.each<[unknown, string]>([
  [{ confirmedProfiles: ["javascript:alert(1)"] }, "not http or https"],
  [{ confirmedProfiles: Array(61).fill("https://exemple.ch/a") }, "more than 60 profiles"],
  [{ searched: Array(301).fill({ type: "EMAIL", value: "a@exemple.ch" }) }, "more than 300 identifiers"],
  [{ searched: [{ type: "INCONNU", value: "x" }] }, "unknown type"],
  [{ searched: [{ type: "TEL", value: "12345" }] }, "invalid value"],
])("rejects %o (%s)", (input) => {
  expect(followUpSchema.safeParse(input).success).toBe(false);
});
it("does not echo the visitor's input in the error", () => {
  const result = followUpSchema.safeParse({ searched: [{ type: "TEL", value: "079 999 88" }] });
  expect(JSON.stringify(result.error)).not.toMatch(/999 88/);
});
```

In `investigation.test.ts`:

- "does not search again what was already searched": inputs `[email]`, `alreadySearched: [email]`, a source accepting `EMAIL` : `investigate` of the source is never called, `done` is emitted.
- "still treats an already searched input as confirmed": inputs `[email, profil]` with `profil = { type: "PROFIL", value: "https://site-a.exemple.ch/lmartin_06" }`, `alreadySearched: [email]` ; a source accepting `PROFIL` returns a record with field `A1` "Léa Martin" and identifier `email` ; expected: the `A1` finding has `confidence: "confirmed"` and the `EMAIL` source is not called.
- "skips a lead that was searched in the first round": a source returns as new identifier a value that is in `alreadySearched` ; expected: no `lead` event for it.

- [ ] **Step 2: Run** `npx vitest run src/server/domain/follow-up.test.ts src/server/investigation.test.ts`. Expected: FAIL (module not found ; the source is called).

- [ ] **Step 3: Implement** `follow-up.ts` (`import "server-only"`, zod) : chaque valeur passe par `normalizeIdentifier` ; une valeur invalide ajoute une erreur au message fixe (`"Invalid profile"`, `"Invalid identifier"`), comme le téléphone dans `search-query.ts`. Dans `investigate`, avant la boucle des saisies, ajouter la clé (`identifierKey`) de chaque élément de `alreadySearched` à `queued` ; les saisies restent ajoutées à `confirmedKeys` même si elles ne sont pas remises dans la file.

- [ ] **Step 4: Run** the tests. Expected: PASS.

- [ ] **Step 5: Modify `src/app/api/search/route.ts`** : valider le même corps avec `searchRequestSchema` et `followUpSchema` (zod ignore les clés de l'autre schéma) ; si l'un échoue, `invalidRequest()`. Appeler `investigate([...queryIdentifiers(query.data), ...followUp.data.confirmedProfiles], SOURCES, { signal: request.signal, alreadySearched: followUp.data.searched })`.

- [ ] **Step 6: Modify `InvestigationConsole`** :
  - Après `done`, s'il y a des constats `to_confirm` de champ `F2`, afficher la liste « Ces comptes portent ton pseudo. Lesquels sont à toi ? » avec une case par compte (adresse cliquable, `rel="noreferrer"`, `target="_blank"`) et le bouton « Continuer l'enquête ».
  - Le bouton envoie à `/api/search` les champs du premier formulaire, `consent`, `confirmedProfiles` (adresses cochées) et `searched` : les saisies du premier tour sous forme d'identifiants (`email` → `EMAIL`, `phone` → `TEL`, `pseudo` → `PSEUDO`, prénom et nom → `NOM` « prénom nom ») et tous les identifiants reçus dans les événements `lead`.
  - Avant le deuxième tour : les comptes cochés passent en « confirmé » dans le tableau, les autres constats `to_confirm` sont retirés. Les événements du deuxième tour s'ajoutent à ceux du premier.

- [ ] **Step 7: Docs** : mettre à jour les documents listés (le deuxième tour, les deux listes envoyées par le navigateur, leurs limites, et le fait qu'un compte confirmé ne relance rien tant qu'aucune source n'accepte `PROFIL`).

- [ ] **Step 8: Verify** : `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, markdownlint sur les docs modifiés.
