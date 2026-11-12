# Socle du projet et premier provider : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** poser le squelette Next.js, la CI de l'application, le domaine et le
provider XposedOrNot, jusqu'à une route `POST /api/search` qui renvoie de
vraies fuites par email.

**Architecture :** ports & adapters décrit dans `docs/ARCHITECTURE.md`,
section 4. Le domaine (`src/server/domain/`) est pur et testé sans réseau.
Chaque provider valide la réponse brute avec zod puis la transforme en objets
du domaine avec une liste blanche de champs.

**Tech Stack :** Node 24 (D16), Next.js 16 App Router, TypeScript strict,
Tailwind, zod 4, Vitest 5, `server-only`, GitHub Actions.

**Spec :** `docs/ARCHITECTURE.md` (sections 2 et 4), `docs/DECISIONS.md`
(D5, D6, D7, D8, D10, D13, D14), `CLAUDE.md`.

## Façon de travailler

- Une étape à la fois. Claude écrit le code d'une tâche et explique chaque
  choix ; Tiago relit, pose ses questions, lance les commandes, puis fait le
  commit. On passe à la tâche suivante seulement quand la précédente est
  comprise.
- Une branche et une pull request par étape : `chore/scaffold`,
  `chore/ci-app`, `feat/domain`, `feat/xposedornot`.
- Les tests sont écrits avant le code pour le domaine, les mappers et les
  providers (CLAUDE.md).

## Global Constraints

- Code et commentaires en anglais ; documentation et messages visibles en
  français.
- TypeScript `strict: true` et `noUncheckedIndexedAccess: true`.
- Toute donnée externe (saisie, réponse d'API, variables d'environnement)
  passe par un schéma zod.
- Tout module de `src/server/` commence par `import "server-only";`.
- Aucun message d'erreur ni log ne contient une saisie du visiteur ou un corps
  de réponse : uniquement l'identifiant du provider et le code HTTP.
- Fixtures inventées uniquement (domaines en `.test`, personnes fictives).
- Aucune clé API dans la CI. XposedOrNot n'en demande pas pour la recherche
  par email.
- Actions GitHub épinglées par SHA de commit, avec la version en commentaire.

## Review Focus

- Quota XposedOrNot (25 requêtes par heure et par adresse IP) : une réponse
  429 doit apparaître comme « provider en échec » dans le résultat, sans faire
  échouer la recherche. Tests : tâche 8 (429) et tâche 10 (provider en échec).
  Les solutions durables sont à analyser dans `DECISIONS.md`, D15.
- Email avec `+` ou caractères spéciaux (`jean+test@exemple.ch`) : il doit
  être encodé dans l'URL de l'API. Test : tâche 8.
- Réponse « non trouvé » : XposedOrNot peut renvoyer un 404 ou un 200 dont
  tous les champs valent `null`. Les deux donnent une liste vide. Tests :
  tâche 8.
- Saisie renvoyée dans une erreur : une requête invalide ne doit jamais
  recopier l'email ou le téléphone dans la réponse. Tests : tâches 8 et 11.
- Formats de téléphone suisses (`079 123 45 67`, `+41 79…`, `0041…`) : tous
  normalisés vers le même numéro, sinon la règle anti-homonymes échoue.
  Tests : tâches 4 et 6.

## Étape 1 : squelette du projet (branche `chore/scaffold`)

### Tâche 1 : Node et projet Next.js

**Files :**

- Create : `package.json`, `package-lock.json`, `tsconfig.json`,
  `next.config.ts`, `eslint.config.mjs`, `AGENTS.md`, `src/app/*`, `public/*`
  (générés)
- Modify : `.gitignore` (fusion avec celui de Next.js)

**Notions :** rôle de `package.json` et du lockfile, `npm ci` contre
`npm install`, options strictes de TypeScript.

- [ ] **Step 1 : installer Node 24 LTS** (D16).

Run : `winget install OpenJS.NodeJS.LTS --version 24.22.1` (sans
`--version`, winget installerait Node 26). Dans un nouveau terminal :
`node --version`
Expected : `v24.22.1`

- [ ] **Step 2 : générer le projet dans un dossier temporaire**, car
  `create-next-app` refuse un dossier qui contient déjà `docs/` et `.github/`.

