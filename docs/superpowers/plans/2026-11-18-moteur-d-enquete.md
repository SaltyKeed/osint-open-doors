# Moteur d'enquête : plan

> Plan de l'issue #65. Décision : `docs/DECISIONS.md`, T4. Règles de
> confiance et de rebond : T2 et `docs/CADRAGE.md`, section 7.

**But :** une boucle qui part des identifiants saisis, interroge les sources,
calcule la confiance de chaque fiche, crée les constats et relance les
nouveaux identifiants fiables, en envoyant chaque résultat au navigateur dès
qu'il est trouvé.

**Architecture :** les calculs sur une fiche (indices, rattachement, pseudo
courant) sont des fonctions pures dans `src/server/domain/evidence.ts`. Le
moteur est un générateur asynchrone dans `src/server/investigation.ts`, testé
avec des sources factices. `/api/search` transforme ses événements en flux
NDJSON. `search-service.ts` disparaît : le moteur le remplace.

**Stack :** TypeScript strict, Vitest, `ReadableStream` (doc Next 16 :
`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`,
section Streaming).

## Contraintes

- Aucun log ni message d'erreur ne contient une saisie ou une valeur trouvée :
  seulement l'id de la source et le motif (`error`, `quota`).
- Seuls les constats « confirmé » et « probable » sont envoyés en détail ; les
  autres sont comptés (invariant des homonymes).
- Chaque appel à une source reçoit un signal qui combine l'annulation de la
  requête et 8 secondes (`AbortSignal.any`).
- Fixtures et valeurs de test inventées.

## Points d'attention pour la relecture

- Une source qui renvoie l'identifiant qu'on vient de chercher ne doit pas
  le relancer (clé `TYPE:valeur` déjà vue).
- Un identifiant confirmé tard ne rend pas « confirmées » les fiches déjà
  traitées : limite acceptée, à noter dans le guide.
- Le visiteur qui quitte la page annule la requête : le moteur s'arrête sans
  lancer de nouvel appel.
- Une valeur vide renvoyée par une source est écartée par
  `normalizeIdentifier` avant d'entrer dans la file.
- Le nom saisi (`NOM`) compte comme valeur confirmée de A1 pour les indices.

## Tâche 1 : port, quota et sites testés

**Fichiers :** `src/server/domain/source.ts`, `source.test.ts`,
`src/server/providers/xposedornot/client.ts`, `provider.test.ts`.

**Produit :**

- `class SourceQuotaError extends Error` : `constructor(sourceId: string)`,
  message fixe `` `${sourceId}: quota reached` ``.
- `Source.sitesChecked?: number` : nombre de sites de la liste d'une source
  de pseudos.

Tests :

| Cas | Attendu |
| --- | --- |
| `new SourceQuotaError("x")` | `instanceof Error`, message `x: quota reached` |
| XoN répond 429 | `SourceQuotaError`, message sans l'email |
| XoN répond 500 | erreur `xposedornot: HTTP 500` (inchangé) |

Commit : `feat(sources): add quota error and sitesChecked to the Source port`.

## Tâche 2 : preuves sur une fiche

**Fichiers :** `src/server/domain/evidence.ts`, `evidence.test.ts`.

**Consomme :** `SourceRecord`, `identifierKey`, `normalizeIdentifier`,
`comparedValue` de `finding.ts` (à exporter).

**Produit :**

- `HINT_FIELDS = ["A1", "A2", "C1"] as const`
- `MAX_PSEUDO_SITE_SHARE = 0.1` (valeur de départ, T4)
- `isLinkedToConfirmed(record: SourceRecord, confirmedKeys: ReadonlySet<string>): boolean`
  : vrai si un identifiant `EMAIL`, `TEL` ou `PROFIL` de la fiche a sa clé
  dans `confirmedKeys`.
- `countHints(record: SourceRecord, confirmedValues: ReadonlySet<string>): number`
  : nombre de champs de `HINT_FIELDS` dont la clé `champ:valeurComparée` est
  dans `confirmedValues`.
- `isCommonPseudo(found: number, sitesChecked: number | undefined): boolean`
  : vrai si `found / sitesChecked > MAX_PSEUDO_SITE_SHARE` ; faux si
  `sitesChecked` est absent.

Tests :

