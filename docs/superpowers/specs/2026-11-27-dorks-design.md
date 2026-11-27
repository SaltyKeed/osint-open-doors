# Dorks envoyés par Tavily : conception

Date : 2026-11-27. Issues : #86 (dorks), #80 (recherche ciblée par le nom, T6).
Décisions de référence : T5, T6, T11 (`docs/DECISIONS.md`).

## Pourquoi

T11 fixe un critère de réussite : au moins 25 % des 30 champs remplis en
moyenne sur le panel, et la ville (C1) pour la moitié du panel. Les sources
actuelles laissent vides les lieux, la formation, le travail, les activités et
la presse (C3, D1, E1, G1, G3), et les grands réseaux (Instagram, Facebook,
TikTok, LinkedIn) ne répondent pas sans connexion. Un moteur de recherche est
le seul moyen légal et gratuit d'atteindre ces pages. Les dorks sont des
requêtes écrites à l'avance, avec opérateurs (`site:`, `filetype:`, `OR`,
guillemets), envoyées par Tavily.

## Objectifs

- Une liste fermée de dorks dans le code, chacun avec son test (valeurs
  inventées). Aucune requête construite librement.
- Chaque dork combine deux informations : le nom et une valeur confirmée, le
  pseudo et une plateforme, ou le nom et un mot-clé ou un domaine.
- D'abord la Suisse romande, puis toute la Suisse si rien n'est gardé, avec
  au plus une relance par dork.
- Au plus 10 recherches Tavily par enquête, email et téléphone compris (8 à l'origine, relevé le 2026-11-27 pour environ 100 visiteurs).
- Une page n'est gardée que si son titre ou son extrait contient les deux
  informations de la requête.
- Mesure du panel avant et après dans `docs/MESURES.md`.

## Non-objectifs

- Lire le texte des pages pour en extraire un employeur, une école ou une
  date. Seuls l'adresse et le titre sont gardés, comme en T5.
- Brave Search, Zefix (étapes 3 et 4 de T11).
- Changer les recherches par email et téléphone existantes.

## Anti-objectifs

- Une page sur un homonyme affichée comme « probable » ou « confirmé ».
- Une requête qui part avec une valeur non confirmée (T1 : un `NOM` ne sert
  jamais de rebond).
- Dépasser le quota : 1000 crédits par mois, celui de janvier réservé aux
  portes ouvertes.

## Contraintes

- Le port `Source` reçoit un seul identifiant par appel.
- Le texte des pages (`content`) sert seulement à vérifier la présence des
  deux informations ; il ne sort jamais du mapper.
- Cadre légal de `CADRAGE.md` 6.4 et conditions de Tavily.
- Sources de valeurs confirmées aujourd'hui : C1 (search.ch, GitHub,
  Gravatar), E1 (GitHub, Gravatar). Aucune source ne donne D1 ni `ORGA`
  pour l'instant ; les dorks les acceptent quand même, pour plus tard.

## Approches

| Approche | Avantages | Inconvénients |
| --- | --- | --- |
| **A. Étape « dorks » dans le moteur, après la file (retenue)** | Le moteur connaît tout ce qui est confirmé ; une seule logique de confiance et de cartes ; le deuxième tour en profite. | Une méthode facultative de plus dans le port `Source`. |
| B. Identifiant composé « nom + valeur » dans la file | Port inchangé. | Mélange deux informations dans un identifiant : normalisation, clés et rebonds faussés. |
| C. Dorks dans la route de l'API, hors du moteur | Moteur inchangé. | Confiance et cartes refaites à côté ; le deuxième tour ne les voit pas. |

Choix de Tiago : A. Pour le nom sans valeur confirmée, choix de Tiago :
lancer les dorks « nom et mot-clé » et afficher les pages en cartes « à
confirmer », plafonnées, comme search.ch avec au plus 3 homonymes.

## Conception

### Déroulement

1. Le moteur traite la file comme aujourd'hui. Tavily y reçoit encore
   l'email et le téléphone (T5), qui comptent dans le plafond.
2. Quand la file est vide, le moteur construit un contexte avec les valeurs
   confirmées sur le visiteur : nom saisi, C1, E1, D1, `ORGA`, pseudo saisi
   et s'il est rare et non courant (même calcul que WhatsMyName).
