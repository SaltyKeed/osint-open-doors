# Annuaire search.ch : plan de mise en œuvre

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** une source `searchch` qui trouve l'adresse et la ville du visiteur par son téléphone, et ses homonymes (au plus 3) par son nom, avec les règles du moteur qui vont avec (nom du titulaire, cartes « à confirmer » regroupées).

**Architecture:** trois changements du domaine et du moteur (titulaire d'une entrée, nombre d'homonymes, clé de carte), une source `searchch` sur le port `Source` qui lit l'XML de l'API, et l'affichage des cartes regroupées dans `/dev`.

**Tech Stack:** TypeScript strict, zod 4, Vitest, Next.js 16.

**Spec:** `docs/DECISIONS.md`, T13 (et T9, T10, T11, T2 pour le contexte). API : <https://search.ch/tel/api/help.en.html>.

## Global Constraints

- Lire `CLAUDE.md`, `AGENTS.md`, `docs/ARCHITECTURE.md` (section 2) avant de coder.
- Code et commentaires en anglais ; docs et textes de l'écran en français.
- Tests écrits avant le code ; aucun appel réseau réel dans les tests (`fetch` simulé) ; fixtures XML inventées (noms, adresses, numéros inventés, domaine `exemple.ch`).
- Aucun message d'erreur ni log avec une saisie, une clé ou un corps de réponse ; l'URL appelée contient la clé et la saisie : elle n'apparaît jamais dans un message.
- Aucune nouvelle dépendance (pas de parseur XML : expressions régulières sur un XML simple, puis schéma zod).
- La clé est lue seulement par `src/server/env.ts` ; sans clé, la source n'est pas dans le registre (comme Tavily).
- Ne pas commiter, ne pas pousser, ne pas changer l'état Git. Pas de serveur de développement, pas d'appel à l'API réelle.
- Docs sobres, sans emoji ni `---`, tableaux `| --- |` ; grep de `docs/`, `README.md`, `CLAUDE.md` après chaque tâche.
- Fin de tâche : `npm test`, `npx tsc --noEmit`, `npm run lint`, markdownlint sur les docs modifiés ; tâches 2 et 3 : `npm run build`.
- Fins de ligne LF.

## Review Focus

- Le nom d'un parent inscrit pour le fixe ne devient jamais un A1 « confirmé » du visiteur : tâche 1.
- Avec plus de 3 homonymes, aucune adresse n'est envoyée au navigateur, seulement le nombre : tâches 1 et 2.
- Une entrée de type « Organisation » n'est jamais rattachée au visiteur : tâche 2.
- La clé n'apparaît dans aucun message d'erreur, même pour un code 403 : tâche 2.
- Des entités XML (`&amp;`, `&#233;`) dans une adresse sont décodées : tâche 2.

### Task 1: Domaine et moteur

**Files:**

- Modify: `src/server/domain/source.ts`, `confidence.ts`, `finding.ts`, `src/server/investigation.ts` et leurs tests
- Docs: `docs/CADRAGE.md` section 7 (niveau « à confirmer » pour un nom avec au plus 3 homonymes ; nom du titulaire), `docs/guide/06-fonctionnement-de-l-enquete.md`

**Interfaces:**

- Produces:
  - `SourceField.holder?: boolean` : « name listed for this entry: the visitor's or a relative's, decided by the engine (T13) », seulement sur un champ `A1`.
  - `SourceRecord.homonyms?: number` : nombre total de personnes de ce nom dans la source (T13).
  - `Evidence.fewHomonyms?: boolean`.
  - `Finding.card?: string` : clé commune aux constats d'une même fiche « à confirmer ».
  - `MAX_HOMONYMS = 3` (exporté de `confidence.ts`).

- [ ] **Step 1: Write the failing tests**
  - `confidence.test.ts` : `NOM` confirmé, sans indice, `fewHomonyms: true` donne `to_confirm` ; sans `fewHomonyms`, toujours `namesake`.
  - `investigation.test.ts` :
    - Titulaire qui correspond : entrée `TEL` → record `{ fields: [A1 "Léa Martin" holder, B3, C1] }`, saisie NOM « Léa Martin » : constats A1, B3, C1 tous `confirmed`, A1 sans `holder` dans le constat.
    - Titulaire différent : même record avec A1 « Marc Martin » holder : B3 et C1 `confirmed` ; « Marc Martin » n'est pas un A1 du visiteur ; il apparaît comme J1 (constat `confirmed` d'un record `about: "relative"`, champ J1) ; aucune relance.
    - Sans NOM saisi : le nom inscrit va en J1 (on ne peut pas vérifier).
    - Homonymes : saisie NOM, source qui renvoie deux records `{ homonyms: 2, fields: [A1, B3, C1] }` : six constats `to_confirm`, les trois d'un même record ont le même `card`, les deux cartes ont des `card` différents.
    - Trop d'homonymes : un record `{ homonyms: 12, fields: [] }` : aucun constat, `done.hidden.namesake` vaut 12.
    - Compte (T10) inchangé : un record « à confirmer » avec F2 n'envoie que F2, avec un `card`.
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - `levelFromQuery` : pour `NOM`, un indice donne `possible` comme avant ; sans indice, `fewHomonyms` donne `to_confirm`, sinon `namesake`.
  - Le moteur passe `fewHomonyms: record.homonyms !== undefined && record.homonyms <= MAX_HOMONYMS`.
  - Fiche cachée : `hidden[confidence] += record.homonyms ?? 1` quand `homonyms` dépasse `MAX_HOMONYMS`, sinon `+= 1`.
  - Champ `holder` : avant d'enregistrer les constats, un champ A1 `holder` reste en A1 si `nameMatches` (ou égalité exacte) avec un A1 confirmé ; sinon il est retiré du record et ajouté comme un champ `J1` (même valeur) dans un record séparé `about: "relative"`, traité comme les autres records de proches. Le constat final ne porte pas `holder`.
  - « À confirmer » : si le record a un champ F2, seulement F2 (T10) ; sinon tous ses champs. Tous les constats du record reçoivent `card` = `findingKey` du premier champ envoyé. `mergeFindings` garde `card` (`??=`).