Run (depuis `LABO/`) :

```bash
npx create-next-app@16 next-tmp --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
```

Expected : `Success! Created next-tmp`

- [ ] **Step 3 : copier dans le dépôt** tout le contenu de `next-tmp/` sauf
  `.git/`, `node_modules/` et `README.md`, fusionner les deux `.gitignore`,
  puis supprimer `next-tmp/`.

- [ ] **Step 4 : durcir `tsconfig.json`** : ajouter
  `"noUncheckedIndexedAccess": true` dans `compilerOptions` (`strict` est déjà
  à `true`).

- [ ] **Step 5 : ajouter les scripts** dans `package.json` :
  `"typecheck": "next typegen && tsc --noEmit"`, `"test": "vitest run"`,
  `"test:watch": "vitest"` (Vitest arrive à la tâche 2).

- [ ] **Step 6 : vérifier**

Run : `npm ci && npm run lint && npm run typecheck && npm run build`
Expected : aucune erreur, `Compiled successfully`. `npm run dev` affiche la
page par défaut sur `http://localhost:3000`.

### Tâche 2 : Vitest, zod et premier module testé (`env.ts`)

**Files :**

- Create : `vitest.config.mts`, `src/server/env.ts`, `src/server/env.test.ts`,
  `src/tests/server-only-stub.ts`
- Modify : `package.json` (dépendances), `docs/ARCHITECTURE.md` (section 4 :
  tests à côté du fichier testé, `*.test.ts`)

**Interfaces :**

- Produces : `type AppMode = "surface" | "deep"`,
  `loadEnv(source?: Record<string, string | undefined>): { APP_MODE: AppMode }`

**Notions :** cycle rouge, vert, refactor ; pourquoi zod valide aussi les
variables d'environnement (D10, règle 1) ; pourquoi `server-only` doit être
remplacé dans les tests.

- [ ] **Step 1 : installer les dépendances**

Run : `npm install zod server-only` puis `npm install -D vitest`

- [ ] **Step 2 : créer `vitest.config.mts`** avec `environment: "node"`, l'alias
  `@` vers `src/` et l'alias `server-only` vers
  `src/tests/server-only-stub.ts` (fichier vide `export {};`). Le vrai paquet
  lève une erreur hors du serveur Next.js, ce qui ferait échouer tous les
  tests.

- [ ] **Step 3 : écrire le test qui échoue** (`src/server/env.test.ts`)

```ts
describe("loadEnv", () => {
  it("defaults to surface when APP_MODE is missing", () => {
    expect(loadEnv({})).toEqual({ APP_MODE: "surface" });
  });
  it("accepts deep", () => {
    expect(loadEnv({ APP_MODE: "deep" })).toEqual({ APP_MODE: "deep" });
  });
  it("rejects an unknown mode without echoing it", () => {
    expect(() => loadEnv({ APP_MODE: "prod" })).toThrow("Invalid environment: APP_MODE");
    expect(() => loadEnv({ APP_MODE: "prod" })).not.toThrow(/prod/);
  });
});
```

- [ ] **Step 4 : lancer le test**

Run : `npm test`
Expected : FAIL, `loadEnv` introuvable.

- [ ] **Step 5 : implémenter `loadEnv` dans `src/server/env.ts`** avec un
  `z.object({ APP_MODE: z.enum(["surface", "deep"]).default("surface") })`.
  En cas d'échec, lever `new Error("Invalid environment: " + noms des champs)`.

- [ ] **Step 6 : relancer**

Run : `npm test && npm run typecheck`
Expected : 3 tests PASS.

- [ ] **Step 7 : commit, push, pull request**

```bash
git switch -c chore/scaffold
git add .
git commit -m "chore: scaffold Next.js app with Vitest and env validation"
git push -u origin chore/scaffold
```

## Étape 2 : CI de l'application (branche `chore/ci-app`)

### Tâche 3 : workflow `app.yml` et check obligatoire

**Files :**

- Create : `.github/workflows/app.yml`
- Modify : `docs/ARCHITECTURE.md` (section 8, tableau des workflows et
  ruleset), `docs/DECISIONS.md` (D13, une phrase ; récapitulatif)