3. Il appelle la méthode facultative `dork(context, maxCalls, signal)` de
   chaque source qui l'a (Tavily seulement), avec le reste du plafond.
4. La source renvoie ses enregistrements et le nombre de recherches faites.
   Chaque enregistrement porte le genre du dork qui l'a trouvé.
5. Le moteur classe chaque enregistrement par son genre (ci-dessous), puis le
   traite comme les autres (constats, cartes, compteurs cachés).
6. Les pages trouvées par les dorks ne donnent aucun identifiant : pas de
   rebond.

### Valeurs utilisées

- Le nom est seulement le `NOM` saisi par le visiteur. Sans nom saisi, seul
  le dork 4 (pseudo) peut partir. Un nom trouvé par une source ne sert
  jamais (T1).
- Une valeur C1, E1, D1 ou `ORGA` entre dans le contexte seulement si un
  constat « confirmé » sur le visiteur la porte : par exemple GitHub ou
  Gravatar reliés à l'email saisi, ou search.ch par la recherche inversée du
  téléphone saisi. Une carte search.ch « à confirmer » ne compte qu'au
  deuxième tour, une fois choisie par le visiteur.

### Genres de dorks et niveau donné

Le genre décide du niveau : pour un enregistrement qui porte `dork`, le
moteur n'appelle pas `assessConfidence`. Une page ne porte aucun identifiant,
donc rien à relier ni à comparer. Le risque d'homonyme dans une grande ville
(« Léa Martin » « Genève ») est celui accepté par T6.

| Genre | Deuxième information | Niveau |
| --- | --- | --- |
| `value` : nom et valeur confirmée | C1, E1, D1 ou `ORGA` dans le titre ou l'extrait | probable (exception T6 à T2) |
| `pseudo` : pseudo et plateforme | l'adresse est sur la plateforme et le pseudo est dans l'adresse, le titre ou l'extrait | probable si pseudo rare et non courant, sinon à confirmer |
| `keyword` : nom et mot-clé ou domaine | le mot-clé dans le titre ou l'extrait, ou l'adresse sur un domaine de la liste | à confirmer, au plus 3 cartes par enquête ; au-delà, compté « possible » |

Le nom doit toujours être dans le titre ou l'extrait, ses mots côte à côte,
dans l'ordre ou inversés (`nameSideBySide`, plus strict que `nameMatches` :
une liste de noms ne doit pas mêler deux personnes). Une page qui ne passe pas
ces tests est jetée sans être comptée, comme aujourd'hui dans le mapper.

### Liste des dorks, dans l'ordre d'envoi

`{nom}` vaut « Prénom Nom » entre guillemets.

| N° | Genre | Requête | Remplit | Condition |
| --- | --- | --- | --- | --- |
| 1 | value | `"{nom}" "{C1}"` | I1 | C1 confirmé |
| 2 | value | `"{nom}" "{E1}"` | E1 | E1 confirmé |
| 3 | value | `"{nom}" "{D1}"` ou `"{nom}" "{ORGA}"` | D1 | D1 ou `ORGA` confirmé |
| 4 | pseudo | `"{pseudo}" site:instagram.com OR site:tiktok.com OR site:facebook.com` | F2 | pseudo saisi |
| 5 | keyword | `"{nom}" site:linkedin.com/in` | F2 | toujours |
| 6 | keyword | `"{nom}" club OR résultats OR classement` | G1 | toujours |
| 7 | keyword | `"{nom}"` avec la liste des domaines de presse (`include_domains`) | G3 | toujours |
| 8 | keyword | `"{nom}" filetype:pdf` | I3 | toujours |

Pour les dorks 2 et 3, la valeur confirmée est la plus courte des valeurs de
ce champ si plusieurs existent (choix de l'assistant : moins de mots, plus de
pages trouvées). Le champ rempli est celui du tableau ; la valeur du constat
est l'adresse de la page, son titre dans `page`, comme I1 aujourd'hui.

### Romandie d'abord

