# Flux des données d'un provider

Cette page suit les données d'un provider, de la réponse brute de l'API
jusqu'à ce que voit le visiteur. Elle indique aussi quel fichier modifier pour
changer ce qui est gardé ou affiché. La structure des dossiers est décrite dans
[ARCHITECTURE.md, section 4](../ARCHITECTURE.md#4-structure-du-code-ports--adapters)
et la console de test dans
[DECISIONS.md, D18](../DECISIONS.md#d18-console-de-test-des-providers).

Les exemples utilisent le provider XposedOrNot, dans
`src/server/providers/xposedornot/`.

## Le chemin des données

```text
Réponse brute de l'API (client.ts)
        │
        │ (1) schema.ts : liste des champs lus.
        │     zod supprime tous les autres champs.
        ▼
Réponse filtrée (type XonResponse)
        │
        │ (2) mapper.ts : toExposures traduit chaque fuite
        │     en objet du domaine.
        ▼
Exposure[]
        │ (3) domain/types.ts définit les champs d'Exposure
        │     et les catégories possibles (DataCategory).
        ▼
/api/search (visiteur)  et  console /dev (développement)
```

`index.ts` assemble ces étapes dans la méthode `inspect`, qui renvoie trois
valeurs : `raw` (la réponse brute), `parsed` (la réponse filtrée par le
schéma) et `exposures`. Seule la console `/dev` reçoit `raw` et `parsed`. La
méthode `search`, utilisée par `/api/search`, ne renvoie que `exposures`.

## Deux listes blanches

Une donnée doit passer deux filtres avant d'arriver à l'écran.

1. Le schéma zod de `schema.ts`. `z.object` ne garde que les clés déclarées.
   Un champ absent du schéma, par exemple `password_risk` ou `logo`, n'existe
   plus après le parsing.
2. Le mapper de `mapper.ts`. `toExposures` construit chaque `Exposure` champ
   par champ. Un champ lu par le schéma mais pas recopié par le mapper ne sort
   pas du provider.

Le mapper fait aussi un peu de traduction :

- chaque libellé de `xposed_data` est cherché dans la table `CATEGORIES` ; un
  libellé inconnu devient `"other"` ;
- les catégories en double sont supprimées ;
- un `domain` vide (`""`) devient `null` ; une date qui ne commence pas par
  quatre chiffres donne `year: null`.

Avec deux filtres, un mot de passe ou un hash envoyé par une API doit être
oublié à deux endroits pour arriver jusqu'au visiteur. C'est ce qui protège
l'invariant « jamais de mot de passe ni de hash affiché »
([ARCHITECTURE.md, section 2](../ARCHITECTURE.md#2-invariants-non-négociables)).

## Quel fichier modifier

| Tu veux… | Fichier | Quoi modifier |
| --- | --- | --- |
| Lire un nouveau champ de la réponse brute (par exemple `password_risk` ou `BreachMetrics.risk`) | `schema.ts` | Ajouter le champ avec son type zod. Sinon, il n'existe plus après le parsing. |
| Classer un libellé autrement (par exemple « Credit card details », qui devient aujourd'hui `other`) | `mapper.ts` | Ajouter une ligne dans `CATEGORIES`. |
| Créer une nouvelle catégorie (par exemple `credit_card`) | `domain/types.ts` | Ajouter la valeur à l'union `DataCategory`. TypeScript refuse ensuite une faute de frappe dans `CATEGORIES`. |
| Ajouter une information à chaque fuite (par exemple `passwordRisk`) | `domain/types.ts`, puis `schema.ts`, puis `mapper.ts` | Ajouter le champ à `Exposure`, le lire dans le schéma, le remplir dans `toExposures`. `npm run typecheck` liste tous les endroits à compléter. |
| Retirer une information affichée | `mapper.ts`, puis `domain/types.ts` | Ne plus remplir le champ dans `toExposures`, puis le retirer d'`Exposure`. |
| Voir le changement dans la console | `src/app/dev/dev-console.tsx` | Ajouter une colonne dans `COLUMNS` et une cellule `<td>` dans `ProviderBlock`. |

`domain/types.ts` est `src/server/domain/types.ts`. `schema.ts` et `mapper.ts`
sont dans le dossier du provider.

## À mettre à jour en même temps

- Le test du mapper (`mapper.test.ts`), en premier. Il compare le résultat
  avec `toStrictEqual` : il échoue tant que le mapper ne produit pas
  exactement le nouvel objet, ni plus ni moins.
- La fixture `src/tests/fixtures/xposedornot/found.json`, si le test a besoin
  d'une nouvelle valeur. La valeur est inventée : les fixtures ne contiennent
  jamais de vraie donnée.
- La documentation, dans la même pull request : `ARCHITECTURE.md` si
  `Exposure` ou `DataCategory` change, `DECISIONS.md` si une donnée sensible
  devient visible.

## Méthode avec la console /dev

1. Lancer `npm run dev`, ouvrir `http://localhost:3000/dev` et faire une
   recherche.
2. Ouvrir « Champs ignorés par le schéma ». La liste contient les chemins des
   champs supprimés par zod, par exemple
   `ExposedBreaches.breaches_details[].password_risk`.
3. Choisir un champ utile, puis regarder ses vraies valeurs dans « Réponse
   brute de l'API ».
4. Écrire le test et compléter la fixture avec une valeur inventée.
5. Modifier `schema.ts` et `mapper.ts` jusqu'à ce que le test passe.
6. Relancer la recherche dans `/dev`. Le champ ne doit plus être dans la liste
   des champs ignorés, et il doit apparaître dans le résultat mappé.

Chaque recherche dans la console appelle la vraie API et compte dans son
quota : 100 recherches par jour pour XposedOrNot
([DECISIONS.md, D15](../DECISIONS.md#d15-quota-dxposedornot)).

## Avant d'ajouter un champ

Tout ce qui est dans `Exposure` est envoyé au navigateur du visiteur. Avant
d'ajouter un champ, il faut se demander :

- s'il aide le visiteur à construire son plan d'action ;
- s'il respecte les invariants : aucun mot de passe ni hash, aucune valeur
  d'un tiers.

Par exemple, `password_risk: "plaintext"` ne contient pas de mot de passe. Il
indique que le site stockait les mots de passe en clair : c'est utile pour le
plan d'action, car le visiteur doit alors changer ce mot de passe partout où
il l'utilise.

## Exemple : une catégorie credit_card

Cet exemple n'est pas implémenté. Il montre l'ordre des modifications pour
classer le libellé « Credit card details » dans une nouvelle catégorie
`credit_card` au lieu de `other`.

1. Test : dans `mapper.test.ts`, ajouter `"credit_card"` aux catégories
   attendues pour la fuite `ForumDemo`. `npm test` échoue.

   ```ts
   categories: ["email", "other", "credit_card"],
   ```

2. Fixture : dans `found.json`, ajouter le libellé à `xposed_data` de
   `ForumDemo`.

   ```text
   "xposed_data": "Email addresses;Spoken languages;Credit card details;"
   ```

3. Domaine : dans `domain/types.ts`, ajouter la valeur à `DataCategory`.

   ```ts
   export type DataCategory =
     | "email"
     // …
     | "ip"
     | "credit_card"
     | "other";
   ```

4. Mapper : dans `mapper.ts`, ajouter une ligne à `CATEGORIES`. `npm test`
   passe.

   ```ts
   "Credit card details": "credit_card",
   ```

5. Console : relancer une recherche dans `/dev` et vérifier que les fuites
   concernées affichent `credit_card` dans la colonne « Catégories ».

Comme `DataCategory` change, `ARCHITECTURE.md` est mis à jour dans la même
pull request.

## Pour les autres providers

Chaque dossier de provider aura les mêmes fichiers `schema.ts` et `mapper.ts`,
et tous utilisent les types du domaine de `domain/types.ts`. La méthode de
cette page s'applique donc à chaque nouveau provider.
