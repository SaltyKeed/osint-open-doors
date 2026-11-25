# Lecture des pages de profil : plan de mise en œuvre

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** lire le nom affiché et la photo des comptes trouvés par WhatsMyName, utiliser le nom comme indice, ajouter une source « page de profil » pour les comptes confirmés, et faire retenir au deuxième tour ce que le premier a confirmé.

**Architecture:** un module partagé lit les balises `og:` d'une page HTML. WhatsMyName l'utilise sur la page qu'il télécharge déjà. Une nouvelle source `profile-page` (port `Source`, accepte `PROFIL`) l'utilise sur les comptes confirmés, limitée aux domaines de la liste WhatsMyName. Le domaine reçoit une règle de comparaison des noms et des détails `profile` sur le champ F2.

**Tech Stack:** Next.js 16, TypeScript strict, zod 4, Vitest.

**Spec:** `docs/DECISIONS.md`, T10 (et T9, T7, T2 pour le contexte).

## Global Constraints

- Lire `CLAUDE.md`, `AGENTS.md`, `docs/ARCHITECTURE.md` (section 2, invariants) avant de coder.
- Code, identifiants et commentaires en anglais ; documentation et textes de l'interface en français.
- Tests écrits avant le code ; valeurs de test inventées (`exemple.ch`, `lmartin_06`, « Léa Martin »). Aucun appel réseau réel dans les tests : `fetch` est simulé (`vi.stubGlobal`), comme dans `whatsmyname/check.test.ts`.
- Aucun message d'erreur ni log ne contient une saisie du visiteur ou un corps de réponse.
- Rien n'est stocké. Aucune nouvelle dépendance (pas de parseur HTML : expressions régulières).
- Ne pas commiter, ne pas pousser, ne pas changer l'état Git.
- Documentation sobre, sans emoji, sans `---`, tableaux `| --- |`. Après chaque tâche, chercher (grep) dans `docs/`, `README.md`, `CLAUDE.md` ce qui a changé et le mettre à jour.
- Fin de chaque tâche : `npm test`, `npx tsc --noEmit`, `npm run lint` ; `npx markdownlint-cli2` sur les docs modifiés ; tâches 4 et 5 : `npm run build` en plus.
- Fins de ligne LF.

## Review Focus

- Une adresse de profil hors des domaines de WhatsMyName (`http://localhost`, `http://192.168.1.1`, `https://evil.exemple`) n'est jamais ouverte : tâche 4.
- Une redirection (code 3xx) de la page de profil n'est pas suivie et ne donne rien : tâche 4.
- `og:image` en `javascript:` ou `data:` n'est jamais gardée : tâche 1.
- « Léa Martinez » ne correspond pas à « Léa Martin » ; « LEA MARTIN » et « Léa Martin (@lmartin_06) • Instagram » correspondent : tâche 2.
- Une fiche « à confirmer » n'envoie que son champ F2 : jamais le nom ou la photo d'un inconnu comme constat séparé : tâche 2.

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `src/server/providers/og-tags.ts` (nouveau) | Lit `og:title`, `og:image`, `og:description` dans une page HTML |
| `src/server/domain/name-match.ts` (nouveau) | Compare un nom affiché à un nom confirmé |
| `src/server/domain/source.ts`, `finding.ts` | Détails `profile` (nom, photo) sur le champ F2 |
| `src/server/domain/evidence.ts` | Indice A1 par `nameMatches` |
| `src/server/investigation.ts` | Fiche « à confirmer » : seulement F2 ; option `alreadyConfirmed` |
| `src/server/providers/whatsmyname/` | Garde les balises de la page téléchargée ; exporte `WMN_HOSTS` |
| `src/server/providers/profile-page/` (nouveau) | Source `profile-page` |
| `src/server/domain/follow-up.ts`, `src/app/api/search/route.ts` | `confirmed` sur les identifiants déjà cherchés |
| `src/app/dev/investigation-console.tsx` | Nom et photo sur les cartes ; `confirmed` dans `searched` |

### Task 1: Lecture des balises og

**Files:**

- Create: `src/server/providers/og-tags.ts`, `src/server/providers/og-tags.test.ts`

**Interfaces:**

- Produces: `interface OgTags { title?: string; image?: string; description?: string }` ; `readOgTags(html: string): OgTags` ; `MAX_TITLE_LENGTH = 200`, `MAX_DESCRIPTION_LENGTH = 500`.

- [ ] **Step 1: Write the failing tests**