- [ ] **Step 4: Run** the tests and the whole suite. Expected: PASS.

### Task 2: Source `searchch`

**Files:**

- Create: `src/server/providers/searchch/` : `client.ts` (URL et appel), `parse.ts` (XML vers objets, avec zod), `mapper.ts` (objets vers records), `index.ts` (la `Source`), et leurs tests
- Modify: `src/server/providers/http.ts` (ajouter `fetchText`, même gestion d'erreurs que `fetchJson`), `src/server/env.ts` et son test (`SEARCH_CH_API_KEY`, optionnelle, même forme que `TAVILY_API_KEY`), `src/server/providers/registry.ts`, `.env.example`
- Docs: `docs/SOURCES.md` (ligne search.ch : statut « En place », adresse appelée, champs, conditions), `docs/CADRAGE.md` (matrice : lignes `TEL` et `NOM`), `docs/ARCHITECTURE.md`, `docs/guide/04-fichiers-du-projet.md`, `README.md` (nombre et liste des sources)

**Interfaces:**

- Consumes: `holder`, `homonyms` (tâche 1) ; `decodeEntities` de `og-tags.ts` (l'exporter) ; `SourceQuotaError`.
- Produces: `searchCh(key: string): Source` avec `id: "searchch"`, `accepts: ["TEL", "NOM"]`, `maxCallsPerInvestigation: 2` ; `fetchText(sourceId, url, signal, headers?)`.

- [ ] **Step 1: Write the failing tests**
  - `parse.test.ts` : un XML Atom inventé avec deux `<entry>` (une `Person`, une `Organisation`) et `<openSearch:totalResults>7</openSearch:totalResults>` donne `{ total: 7, entries: [...] }` avec `type`, `name`, `firstname`, `street`, `streetno`, `zip`, `city` ; `Rue du Lac &amp; Port` et `Neuch&#226;tel` sont décodés ; un XML sans entrée donne `{ total: 0, entries: [] }` ; un texte qui n'est pas de l'XML Atom donne une erreur au message fixe.
  - `mapper.test.ts` :
    - `TEL` : une `Person` donne un record `{ about: "subject", fields: [A1 "Léa Martin" holder, B3 "Rue du Lac 1, 2000 Neuchâtel", C1 "Neuchâtel"], identifiers: [] }` ; une `Organisation` ne donne rien ; une entrée sans rue donne C1 sans B3.
    - `NOM` : total 2 donne deux records avec `homonyms: 2` et A1, B3, C1 (A1 sans `holder`) ; total 12 donne un seul record `{ homonyms: 12, fields: [], identifiers: [] }`.
  - `provider.test.ts` (`fetch` simulé) :
    - `TEL` : l'URL appelée est `https://search.ch/tel/api/` avec `was` = le numéro, `key`, `lang=fr`, `maxnum=3` ; `privat` et `firma` absents.
    - `NOM` : `was` = le nom, `privat=1`, `firma=0`, `maxnum=3`.
    - Un autre type : `[]` sans appel.
    - 403 : une erreur dont le message ne contient ni la clé ni le numéro ; 429 : `SourceQuotaError`.
  - `env.test.ts` : `SEARCH_CH_API_KEY` lue, absente si vide.
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement.** B3 au format « Rue Numéro, NPA Ville » (sans les parties absentes). Le registre ajoute `searchCh(env.SEARCH_CH_API_KEY)` seulement si la clé existe. `.env.example` : la variable vide, avec un commentaire (clé gratuite usage personnel, source à citer, usage aux portes ouvertes à confirmer, quota mensuel limité : essais `/dev` rares).
- [ ] **Step 4: Run** the tests, the whole suite and `npm run build`. Expected: PASS.

### Task 3: Cartes regroupées et citation dans /dev

**Files:**

- Modify: `src/app/dev/investigation-console.tsx`
- Docs: `docs/guide/06-fonctionnement-de-l-enquete.md` si la console y est décrite

**Interfaces:**

- Consumes: `Finding.card` (tâche 1).

- [ ] **Step 1: Implement.**
  - Les constats `to_confirm` sont regroupés par `card` : une carte par valeur de `card`. Une carte de compte montre l'adresse F2, la photo et le nom (comme aujourd'hui) ; une carte d'annuaire montre le nom (A1), l'adresse (B3) et la ville (C1).
  - Cocher une carte et continuer : tous les constats de la carte passent en `confirmed` ; seules les cartes de compte (F2) vont dans `confirmedProfiles`. Les cartes non cochées sont retirées.
  - Le taux de remplissage (`summarize`) compte les constats des cartes cochées comme confirmés, comme pour les comptes.
  - Si un constat a `searchch` dans `sources`, afficher sous les résultats : « Données d'annuaire : search.ch, Swisscom Directories AG ».
- [ ] **Step 2: Verify** : `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- [ ] **Step 3: Docs.**