**Interfaces :**

- Consumes : scripts `lint`, `typecheck`, `test` (tâches 1 et 2)
- Produces : check `app-checks`

**Notions :** cache npm, pourquoi un seul job facilite la règle « check
obligatoire », pourquoi ce workflow n'a pas de filtre `paths`.

- [ ] **Step 1 : écrire `app.yml`** : déclenché sur `pull_request` et `push`
  vers `main`, sans filtre `paths` ; `permissions: contents: read` ; un job
  `app-checks` avec checkout (`persist-credentials: false`),
  `actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0`
  (`node-version: 24`, `cache: npm`), puis `npm ci`, `npm run lint`,
  `npm run typecheck`, `npm test`.

- [ ] **Step 2 : pousser et vérifier**

```bash
git switch -c chore/ci-app
git add .github/workflows/app.yml docs/ARCHITECTURE.md docs/DECISIONS.md
git commit -m "ci: run lint, typecheck and tests on the app"
git push -u origin chore/ci-app
```

Expected : `app-checks` vert dans la pull request.

- [ ] **Step 3 : faire échouer volontairement** un test sur la branche,
  pousser, constater le check rouge, annuler le changement.

- [ ] **Step 4 : rendre `app-checks` obligatoire** dans le ruleset
  `main-branch` (Settings, Rules), à côté de `gitleaks-scan`.

## Étape 3 : le domaine (branche `feat/domain`)

### Tâche 4 : types du domaine et requête de recherche

**Files :**

- Create : `src/server/domain/types.ts`, `src/server/domain/search-query.ts`,
  `src/server/domain/search-query.test.ts`

**Interfaces :**

- Produces (`types.ts`) :

```ts
export type QueryKind = "email" | "phone" | "name";
export interface PersonName { first: string; last: string }
export interface SearchQuery { email?: string; phone?: string; name?: PersonName }
export type DataCategory =
  | "email" | "password" | "phone" | "name" | "address"
  | "birthdate" | "username" | "ip" | "other";
export interface Exposure {
  providerId: string;
  source: string;          // breach name
  domain: string | null;
  year: number | null;
  categories: DataCategory[];
  recordCount: number | null;
  verified: boolean;
}
export interface PersonRecord { email?: string; phone?: string; name?: PersonName }
```

- Produces (`search-query.ts`) : `normalizeEmail(value: string): string`,
  `normalizeSwissPhone(value: string): string | null`,
  `queryKinds(query: SearchQuery): QueryKind[]`,
  `searchRequestSchema` (zod, entrée `{ email?, phone?, firstName?, lastName?, consent }`,
  sortie `SearchQuery`)

**Notions :** « parse, don't validate » ; `z.transform` ; pourquoi normaliser
une seule fois à l'entrée. `QueryKind` est dans le domaine (et non dans
`providers/types.ts` comme dans `ARCHITECTURE.md`) parce que `queryKinds` en a
besoin : mettre à jour la section 4.

- [ ] **Step 1 : écrire les tests qui échouent**

```ts
expect(normalizeEmail("  Jean.Dupont@Example.COM ")).toBe("jean.dupont@example.com");
expect(normalizeSwissPhone("079 123 45 67")).toBe("+41791234567");
expect(normalizeSwissPhone("+41 79 123 45 67")).toBe("+41791234567");
expect(normalizeSwissPhone("0041791234567")).toBe("+41791234567");
expect(normalizeSwissPhone("+33 6 12 34 56 78")).toBeNull();
expect(normalizeSwissPhone("12345")).toBeNull();

expect(searchRequestSchema.parse({ email: "Jean@Exemple.ch", consent: true }))
  .toEqual({ email: "jean@exemple.ch" });
expect(searchRequestSchema.parse({ firstName: " Jean ", lastName: "Dupont", consent: true }))
  .toEqual({ name: { first: "Jean", last: "Dupont" } });
expect(searchRequestSchema.safeParse({ email: "jean@exemple.ch", consent: false }).success).toBe(false);
expect(searchRequestSchema.safeParse({ consent: true }).success).toBe(false);
expect(searchRequestSchema.safeParse({ firstName: "Jean", consent: true }).success).toBe(false);
expect(searchRequestSchema.safeParse({ phone: "12345", consent: true }).success).toBe(false);

expect(queryKinds({ email: "a@b.ch", name: { first: "A", last: "B" } })).toEqual(["email", "name"]);
```