```ts
it("reads the three tags, whatever the order of the attributes", () => {
  const html = `<meta property="og:title" content="Léa Martin">
    <meta content="https://cdn.exemple.ch/a.jpg" property="og:image">
    <meta name="og:description" content="Photographe à Neuchâtel">`;
  expect(readOgTags(html)).toEqual({ title: "Léa Martin", image: "https://cdn.exemple.ch/a.jpg", description: "Photographe à Neuchâtel" });
});
it("decodes HTML entities and collapses spaces", () => {
  expect(readOgTags('<meta property="og:title" content="L&eacute;a  &amp; Co &#39;x&#x27;">').title).toBe("Léa & Co 'x'");
});
it.each(["javascript:alert(1)", "data:image/png;base64,AAAA", "/relative.jpg"])("drops the image %s", (image) => {
  expect(readOgTags(`<meta property="og:image" content="${image}">`).image).toBeUndefined();
});
it("cuts a long title and a long description", () => {
  const html = `<meta property="og:title" content="${"a".repeat(300)}"><meta property="og:description" content="${"b".repeat(900)}">`;
  expect(readOgTags(html).title).toHaveLength(200);
  expect(readOgTags(html).description).toHaveLength(500);
});
it("returns an empty object for a page without tags or an empty content", () => {
  expect(readOgTags('<html><meta property="og:title" content="  "></html>')).toEqual({});
});
```

- [ ] **Step 2: Run** `npx vitest run src/server/providers/og-tags.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement** `readOgTags` (`import "server-only"`). Entités à décoder au minimum : `&amp; &lt; &gt; &quot; &#39; &apos;`, numériques `&#NNN;` et `&#xHH;`, plus `&eacute; &egrave; &agrave; &ccedil; &nbsp;`. Image gardée seulement si `new URL(value)` réussit avec le protocole `http:` ou `https:`.
- [ ] **Step 4: Run** the tests. Expected: PASS.

### Task 2: Nom affiché comme indice, fiche « à confirmer » réduite à F2

**Files:**

- Create: `src/server/domain/name-match.ts`, `src/server/domain/name-match.test.ts`
- Modify: `src/server/domain/source.ts`, `src/server/domain/finding.ts`, `finding.test.ts`, `src/server/domain/evidence.ts`, `evidence.test.ts`, `src/server/investigation.ts`, `src/server/investigation.test.ts`
- Docs: `docs/CADRAGE.md` section 7 (indice « même nom » : la règle de T10), `docs/guide/06-fonctionnement-de-l-enquete.md`

**Interfaces:**

- Produces: `nameMatches(displayed: string, confirmed: string): boolean` ; `interface ProfileDetails { name?: string; photo?: string }` dans `source.ts` ; `SourceField.profile?: ProfileDetails` (seulement sur F2) ; `Finding.profile?: ProfileDetails`.

- [ ] **Step 1: Write the failing tests**

```ts
// name-match.test.ts
it.each([
  ["Léa Martin", "Léa Martin"],
  ["LEA MARTIN", "Léa Martin"],
  ["Léa Martin (@lmartin_06) • Instagram", "Lea Martin"],
  ["Martin Léa", "Léa Martin"],
  ["Jean-Pierre Dupont", "Jean-Pierre Dupont"],
])("%s matches %s", (displayed, confirmed) => expect(nameMatches(displayed, confirmed)).toBe(true));
it.each([
  ["Léa Martinez", "Léa Martin"],
  ["Léa", "Léa Martin"],
  ["lmartin_06", "Léa Martin"],
  ["", "Léa Martin"],
])("%s does not match %s", (displayed, confirmed) => expect(nameMatches(displayed, confirmed)).toBe(false));
```

`evidence.test.ts`: a record with field `A1` "Léa Martin (@lmartin_06) • Instagram" and `confirmedValues` holding `findingKey("A1", "Léa Martin")` gives `countHints` = 1. With A1 "Léa Martinez": 0. C1 and A2 keep the exact comparison (existing tests unchanged).

`finding.test.ts`: merging two F2 findings with the same address keeps `profile` of the first that has one.

`investigation.test.ts`:

- a source with `sitesChecked: 100` returns, for the rare pseudo `lmartin_06` with the input name « Léa Martin », one record with `F2` (with `profile: { name: "Paul Durand", photo: "https://cdn.exemple.ch/p.jpg" }`), `A1` "Paul Durand", `A5` `"https://cdn.exemple.ch/p.jpg"`. Expected: exactly one `finding` event, field `F2`, `confidence: "to_confirm"`, its `profile` kept.
- same with `A1` "Léa Martin" : three `finding` events (F2, A1, A5), all `probable`.

