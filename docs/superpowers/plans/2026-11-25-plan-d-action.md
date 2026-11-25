# Taux de remplissage et plan d'action : plan de mise en œuvre

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** calculer, à partir des constats d'une enquête (un ou deux tours), le taux de remplissage de la fiche et le plan d'action, et les afficher dans la console `/dev` (issue #28).

**Architecture:** une fonction pure `summarize(findings)` dans un nouveau dossier `src/shared/` (code sans clé ni réseau, utilisable par le navigateur et le serveur). `fiche-fields.ts` y déménage. La console `/dev` appelle `summarize` sur tous les constats reçus et affiche le résultat en direct.

**Tech Stack:** TypeScript strict, Vitest, Next.js 16 (composant client existant).

**Spec:** `docs/DECISIONS.md`, T12 et T11 (sections « Taux de remplissage » et « Plan d'action ») ; `docs/CADRAGE.md`, sections 5 (fiche), 6.4 (techniques exclues) et 8.

## Global Constraints

- Lire `CLAUDE.md`, `AGENTS.md` et `docs/ARCHITECTURE.md` avant de coder.
- `src/shared/` n'importe jamais `server-only`, `node:*`, `@/server/env`, ni un module de `src/server/` autrement qu'avec `import type`.
- Code et commentaires en anglais ; textes du plan d'action et de l'écran en français, phrases courtes, tutoiement (le visiteur peut avoir 15 ans), sans emoji.
- Le plan d'action ne contient aucune valeur du visiteur : seulement des nombres, des noms de fuites (H1) et des conseils.
- Tests écrits avant le code, valeurs inventées.
- Ne pas commiter, ne pas pousser, ne pas changer l'état Git.
- Documentation sobre, sans emoji ni `---`, tableaux `| --- |` ; après chaque tâche, grep de `docs/`, `README.md`, `CLAUDE.md` pour les noms changés.
- Fin de tâche : `npm test`, `npx tsc --noEmit`, `npm run lint`, markdownlint sur les docs modifiés ; tâche 3 : `npm run build`.
- Fins de ligne LF.

## Review Focus

- Un constat « à confirmer », « possible » ou « homonyme probable » ne compte jamais dans le taux et ne produit aucune action : tâche 2.
- Deux constats du même champ (deux emails) comptent pour un seul champ rempli : tâche 2.
- Un champ avec un constat confirmé et un probable compte comme confirmé : tâche 2.
- Aucune action ne contient une valeur du visiteur (email, téléphone, adresse, nom) : tâche 2, test qui cherche ces valeurs dans le texte du plan.
- Liste vide de constats : taux 0 sur 30, plan sans action mais avec la section « Ce qu'un attaquant pourrait faire de plus » : tâche 2.

### Task 1: Dossier `src/shared/` et déménagement de la fiche

**Files:**

- Move: `src/server/domain/fiche-fields.ts` vers `src/shared/fiche-fields.ts`, et son test vers `src/shared/fiche-fields.test.ts`
- Modify: les fichiers qui l'importent (`src/server/domain/evidence.ts`, `finding.ts`, `source.ts`, et tout autre trouvé par grep)
- Docs: `docs/ARCHITECTURE.md` (arborescence ; une ligne qui explique `src/shared/` : code sans clé ni réseau, partagé par le navigateur et le serveur, sans `server-only`), `docs/guide/04-fichiers-du-projet.md`

**Interfaces:**

- Produces: `@/shared/fiche-fields` exporte `FIELD_CODES`, `FieldCode`, `FIELD_LABELS` comme avant, plus `FIELD_CATEGORIES`.

- [ ] **Step 1: Write the failing test** in `src/shared/fiche-fields.test.ts` (après déplacement du test existant) :

```ts
it("groups the 30 fields into the 10 categories of CADRAGE.md, in order", () => {
  expect(FIELD_CATEGORIES.map((c) => c.code)).toEqual(["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"]);
  expect(FIELD_CATEGORIES.flatMap((c) => c.fields)).toEqual([...FIELD_CODES]);
  expect(FIELD_CATEGORIES[7]).toMatchObject({ code: "H", label: "Exposition et sécurité" });
});
```

- [ ] **Step 2: Run** it. Expected: FAIL (`FIELD_CATEGORIES` undefined, or module not found before the move).
- [ ] **Step 3: Implement.** Déplacer le fichier avec `git mv` interdit (pas de commande Git qui change l'état) : créer le nouveau fichier, supprimer l'ancien, mettre à jour les imports. Retirer `import "server-only"`. Ajouter `FIELD_CATEGORIES: readonly { code: string; label: string; fields: readonly FieldCode[] }[]` avec les libellés exacts de `CADRAGE.md` section 5 : Identité, Coordonnées, Lieux, Formation, Vie professionnelle, Présence en ligne, Activités et centres d'intérêt, Exposition et sécurité, Traces sur le web, Entourage.
- [ ] **Step 4: Run** the whole suite and `npx tsc --noEmit`. Expected: PASS.

### Task 2: `summarize`

**Files:**

- Create: `src/shared/summary.ts`, `src/shared/summary.test.ts`
- Docs: `docs/guide/06-fonctionnement-de-l-enquete.md` (courte section « Taux de remplissage et plan d'action »), `docs/CADRAGE.md` section 8 (renvoi à T11 et T12)

**Interfaces:**

- Consumes: `FIELD_CATEGORIES`, `FIELD_CODES`, `FieldCode` (tâche 1) ; `import type { Finding } from "@/server/domain/finding"`.
- Produces:

```ts
export interface FillRate { confirmed: number; probable: number; total: number }  // champs, pas constats
export interface CategoryFill extends FillRate { code: string; label: string }
export type Urgency = "urgent" | "important" | "review";
export interface Action { id: string; urgency: Urgency; title: string; detail: string }
export interface Summary {
  fill: FillRate;                 // total = 30
  categories: CategoryFill[];     // ordre A à J
  actions: Action[];              // urgent, puis important, puis review ; ordre stable
  beyond: { title: string; detail: string }[];  // CADRAGE.md 6.4, toujours présent
}
export function summarize(findings: readonly Finding[]): Summary;
```

- [ ] **Step 1: Write the failing tests** (un `finding(field, confidence, extra?)` d'aide dans le test) :
  - `summarize([])` : `fill` = `{ confirmed: 0, probable: 0, total: 30 }`, 10 catégories à 0, `actions` vide, `beyond` non vide (5 entrées, une par ligne du tableau 6.4).
  - Deux B1 confirmés et un A1 probable : `fill` = `{ confirmed: 1, probable: 1, total: 30 }` ; catégorie B = `{ confirmed: 1, probable: 0, total: 3 }`.
  - Un champ avec un constat confirmé et un probable compte en confirmé seulement.
  - `to_confirm`, `possible`, `namesake` ne comptent pas et ne produisent aucune action.
  - Les règles du tableau ci-dessous.

Règles (une action par règle, même avec plusieurs constats ; `id` stable) :

| Constat (confirmé ou probable) | `id` | Urgence | Contenu attendu |
| --- | --- | --- | --- |
| H3 | `exposed-password` | urgent | changer tout de suite les mots de passe exposés, partout où ils sont réutilisés |
| H5 | `infected-computer` | urgent | nettoyer ou réinstaller l'ordinateur, puis changer tous les mots de passe depuis un autre appareil, activer la double authentification |
| H1 | `breaches` | important | le nombre de fuites et leurs noms (valeur du constat H1, c'est le nom de la fuite), changer le mot de passe de ces sites, gestionnaire de mots de passe, double authentification |
| B2 | `public-phone` | important | retirer le numéro des annuaires (search.ch, local.ch) et des profils publics |
| B3 | `public-address` | important | retirer l'adresse des annuaires et des profils publics |
| F2 | `accounts` | review | le nombre de comptes, vérifier leur confidentialité, supprimer les comptes oubliés |
| I1 | `web-pages` | review | le nombre de pages, demander le retrait au site (droit à l'effacement, nLPD) et le déréférencement au moteur de recherche |
| A5 | `profile-photos` | review | limiter qui voit les photos de profil |

Autres tests de la même étape :

- Ordre : toutes les actions `urgent`, puis `important`, puis `review`, dans l'ordre du tableau.
- Test de confidentialité : avec des constats B1 `lea.martin@exemple.ch`, B2 `+41791234567`, B3 `Rue du Lac 1, Neuchâtel`, A1 `Léa Martin`, F2 `https://site.exemple.ch/lmartin_06`, `JSON.stringify(summarize(...).actions)` ne contient aucune de ces valeurs.
- [ ] **Step 2: Run** `npx vitest run src/shared`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement** `summarize` : un champ compte s'il a au moins un constat `confirmed` ou `probable` ; en confirmé dès qu'un constat l'est. Les textes du plan sont écrits dans `summary.ts` (constantes). `beyond` reprend les cinq techniques de `CADRAGE.md` 6.4 avec, pour chacune, ce qu'un attaquant en tirerait, en une phrase.
- [ ] **Step 4: Run** the tests and the whole suite. Expected: PASS.

### Task 3: Affichage dans la console /dev

**Files:**

- Modify: `src/app/dev/investigation-console.tsx`
- Docs: `docs/guide/05-flux-des-donnees.md` ou `06` si la console y est décrite

**Interfaces:**

- Consumes: `summarize`, `Summary` (tâche 2).

- [ ] **Step 1: Implement.** Dans le panneau « Enquête complète », calculer `summarize` sur les constats affichés (après remplacement des constats mis à jour, comme le tableau actuel ; les comptes cochés au deuxième tour comptent en confirmé). Afficher, au-dessus du tableau des constats :
  - le taux global : « Fiche remplie : X champs sur 30 (dont Y probables) » et le pourcentage arrondi ;
  - un tableau par catégorie (libellé, confirmés, probables, total) ;
  - le plan d'action en trois listes titrées « Urgent », « Important », « À revoir » (titre et détail de chaque action), puis « Ce qu'un attaquant pourrait faire de plus ».
  - Le calcul se met à jour à chaque nouvel événement.
- [ ] **Step 2: Verify** : `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build` passent ; le build échoue si `src/shared/` importe du code serveur, c'est attendu qu'il passe.
- [ ] **Step 3: Docs.**