- [ ] **Step 2 : lancer** `npm test`. Expected : FAIL.

- [ ] **Step 3 : implémenter.** `normalizeSwissPhone` retire espaces, points,
  tirets et parenthèses, remplace `0041` par `+41` et un `0` initial suivi de
  9 chiffres par `+41`, puis accepte uniquement `+41` suivi de 9 chiffres.
  `searchRequestSchema` : `consent: z.literal(true)`, prénom et nom
  ensemble ou pas du tout, au moins un identifiant, téléphone invalide refusé.

- [ ] **Step 4 : relancer** `npm test && npm run typecheck`. Expected : PASS.

### Tâche 5 : masquage des valeurs

**Files :** Create : `src/server/domain/masking.ts`, `src/server/domain/masking.test.ts`

**Interfaces :** Produces : `maskPhone(normalized: string): string`,
`maskEmail(email: string): string`

**Notions :** pourquoi un nombre fixe de points (ne pas révéler la longueur).

- [ ] **Step 1 : tests qui échouent**

```ts
expect(maskPhone("+41791234567")).toBe("+41 79 ••• •• 67");
expect(maskPhone("not a phone")).toBe("•••");
expect(maskEmail("jean.dupont@example.com")).toBe("j•••@example.com");
expect(maskEmail("a@b.ch")).toBe("a•••@b.ch");
expect(maskEmail("invalid")).toBe("•••");
```

- [ ] **Step 2 : lancer**, FAIL. **Step 3 : implémenter.** **Step 4 : relancer**, PASS.

### Tâche 6 : règle anti-homonymes

**Files :** Create : `src/server/domain/matching.ts`, `src/server/domain/matching.test.ts`

**Interfaces :**

- Consumes : `PersonRecord`, `SearchQuery` (tâche 4),
  `normalizeEmail`, `normalizeSwissPhone` (tâche 4)
- Produces : `isConfirmedMatch(record: PersonRecord, query: SearchQuery): boolean`,
  `splitByMatch(records: PersonRecord[], query: SearchQuery): { confirmed: PersonRecord[]; homonymCount: number }`

**Notions :** l'invariant « pas d'exposition de tiers » traduit en code ; le
nom seul ne suffit jamais.

- [ ] **Step 1 : tests qui échouent**

```ts
const query = { phone: "+41791234567", name: { first: "Jean", last: "Dupont" } };
expect(isConfirmedMatch({ name: { first: "Jean", last: "Dupont" } }, query)).toBe(false);
expect(isConfirmedMatch({ name: { first: "Jean", last: "Dupont" }, phone: "+41790000000" }, query)).toBe(false);
expect(isConfirmedMatch({ phone: "079 123 45 67" }, query)).toBe(true);
expect(isConfirmedMatch({ email: "JEAN@EXEMPLE.CH" }, { email: "jean@exemple.ch" })).toBe(true);
expect(splitByMatch(
  [{ phone: "079 123 45 67" }, { name: { first: "Jean", last: "Dupont" } }, {}],
  query,
)).toEqual({ confirmed: [{ phone: "079 123 45 67" }], homonymCount: 2 });
```

- [ ] **Step 2 : lancer**, FAIL. **Step 3 : implémenter.** **Step 4 : relancer**, PASS.

- [ ] **Step 5 : commit, push, pull request**

```bash
git switch -c feat/domain
git add src/server/domain docs/ARCHITECTURE.md
git commit -m "feat(domain): add search query, masking and homonym rule"
git push -u origin feat/domain
```

## Étape 4 : provider XposedOrNot (branche `feat/xposedornot`)

API utilisée : `GET https://api.xposedornot.com/v1/breach-analytics?email={email}`,
sans clé. Non trouvé : 404, ou 200 avec `ExposedBreaches: null`.

### Tâche 7 : port, schéma de réponse et mapper

**Files :**