- [ ] **Step 2: Run** `npx vitest run src/server/domain src/server/investigation.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement**
  - `nameMatches` : enlever les accents (`normalize("NFD")` puis retirer `\p{Diacritic}`), minuscules, découper en mots sur tout ce qui n'est ni lettre ni chiffre ni trait d'union ; vrai si le nom confirmé a au moins deux mots et que chacun est un mot entier du nom affiché.
  - `countHints` : pour un champ `A1`, compter un indice si une clé de `confirmedValues` qui commence par `A1:` donne `nameMatches(field.value, key.slice(3))`. Les autres champs de `HINT_FIELDS` gardent la comparaison exacte.
  - `mergeFindings` : `existing.profile ??= finding.profile`, comme `page`.
  - `handleRecord` dans `investigation.ts` : si la confiance est `to_confirm`, ne garder que les champs `F2` du record (commentaire : le nom et la photo d'un inconnu ne deviennent jamais un constat, T10). Le reste ne change pas.
- [ ] **Step 4: Run** the tests, then the whole suite. Expected: PASS.
- [ ] **Step 5: Docs** : listés plus haut.

### Task 3: WhatsMyName garde le nom et la photo

**Files:**

- Modify: `src/server/providers/whatsmyname/check.ts`, `check.test.ts`, `index.ts`, `provider.test.ts`
- Docs: `docs/SOURCES.md` (ligne WhatsMyName : renvoie aussi nom et photo, remplit A1 A5 F2), `docs/CADRAGE.md` (ligne `PSEUDO` de la matrice des sources), T7 n'est pas modifié (T10 le remplace déjà)

**Interfaces:**

- Consumes: `readOgTags`, `OgTags` (tâche 1) ; `ProfileDetails` (tâche 2).
- Produces: `checkSite(site, pseudo, signal): Promise<{ result: SiteResult; og: OgTags }>` (`og` vide sauf pour un compte trouvé) ; `export const WMN_HOSTS: ReadonlySet<string>` dans `index.ts` (noms d'hôte, en minuscules, de `uri_check` et `uri_pretty` de `WMN_SITES`, `{account}` remplacé par `x` avant `new URL`) ; `export const USER_AGENT` dans `check.ts`.

- [ ] **Step 1: Write the failing tests**
  - `check.test.ts` : un compte trouvé dont le corps contient aussi `<meta property="og:title" content="Léa Martin">` donne `{ result: "found", og: { title: "Léa Martin" } }` ; un compte absent donne `og: {}` même si la page a des balises.
  - `provider.test.ts` : avec `fetch` simulé, un site trouvé avec `og:title` et `og:image` donne un record `{ fields: [F2 avec profile { name, photo }, A1, A5] }` ; sans balise, un record avec seulement `F2`, sans `profile`.
  - `WMN_HOSTS` contient le domaine d'un site connu de `wmn-data.json` (choisir un site présent dans `WMN_SITES`).
- [ ] **Step 2: Run** `npx vitest run src/server/providers/whatsmyname`. Expected: FAIL.
- [ ] **Step 3: Implement.** `readOgTags` seulement quand le résultat est `found`. Le `raw` de `inspect` (console `/dev`) garde `og` pour chaque site trouvé.
- [ ] **Step 4: Run** the tests and the whole suite. Expected: PASS.
- [ ] **Step 5: Docs.**

### Task 4: Source « page de profil »

**Files:**

- Create: `src/server/providers/profile-page/index.ts`, `src/server/providers/profile-page/provider.test.ts` (et un `mapper.ts` avec son test si la logique de la bio le justifie)
- Modify: `src/server/providers/registry.ts`
- Docs: `docs/SOURCES.md` (nouvelle ligne, statut « En place »), `docs/CADRAGE.md` (ligne `PROFIL` de la matrice), `docs/ARCHITECTURE.md` (arborescence, liste des sources), `docs/guide/04-fichiers-du-projet.md`, `README.md` (nombre et liste des sources), liste des services qui reçoivent des données si elle existe dans `CADRAGE.md` section 8

**Interfaces:**

- Consumes: `readOgTags` (tâche 1), `WMN_HOSTS` et `USER_AGENT` (tâche 3), `Source`, `SourceRecord`.
- Produces: `export const profilePage: Source` avec `id: "profile-page"`, `accepts: ["PROFIL"]`.

- [ ] **Step 1: Write the failing tests** (`fetch` simulé)
  - Une adresse dont le domaine n'est pas dans `WMN_HOSTS` (`http://localhost/x`, `http://192.168.1.1/x`, `https://evil.exemple/x`) : `investigate` renvoie `[]` et `fetch` n'est jamais appelé.
  - Réponse 200 HTML avec `og:title` « Léa Martin », `og:image`, et `og:description` `"Mon site : https://lea-martin.exemple.ch, contact lea@exemple.ch"` : un record `about: "subject"` avec les champs `A1` et `A5`, et les identifiants `{ type: "PROFIL", value: "https://lea-martin.exemple.ch" }` et `{ type: "EMAIL", value: "lea@exemple.ch" }`.
  - L'adresse du profil elle-même, si elle apparaît dans la bio, n'est pas renvoyée comme identifiant.
  - Réponse 301, 404 ou 500 : `[]`, sans erreur levée. `fetch` est appelé avec `redirect: "manual"`.
  - Une page sans balise : `[]`.
  - Un identifiant d'un autre type que `PROFIL` : `[]` sans appel.