| Cas | Attendu |
| --- | --- |
| fiche avec le `TEL` confirmé | lié |
| fiche avec seulement un `PSEUDO` confirmé | pas lié (type non unique) |
| ville `"Neuchâtel"` et confirmé `C1:neuchâtel` | 1 indice |
| ville et nom identiques aux confirmés | 2 indices |
| même valeur mais sur C2 | 0 indice |
| 70 profils sur 600 sites | courant |
| 30 profils sur 600 sites | pas courant |
| `sitesChecked` absent | pas courant |

Commit : `feat(domain): add evidence helpers for the engine`.

## Tâche 3 : le moteur

**Fichiers :** `src/server/investigation.ts`, `investigation.test.ts`.

**Produit :**

```ts
type InvestigationEvent =
  | { type: "finding"; finding: Finding }
  | { type: "lead"; identifier: Identifier; confidence: Confidence; path: Identifier[] }
  | { type: "source-failed"; source: string; reason: "error" | "quota" }
  | { type: "done"; hidden: { possible: number; namesake: number } };

function investigate(
  inputs: readonly Identifier[],
  sources: readonly Source[],
  options: { signal: AbortSignal; callTimeoutMs?: number },
): AsyncGenerator<InvestigationEvent>;
```

Déroulement : file de `{ identifier, confidence, path }`, ensemble des clés
déjà vues, ensemble des clés confirmées, ensemble des valeurs confirmées
(`champ:valeurComparée`), constats fusionnés par `mergeFindings`, sources
sautées pour quota. Les saisies entrent « confirmé », avec un chemin vide.
Pour chaque identifiant, les sources qui l'acceptent sont appelées en
parallèle ; chaque fiche reçoit son niveau par `assessConfidence`, ses champs
deviennent des constats, ses identifiants passent par `shouldRebound`. Un
constat « confirmé » ou « probable » nouveau ou modifié émet `finding` ; un
identifiant relancé émet `lead`.

Tests (sources factices) :

| Cas | Attendu |
| --- | --- |
| EMAIL saisi, fiche avec un `TEL` | `lead` TEL confirmé, puis TEL cherché |
| identifiant renvoyé deux fois | cherché une seule fois |
| `NOM` trouvé | jamais cherché |
| identifiant d'une fiche `relative` | jamais cherché |
| pseudo rare, une ville confirmée commune | constats « probable » |
| ce que le pseudo probable trouve, sans lien confirmé | pas relancé |
| pseudo courant (part au-dessus du maximum) | constats comptés dans `hidden.possible` |
| fiche trouvée par nom sans indice | comptée dans `hidden.namesake`, aucun `finding` |
| même fuite chez deux sources | deuxième `finding` avec les deux sources |
| source qui lève une erreur | `source-failed` `error`, rappelée pour l'identifiant suivant |
| source qui lève `SourceQuotaError` | `source-failed` `quota` une fois, plus jamais appelée |
| source plus lente que `callTimeoutMs` | `source-failed` `error`, les autres répondent |
| signal annulé | plus aucun appel, le générateur s'arrête |
| fin | dernier événement `done` |

Commit : `feat(engine): add investigation loop`.

## Tâche 4 : route en flux

**Fichiers :** `src/app/api/search/route.ts`, `route.test.ts` ; supprimer
`src/server/search-service.ts` et son test.

La route garde la validation et ses réponses 400 en JSON. Une recherche valide
répond `200`, `Content-Type: application/x-ndjson`, `Cache-Control: no-store`,
un événement JSON par ligne. Le signal du moteur est `request.signal`.

Tests : 400 inchangés ; une recherche valide donne des lignes JSON qui se
terminent par `done` ; en-têtes présents.

Commit : `feat(api): stream investigation events`.

## Tâche 5 : documentation

- `CADRAGE.md`, section 7 : indices (A1, A2, C1), part des sites testés,
  quota, 8 secondes par appel.
- `ARCHITECTURE.md` : le moteur, le flux NDJSON, arbre des fichiers ;
  diagramme de séquence Mermaid d'une enquête (route, moteur, sources).
- Guide 06 : affichage en direct, quota, limite « confirmé tard » ; état.
- Guide 04 : arbre et description. Guide 03 : la section sur le streaming ne dit plus « arrive avec #65 ».
- Glossaire : NDJSON, générateur.

Vérification : `npm test`, `npm run lint`, `npm run typecheck`,
`npm run build`, `npx markdownlint-cli2 "docs/**/*.md"`. Pull request avec
`Closes #65`.

## Hors de ce plan

- Console `/dev` : elle garde un appel par source, sans moteur.
- Photo comme indice (A5) : avec Gravatar (#66).
- Plan d'action (#28), taux de remplissage, interface (#30, #31).