- Create : `src/server/providers/types.ts`,
  `src/server/providers/xposedornot/schema.ts`,
  `src/server/providers/xposedornot/mapper.ts`,
  `src/server/providers/xposedornot/mapper.test.ts`,
  `src/tests/fixtures/xposedornot/found.json`,
  `src/tests/fixtures/xposedornot/not-found.json`

**Interfaces :**

- Produces : `BreachProvider` (forme de `ARCHITECTURE.md`, section 4, avec
  `QueryKind` importé du domaine) ; `xonResponseSchema` et
  `type XonResponse` ; `toExposures(raw: XonResponse): Exposure[]`

**Notions :** le schéma zod ne garde que les champs déclarés (première liste
blanche), le mapper construit des objets neufs (deuxième liste blanche).

- [ ] **Step 0 : observer la vraie réponse** avec ton propre email, sans la
  versionner : `curl "https://api.xposedornot.com/v1/breach-analytics?email=TON_EMAIL"`.
  Comparer avec la doc, puis écrire les fixtures inventées : deux fuites
  (`ExampleShop`, domaine `exampleshop.test`, année `"2019"`, données
  `"Email addresses;Passwords;Names;Usernames"` ; `ForumDemo`, domaine `""`,
  date `""`, données `"Email addresses;Spoken languages"`), avec aussi les
  champs `details`, `password_risk` et `logo`. `not-found.json` :
  `ExposedBreaches: null`.

- [ ] **Step 1 : tests qui échouent**

```ts
expect(toExposures(xonResponseSchema.parse(found))).toStrictEqual([
  { providerId: "xposedornot", source: "ExampleShop", domain: "exampleshop.test", year: 2019,
    categories: ["email", "password", "name", "username"], recordCount: 120000, verified: true },
  { providerId: "xposedornot", source: "ForumDemo", domain: null, year: null,
    categories: ["email", "other"], recordCount: 800, verified: false },
]);
expect(toExposures(xonResponseSchema.parse(notFound))).toEqual([]);
```

`toStrictEqual` échoue si un champ en trop (`details`, `password_risk`)
arrive dans le résultat.

- [ ] **Step 2 : lancer**, FAIL.

- [ ] **Step 3 : implémenter.** `schema.ts` : `ExposedBreaches` nullable,
  `breaches_details` tableau de `{ breach, domain, xposed_data, xposed_date,
  xposed_records, verified }`, `verified` accepte booléen ou `"Yes"`/`"No"`.
  `mapper.ts` : table `Record<string, DataCategory>` (`"Email addresses"`,
  `"Passwords"`, `"Phone numbers"`, `"Names"`, `"Physical addresses"`,
  `"Dates of birth"`, `"Usernames"`, `"IP addresses"`), sinon `"other"` ;
  catégories sans doublon ; chaîne vide vers `null`.

- [ ] **Step 4 : relancer**, PASS.

### Tâche 8 : client HTTP et provider

**Files :**

- Create : `src/server/providers/xposedornot/client.ts`,
  `src/server/providers/xposedornot/index.ts`,
  `src/server/providers/xposedornot/provider.test.ts`

**Interfaces :**

- Consumes : `xonResponseSchema`, `toExposures` (tâche 7)
- Produces : `fetchBreachAnalytics(email: string, signal: AbortSignal): Promise<unknown | null>`,
  `xposedOrNot: BreachProvider` (`id: "xposedornot"`, `supports: ["email"]`)

**Notions :** simuler `fetch` avec `vi.stubGlobal` ; propager un
`AbortSignal` ; écrire des erreurs sans donnée personnelle.

- [ ] **Step 1 : tests qui échouent** (fetch simulé)

```ts
it("returns exposures when found");                       // 200 + found.json → 2 exposures
it("returns [] when the body is all null");               // 200 + not-found.json
it("returns [] on 404");
it("throws 'xposedornot: HTTP 500' without the email");   // message ne contient pas l'email
it("throws 'xposedornot: HTTP 429'");
it("throws 'xposedornot: invalid response' on bad JSON shape");
it("does not call fetch when the query has no email");
it("encodes the email in the URL");                       // jean+test@exemple.ch → jean%2Btest%40exemple.ch
it("passes the abort signal to fetch");
```