- [ ] **Step 2: Run** `npx vitest run src/server/providers/profile-page`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement.** `fetch` avec `redirect: "manual"`, `cache: "no-store"`, l'en-tête `User-Agent` de WhatsMyName et le `signal` reçu (le moteur donne 8 s). Seul le statut 200 est lu. Dans la bio : adresses `https?://` (sans la ponctuation finale `.,;:)`) et emails ; les valeurs brutes vont dans `identifiers`, le moteur les normalise. `inspect` renvoie `raw: og` (les balises lues) et `parsed: og`. Ajouter `profilePage` au registre, après `whatsMyName`.
- [ ] **Step 4: Run** the tests and the whole suite. Expected: PASS.
- [ ] **Step 5: Docs.**

### Task 5: Deuxième tour, nom et photo dans /dev

**Files:**

- Modify: `src/server/domain/follow-up.ts`, `follow-up.test.ts`, `src/server/investigation.ts`, `investigation.test.ts`, `src/app/api/search/route.ts`, `src/app/dev/investigation-console.tsx`
- Docs: `docs/DECISIONS.md` (dans T9, la phrase « Limite connue » : ajouter « Réglée par T10. »), `docs/guide/06-fonctionnement-de-l-enquete.md` (section « Deuxième tour »), `docs/ARCHITECTURE.md` (paragraphe `/api/search`)

**Interfaces:**

- Consumes: `FollowUp`, `followUpSchema`, `alreadySearched` (existants) ; `Finding.profile` (tâche 2).
- Produces: élément de `searched` : `{ type, value, confirmed?: boolean }` ; `FollowUp.alreadyConfirmed: Identifier[]` (les éléments de `searched` avec `confirmed: true`) ; `InvestigationOptions.alreadyConfirmed?: readonly Identifier[]`.

- [ ] **Step 1: Write the failing tests**
  - `follow-up.test.ts` : `{ searched: [{ type: "EMAIL", value: "Lea@Exemple.ch", confirmed: true }, { type: "PSEUDO", value: "lmartin_06" }] }` donne `searched` avec les deux identifiants normalisés et `alreadyConfirmed: [{ type: "EMAIL", value: "lea@exemple.ch" }]`. `confirmed: "yes"` est refusé.
  - `investigation.test.ts` : inputs `[profil]`, `alreadySearched` et `alreadyConfirmed` contenant `email` ; une source `PROFIL` renvoie un record avec le champ `C1` « Neuchâtel » et l'identifiant `email` : le constat `C1` est `confirmed`, la source `EMAIL` n'est jamais appelée.
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement.** Dans `investigate`, ajouter les clés de `alreadyConfirmed` à `confirmedKeys` avant la boucle des saisies. La route passe `alreadyConfirmed: followUp.data.alreadyConfirmed`.
- [ ] **Step 4: Modify the console.**
  - Dans `searched` : les saisies avec `confirmed: true`, les comptes déjà confirmés avec `confirmed: true`, et chaque identifiant `lead` avec `confirmed: lead.confidence === "confirmed"`. Garder le dédoublonnage par `type:value`.
  - Sur chaque carte « à confirmer » : si `finding.profile` existe, afficher la photo (`<img>` de 48 px, `alt` = nom affiché ou « Photo du compte », `referrerPolicy="no-referrer"`, `loading="lazy"`) et le nom affiché à côté de l'adresse. Si la règle de lint `@next/next/no-img-element` se plaint, la désactiver sur cette ligne avec une raison (adresses d'images de domaines inconnus à l'avance).
- [ ] **Step 5: Run** `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`. Expected: PASS.
- [ ] **Step 6: Docs.**