Tous les dorks partent avec `country: "switzerland"`. Les dorks sans lieu
du nom (5 à 8) ajoutent d'abord `(Neuchâtel OR Vaud OR Genève OR Fribourg OR Valais
OR Jura)`. Si aucune page n'est gardée et qu'il reste du plafond, le même dork
est relancé une fois sans les cantons. Le dork 1 contient déjà une ville : pas
de relance. Les dorks 2 et 3 n'ajoutent pas les cantons (un employeur ou une
école suffit à localiser) et ne sont pas relancés.

Le plafond s'épuise dans l'ordre du tableau : les relances ne passent pas
devant un dork suivant (choix de l'assistant : plus de dorks différents
plutôt que plus de relances). Concrètement, la source envoie d'abord une
recherche par dork applicable tant que le plafond le permet, puis les
relances dans le même ordre avec ce qui reste.

### Deuxième tour (T9)

Au deuxième tour, seuls les dorks `value` partent, et seulement pour une
valeur confirmée pendant ce tour (absente de `alreadyConfirmed` et des
entrées). Les dorks `pseudo` et `keyword` sont déjà partis au premier tour.

### Plafond

Un seul compteur par tour pour Tavily, partagé entre les recherches par email
et téléphone (`investigate`) et les dorks : le moteur compte les deux dans
`calls`. Pour tenir 8 par enquête sans faire passer le compte d'un tour à
l'autre : 8 au premier tour (`maxCallsPerInvestigation` passe de 3 à 8 ; 6 à l'origine), 2
au deuxième, réservées aux dorks `value` (choix de l'assistant). Le test qui
vérifie 3 recherches change.

### Port `Source`

Ajout facultatif, les autres sources ne changent pas :

- `dork?(context: DorkContext, maxCalls: number, signal: AbortSignal):
  Promise<{ calls: number; records: SourceRecord[] }>`
- `SourceRecord.dork?: "value" | "pseudo" | "keyword"`.
- `DorkContext` : `name`, `values` (par champ C1, E1, D1, `ORGA`, listes de
  chaînes), `pseudo` (`{ value, rare }` ou absent), `onlyValues` (deuxième
  tour).

La console `/dev` (`inspect`) montre aussi les dorks envoyés et leurs
réponses brutes, comme pour les autres appels (D18). Les requêtes y sont
visibles, puisqu'elles contiennent seulement des valeurs saisies ou
confirmées.

### Cartes « à confirmer » de pages

Aujourd'hui, une carte « à confirmer » ne garde que F2, sauf l'annuaire.
Les pages `keyword` gardent leur champ (F2, G1, G3, I3) avec l'adresse et le
titre. Une carte par page (clé : champ et adresse). Le visiteur confirme ou
refuse comme pour un compte (T9). Le plafond de 3 cartes est compté à part
des 3 comptes de `MAX_CONFIRMED_PROFILES`.

Confirmer une carte de page ne change que l'écran (choix de l'assistant) : le
constat passe « confirmé » dans le navigateur et compte dans le taux (T12).
Une page n'a pas d'identifiant à chercher ; elle n'est pas envoyée au
deuxième tour, et la route `/api/search` ne change pas.

### Erreurs et quota

Codes 432 et 433 de Tavily : quota atteint (T4), la source est sautée pour
la suite. Une erreur pendant un dork arrête les dorks de cette source ; les
pages déjà gardées restent.

## Ce qui reste au constructeur

- Vérifier en vrai, avec peu de crédits, que Tavily accepte `site:`,
  `filetype:`, `OR` et les guillemets avec `exact_match`, et que `country`
  fonctionne avec `search_depth: "basic"`. `exact_match` reste à `true` par
  défaut ; s'il empêche les opérateurs, le client reçoit une option pour le
  couper sur les dorks (le filtre des deux informations garde la précision).
  Noter le résultat dans
  `SOURCES.md`. Si un opérateur n'est pas accepté, remplacer par
  `include_domains` quand c'est possible, sinon retirer le dork et le noter.
- La liste des domaines de presse : reprendre celle de `SOURCES.md` section 4.
- Les noms des fonctions et des fichiers.
- Tests : un par dork (requête construite à partir de valeurs inventées), le
  filtre des deux informations, l'ordre et le plafond, la relance, le
  classement par genre dans le moteur, le deuxième tour, le plafond de
  cartes. Fixtures inventées, aucun appel réel dans les tests.
- Docs à mettre à jour dans le même commit : T5, T6, T11 si besoin
  (`DECISIONS.md`), `SOURCES.md` section 4, `ARCHITECTURE.md`, `CLAUDE.md`,
  le guide (`docs/guide/04` et `06`).

## Hors du code, à faire par Tiago

- Mesure du panel avant (search.ch fusionné) et après, dans `MESURES.md`.