- [ ] **Step 2 : lancer**, FAIL. **Step 3 : implémenter** (404 vers `null`,
  autre statut non OK vers `Error("xposedornot: HTTP " + status)`, échec zod
  vers `Error("xposedornot: invalid response")`). **Step 4 : relancer**, PASS.

### Tâche 9 : registry selon le mode

**Files :** Create : `src/server/providers/registry.ts`, `src/server/providers/registry.test.ts`

**Interfaces :**

- Consumes : `AppMode` (tâche 2), `xposedOrNot` (tâche 8)
- Produces : `SURFACE_PROVIDERS`, `DEEP_PROVIDERS` (vide pour l'instant),
  `getProviders(mode: AppMode): readonly BreachProvider[]`

**Notions :** D10, règle 2 : le mode décide, pas la présence d'une clé.

- [ ] **Step 1 : tests qui échouent**

```ts
expect(getProviders("surface").map((p) => p.id)).toEqual(["xposedornot"]);
expect(getProviders("surface").some((p) => DEEP_PROVIDERS.includes(p))).toBe(false);
expect(getProviders("deep").map((p) => p.id)).toContain("xposedornot");
```

- [ ] **Step 2 à 4 :** FAIL, implémenter, PASS.

### Tâche 10 : service de recherche

**Files :** Create : `src/server/search-service.ts`, `src/server/search-service.test.ts`

**Interfaces :**

- Consumes : `BreachProvider`, `SearchQuery`, `queryKinds`, `Exposure`
- Produces : `interface SearchResult { exposures: Exposure[]; failedProviders: string[] }`,
  `searchAll(query: SearchQuery, providers: readonly BreachProvider[], timeoutMs?: number): Promise<SearchResult>`
  (défaut 8000 ms)

**Notions :** `Promise.allSettled`, `AbortSignal.timeout`, défaillance
partielle.

- [ ] **Step 1 : tests qui échouent** (faux providers)

```ts
it("merges exposures from all providers");
it("lists a throwing provider in failedProviders and keeps the others");
it("skips providers that do not support the query kinds");   // search jamais appelé
it("fails a provider that exceeds the timeout");             // timeoutMs: 50, provider attend l'abort
```

- [ ] **Step 2 à 4 :** FAIL, implémenter, PASS.

### Tâche 11 : route `POST /api/search`

**Files :** Create : `src/app/api/search/route.ts`, `src/app/api/search/route.test.ts`

**Interfaces :**

- Consumes : `searchRequestSchema` (tâche 4), `loadEnv` (tâche 2),
  `getProviders` (tâche 9), `searchAll` (tâche 10)
- Produces : `POST(request: Request): Promise<Response>`. Réponse 200 :
  `SearchResult` en JSON. Réponse 400 : `{ "error": "invalid_request" }`.
  En-tête `Cache-Control: no-store` sur toutes les réponses.

**Notions :** route handler de l'App Router ; pourquoi `POST` (invariant :
pas de donnée personnelle dans l'URL) ; `GET` reçoit automatiquement 405.

- [ ] **Step 1 : tests qui échouent** (`vi.mock` du registry avec un faux provider)

```ts
it("returns 400 on invalid JSON");
it("returns 400 without echoing the input when consent is missing"); // le corps ne contient pas l'email
it("returns 200 with exposures for a valid email");
it("sets Cache-Control: no-store");
```

- [ ] **Step 2 à 4 :** FAIL, implémenter, PASS.

- [ ] **Step 5 : essai réel.** `npm run dev`, puis dans PowerShell :

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/search -ContentType "application/json" -Body '{"email":"TON_EMAIL","consent":true}'
```

Expected : la liste de tes fuites, sans mot de passe ni valeur.

- [ ] **Step 6 : mettre à jour la doc** : `ARCHITECTURE.md` (section 4 si un
  nom a changé, quota XposedOrNot dans la section 6), puis commit, push et
  pull request.

```bash
git switch -c feat/xposedornot
git add src docs
git commit -m "feat(xposedornot): add first breach provider and search route"
git push -u origin feat/xposedornot
```

## Hors de ce plan

Score d'exposition (`severity.ts`), plan d'action (`actions.ts`), interface,
Docker et documentation pour les profs : après ce plan, au point 5.
