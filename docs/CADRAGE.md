# Cadrage de l'outil d'enquête

Date : 2026-11-16

Statut : brouillon, à valider par Enzo, Tiago et l'enseignant avant d'écrire du
code.

## 1. Pourquoi ce document

Le prototype de la branche `sandbox` a été construit source par source (32
décisions dans `DECISIONS.md`). Il n'a jamais défini ce que l'outil doit
trouver, ni comment il doit le chercher. Résultat constaté le 2026-11-16 : il
trouve trop peu, il n'a pas de démarche d'enquête et ses résultats sont peu
fiables (homonymes, faux positifs).

Ce document fixe trois choses précises :

- la cible : une fiche de vie, liste finie de champs à remplir (section 5) ;
- le plan : une matrice qui dit, pour chaque type d'identifiant, quelle source
  interroger, quels champs elle remplit et vers quoi elle rebondit (section 6) ;
- la méthode : comment rattacher une information à la personne et quand
  rebondir (section 7).

Le périmètre n'a pas de limite : l'outil cherche à remplir toute la fiche. Ce
qui empêche de partir dans tous les sens, c'est la règle de la section 6.3 :
une source n'est ajoutée que si elle remplit un champ de la fiche ou ouvre un
rebond de la matrice.

## 2. But

OSINT Open Doors est un outil d'enquête OSINT automatique. À partir de ce
qu'une personne donne sur elle, il reconstitue sa vie complète à partir de tout
ce qui est public et légal, et la présente sous forme de fiche.

| Question | Réponse |
| --- | --- |
| Qui est enquêté ? | Un volontaire consentant, qui saisit lui-même ses informations. |
| Qui voit l'écran ? | Le volontaire seul (et l'opérateur), dans un coin privé. Pas de projection. |
| Où ? | Aux portes ouvertes du CPNE, sur un PC de l'école. |
| Jusqu'où ? | Toute la fiche de la section 5. Pas de priorité entre les champs. |
| Comment avance l'enquête ? | Automatiquement, de rebond en rebond, jusqu'à ce qu'aucun nouvel identifiant fiable n'apparaisse. |
| Quel résultat ? | La fiche de vie remplie, chaque valeur avec sa source, son niveau de confiance et son chemin. |
| Quand est-ce réussi ? | Quand la fiche couvre ce qu'un enquêteur humain trouverait à la main sur la même personne (section 11). |

Ce but diffère du projet décrit dans `CLAUDE.md` (un visiteur qui voit les
métadonnées des fuites où il apparaît). Le changement doit être validé par Tiago
et par l'enseignant.

## 3. Scénario

```text
1. Le volontaire s'installe. L'opérateur explique le principe.
2. Il saisit ce qu'il veut donner sur lui : email, téléphone, nom et prénom,
   pseudo, localité, date de naissance. Tout est facultatif, au moins un champ
   est requis.
3. Il coche une case qui certifie que les données sont à lui et donne son
   accord (section 10).
4. L'enquête démarre. L'écran montre en direct la fiche qui se remplit, les
   sources interrogées et les rebonds.
5. À la fin, il voit sa fiche de vie complète. Les valeurs sont masquées ; un
   bouton « œil » à côté de chaque champ affiche la valeur.
6. Il reçoit un plan d'action (quoi supprimer, quoi changer, quels réglages).
7. Il clique sur « Effacer et terminer ». Tout est effacé.
```

## 4. Points de départ

L'outil part de ce que la personne saisit, quelle que soit la combinaison.
Chaque saisie devient un identifiant de niveau 0, de confiance « confirmé ».

| Saisie | Type d'identifiant (section 6) |
| --- | --- |
| Email | `EMAIL` |
| Téléphone | `TEL` |
| Pseudo | `PSEUDO` |
| Nom et prénom | `NOM` |
| Localité, date de naissance | Contexte : aident à départager les homonymes et à deviner des pseudos, ne sont pas interrogés seuls |

## 5. La fiche de vie

C'est la cible de l'enquête. Chaque champ a un code, utilisé dans la matrice
(section 6), dans le code et dans les tests. Un champ peut avoir plusieurs
valeurs (plusieurs emails, plusieurs employeurs) ; chaque valeur garde sa
source et sa confiance.

### A. Identité

| Code | Champ |
| --- | --- |
| A1 | Nom et prénom, variantes et noms d'usage |
| A2 | Date de naissance ou âge |
| A3 | Sexe (tel qu'indiqué dans une source) |
| A4 | Langues, nationalité (telles qu'indiquées dans une source) |
| A5 | Photos de profil |

### B. Coordonnées

| Code | Champ |
| --- | --- |
| B1 | Adresses email |
| B2 | Numéros de téléphone |
| B3 | Adresses postales, actuelle et anciennes |

### C. Lieux

| Code | Champ |
| --- | --- |
| C1 | Ville de résidence |
| C2 | Lieux de vie passés |
| C3 | Lieux fréquentés cités publiquement (club, école, salle de sport) |

### D. Formation

| Code | Champ |
| --- | --- |
| D1 | Écoles et formations, avec les années |

### E. Vie professionnelle

| Code | Champ |
| --- | --- |
| E1 | Employeurs et postes, actuels et passés |
| E2 | Fonctions au registre du commerce |
| E3 | Projets et publications (code, articles, travaux) |

### F. Présence en ligne

| Code | Champ |
| --- | --- |
| F1 | Pseudos |
| F2 | Comptes : site, adresse du profil, date de création, bio, ville et liens déclarés |
| F3 | Sites personnels et noms de domaine |

### G. Activités et centres d'intérêt

| Code | Champ |
| --- | --- |
| G1 | Sports, clubs, associations, résultats |
| G2 | Loisirs visibles sur les comptes (jeux, musique, vidéo) |
| G3 | Mentions dans la presse |

### H. Exposition et sécurité

| Code | Champ |
| --- | --- |
| H1 | Fuites : nom, date, types de données exposées |
| H2 | Contenu de la fiche de la personne dans chaque fuite |
| H3 | Mots de passe exposés (affichage à trancher, section 10) |
| H4 | Adresses IP connues et localisation approximative |
| H5 | Ordinateurs infectés par un logiciel espion |

### I. Traces sur le web

| Code | Champ |
| --- | --- |
| I1 | Pages qui citent un identifiant, avec l'extrait |
| I2 | Pages supprimées retrouvées dans les archives |
| I3 | Documents (PDF) qui citent un identifiant |

### J. Entourage

| Code | Champ |
| --- | --- |
| J1 | Proches identifiables (famille, amis, collègues) : nom, lien avec la personne, profil |

L'entourage est détaillé (décision du 2026-11-16). Ce sont des tiers qui n'ont
pas donné leur accord : ce choix doit être validé par l'enseignant (section 10).
Les identifiants des proches ne sont jamais renvoyés dans la boucle d'enquête :
l'outil n'enquête pas sur eux.

## 6. Matrice de rebond

### 6.1 Types d'identifiants

Un identifiant est une valeur qu'on peut donner à une source.

| Type | Exemple | Unique ? |
| --- | --- | --- |
| `EMAIL` | `lea.martin@example.ch` | Oui |
| `TEL` | `+41 79 123 45 67` | Oui |
| `PSEUDO` | `lmartin_06` | Seulement s'il est rare |
| `NOM` | Léa Martin (+ localité, année) | Non |
| `PROFIL` | `https://github.com/lmartin06` | Oui |
| `DOMAINE` | `leamartin.ch` | Oui |
| `IP` | `85.1.2.3` | Non (partagée, change) |
| `ORGA` | CPNE, Club de volley de Neuchâtel | Non |

### 6.2 Matrice

Pour chaque type d'identifiant : les sources à interroger, les champs qu'elles
remplissent et les nouveaux identifiants qu'elles produisent (rebonds). Le
statut « à tester » veut dire que la source n'a pas encore été vérifiée à la
main sur nos propres données.

| Entrée | Source | Remplit | Nouveaux identifiants | Accès | Statut |
| --- | --- | --- | --- | --- | --- |
| `EMAIL` | Service de fiches de fuites (DeHashed, LeakCheck, Snusbase ou Intelligence X) | A1 A2 A3 B2 B3 H1 H2 H3 H4 | `TEL` `PSEUDO` `NOM` `IP` `EMAIL` | Payant | À tester |
| `EMAIL` | HIBP, XposedOrNot | H1 | aucun | Gratuit ou abonnement | En place |
| `EMAIL` | Hudson Rock | H5 | `DOMAINE` | Gratuit | En place |
| `EMAIL` | Gravatar, Libravatar | A1 A5 F2 | `PSEUDO` `PROFIL` | Gratuit | En place |
| `EMAIL` | GitHub (utilisateurs et commits) | A1 C1 E1 E3 F2 | `PSEUDO` `PROFIL` `DOMAINE` | Gratuit | En place |
| `EMAIL` | Serveurs de clés PGP | A1 B1 | `EMAIL` | Gratuit | En place |
| `EMAIL` | Moteur de recherche (valeur exacte) | I1 I3 | `PROFIL` | Clé gratuite | En place |
| `EMAIL` | Domaine de l'email (hors webmail) | E1 | `ORGA` `DOMAINE` | Gratuit | À tester |
| `EMAIL` | Partie avant le @ | aucun | `PSEUDO` (confiance « possible ») | Local | En place |
| `TEL` | Service de fiches de fuites | A1 A2 B1 B3 C1 E1 H1 H2 | `EMAIL` `NOM` `PSEUDO` | Payant | À tester |
| `TEL` | Annuaire search.ch | A1 B3 C1 | `NOM` | Gratuit, quota | En place |
| `TEL` | Analyse locale du numéro | pays, type de ligne, opérateur d'origine | aucun | Local | En place |
| `TEL` | Moteur de recherche (plusieurs formats) | I1 I3 | `PROFIL` | Clé gratuite | En place |
| `PSEUDO` | Base de sites (WhatsMyName et Maigret, figée dans le dépôt) | F1 F2 | `PROFIL` | Gratuit | À refaire |
| `PSEUDO` | Service de fiches de fuites | H1 H2 et suivants | `EMAIL` `TEL` | Payant | À tester |
| `PSEUDO` | Moteur de recherche | I1 | `PROFIL` | Clé gratuite | En place |
| `PROFIL` | API publique du site (GitHub, GitLab, Mastodon, YouTube, Twitch, Steam, Chess.com...) | A1 A5 C1 E1 F2 G2 | `PSEUDO` `PROFIL` `DOMAINE` | Gratuit | Partiel |
| `PROFIL` | Listes publiques d'abonnés, d'amis et mentions | J1 | aucun (identifiants de tiers, jamais relancés) | Gratuit | À tester |
| `PROFIL` | Wayback Machine | I2 | `PROFIL` | Gratuit | En place |
| `NOM` | Moteur de recherche ciblé : LinkedIn | A1 C1 D1 E1 | `ORGA` `PROFIL` | Clé gratuite | À tester |
| `NOM` | Moteur de recherche ciblé : presse, résultats sportifs, associations | C3 G1 G3 | `ORGA` | Clé gratuite | Partiel |
| `NOM` | Zefix, FOSC | E2 | `ORGA` | Gratuit | À tester |
| `NOM` | ORCID, OpenAlex | E3 | `ORGA` | Gratuit | Partiel |
| `NOM` | Annuaire search.ch | B2 B3 C1 | `TEL` | Gratuit, quota | En place (total seulement) |
| `DOMAINE` | RDAP, crt.sh, Wayback Machine | F3 I2 | `EMAIL` `NOM` | Gratuit | Partiel |
| `IP` | Géolocalisation d'IP | H4 C1 (approximatif) | aucun | Gratuit | À tester |
| `ORGA` | Moteur de recherche « nom + organisation » | D1 E1 G1 | `PROFIL` | Clé gratuite | À tester |

Lecture d'un exemple : un email saisi est donné au service de fiches de fuites.
La fiche Pandabuy contient un téléphone et un pseudo. Le téléphone est un
nouvel identifiant `TEL` confirmé (même fiche que l'email) : il repart dans la
matrice (annuaire, autres fuites). Le pseudo repart dans la base de sites, qui
trouve un profil Steam, dont la page publique donne une ville.

### 6.3 Règle d'ajout d'une source

Une source entre dans la matrice seulement si :

1. elle remplit au moins un champ de la fiche, ou produit un nouvel identifiant ;
2. elle est légale à interroger automatiquement (section 6.4) ;
3. elle a été testée à la main sur nos propres données, et on a noté ce qu'elle
   renvoie vraiment.

Une idée de source qui ne passe pas ces trois points va dans `IDEES.md`, pas
dans le code.

### 6.4 Ce qui ne sera pas fait

| Technique | Raison |
| --- | --- |
| Tester les formulaires d'inscription ou de mot de passe oublié (holehe) | Contraire aux conditions des sites ; agit chez des tiers |
| Se connecter avec un compte pour lire des profils (GHunt, Instaloader) | Session authentifiée ; contraire aux conditions des sites |
| Lire directement Instagram, TikTok, LinkedIn, Facebook | Plus d'API publique ; scraping interdit. Ces profils sont trouvés par moteur de recherche (titre et extrait). |
| Reconnaissance faciale | Données biométriques sensibles (nLPD) |
| Contourner Cloudflare ou un CAPTCHA | Contournement d'une protection |

Ces techniques sont expliquées au visiteur dans le plan d'action, sans être
exécutées.

## 7. Méthode d'enquête

### Vocabulaire

| Terme | Sens |
| --- | --- |
| Identifiant | Une valeur d'un type de la section 6.1, donnée à une source. |
| Constat | Une valeur d'un champ de la fiche, avec sa source, sa preuve, son niveau de confiance et son chemin. |
| Rebond | Un nouvel identifiant trouvé, renvoyé dans la matrice. |
| Chemin | La suite de rebonds qui a mené à un constat (email, puis fuite Pandabuy, puis pseudo, puis profil Steam). |

### Boucle

```text
file = identifiants saisis (confiance « confirmé »)
déjà vus = vide

tant que la file n'est pas vide :
  1. prendre un identifiant ; passer s'il est déjà vu
  2. interroger toutes les sources de la matrice pour son type
  3. pour chaque réponse : extraire les constats et les nouveaux identifiants
  4. calculer le niveau de confiance de chacun
  5. ajouter à la file les nouveaux identifiants « confirmé » ou « probable »
  6. envoyer les constats à l'écran au fur et à mesure

fin : quand aucun nouvel identifiant fiable n'apparaît
```

Il n'y a pas de limite de profondeur ni de durée (décision du 2026-11-16).
L'enquête s'arrête d'elle-même quand les rebonds ne donnent plus rien de
nouveau. La fiche se remplit en direct pendant ce temps. La seule limite est
le quota de chaque source.

### Rattachement et niveaux de confiance

| Niveau | Condition | Affiché | Sert au rebond |
| --- | --- | --- | --- |
| Confirmé | La source contient aussi un `EMAIL` ou un `TEL` déjà confirmé, ou un `PROFIL` confirmé renvoie vers elle | Oui | Oui |
| Probable | `PSEUDO` rare et au moins un autre indice cohérent (même ville, même photo, même nom, même année) | Oui, marqué « probable » | Oui |
| Possible | `PSEUDO` seul, ou `NOM` avec un indice faible | Total seulement | Non |
| Homonyme probable | `NOM` seul | Total seulement | Non |

Règles :

- Un `NOM` seul ne sert jamais de rebond. C'est la principale source de faux
  résultats du prototype.
- Un pseudo est rare s'il n'est pas un mot du dictionnaire, un prénom seul ou
  une combinaison courante ; le critère exact est à définir et à tester.
- Un site qui ne répond pas clairement donne « inconnu », jamais « trouvé ».
- Chaque constat garde son chemin, pour que l'écran explique « trouvé grâce
  à… ».

## 8. Restitution

- La fiche de vie, dans l'ordre de la section 5, avec le taux de remplissage
  par catégorie.
- Chaque valeur masquée, avec un bouton « œil », sa source, son niveau de
  confiance et son chemin.
- Pour chaque fuite : nom, date, description, et la fiche de la personne, champ
  par champ, masquée avec un bouton « œil ».
- Le graphe des rebonds, en direct pendant l'enquête.
- La liste des services qui ont reçu les données du visiteur.
- Un plan d'action par constat.

## 9. Invariants

| Invariant | Statut |
| --- | --- |
| Zéro stockage : données en mémoire le temps de l'enquête, pas de base, de fichier, de cookie ni de `localStorage` | Gardé |
| Aucune donnée personnelle dans les logs ni dans l'URL (`POST` uniquement) | Gardé |
| Clés API côté serveur uniquement | Gardé |
| Liste blanche de champs dans chaque adaptateur de source (les champs de la fiche) | Gardé |
| Effacement à la fin et après inactivité | Gardé |
| Consentement par case à cocher | Gardé |
| Fiche trouvée par nom détaillée seulement si elle contient un autre identifiant saisi | Remplacé par les niveaux de confiance (section 7), à valider |
| Pas d'exposition de tiers | Changé : entourage détaillé (J1), à valider |
| Valeurs masquées | Changé : masquées par défaut, visibles avec le bouton « œil », à valider |
| Jamais de mot de passe ni de hash affiché | Changé : affiché derrière le bouton « œil », à valider |

## 10. Décisions et points à valider

### Décisions prises par Enzo (2026-11-16)

| Sujet | Décision |
| --- | --- |
| But | Enquête automatique sur la vie complète d'un volontaire consentant |
| Périmètre | Toute la fiche de vie, sans priorité entre les champs |
| Écran | Volontaire seul, coin privé |
| Durée | Pas de limite ; la fiche se remplit en direct |
| Profondeur de rebond | Pas de limite ; arrêt quand plus rien de nouveau |
| Affichage | Tout est affiché, masqué par défaut, visible avec le bouton « œil » |
| Mots de passe | Affichés derrière le bouton « œil » |
| Entourage | Détaillé (J1), sans enquête sur les proches |
| Preuve de possession | Case à cocher |
| Budget | Plus de 150 CHF, justifié ligne par ligne dans `BUDGET.md` |
| Date de la démo | Portes ouvertes de janvier 2027 |
| Base de code | Repartir de zéro sur `sandbox`, à partir de `main` et des règles de Tiago, pour pouvoir fusionner dans `main` |
| Ancien prototype | Archivé dans une branche `sandbox-v1` avant de repartir |

### À valider par l'enseignant

| Point | Risque à présenter |
| --- | --- |
| Changement de but : d'un outil de sensibilisation aux fuites à une enquête complète | Le cadre D12 a été donné pour l'ancien but. |
| Contenu complet des fiches de fuites (H2) | Données issues de bases volées, affichées en clair derrière l'œil. |
| Mots de passe affichés (H3) | Un mot de passe encore utilisé s'affiche en clair sur un poste partagé ; l'opérateur peut le voir. Alternative : indice seulement (longueur, deux premiers caractères). |
| Entourage détaillé (J1) | Données de tiers qui n'ont pas donné leur accord (nLPD). Alternative : nombre de proches seulement. |
| Case à cocher comme seule preuve | N'empêche pas un visiteur de taper l'email d'un autre et de voir sa fiche de fuite. Alternative : code envoyé à l'email. |
| Budget de plus de 150 CHF | À détailler dans `BUDGET.md` après les tests. |

### À valider avec Tiago

| Point | Pourquoi |
| --- | --- |
| Le cadrage entier | Il redéfinit le but du projet. |
| Fusion de `sandbox` dans `main` | Le `CLAUDE.md` de `main` prévoit que le prototype n'est jamais fusionné. |
| Son rôle dans la nouvelle base | Pas encore décidé : relecteur, ou partage du travail (moteur, sources, interface). |

### À valider par des tests (enquête manuelle)

| Point | Comment |
| --- | --- |
| Service de fiches de fuites | Interroger DeHashed, LeakCheck, Snusbase, Intelligence X sur nos propres données et comparer les champs renvoyés. |
| Sources « À tester » de la matrice | Les essayer à la main ; les passer en « Testé » ou les retirer. |
| Critère de pseudo rare | Essayer plusieurs pseudos réels et noter lesquels donnent des homonymes. |
| Durée réelle d'une enquête | La mesurer, même sans limite, pour organiser le stand. |

## 11. Critères de réussite

Mesure par comparaison avec une enquête manuelle :

1. Pour chaque volontaire de test (Enzo, Tiago, d'autres élèves consentants),
   on fait d'abord l'enquête à la main en suivant la matrice, et on remplit la
   fiche de la section 5. C'est la référence.
2. On lance l'outil avec les mêmes saisies.
3. On compare champ par champ.

L'outil est réussi si :

- il retrouve au moins ce que l'enquête manuelle a trouvé avec les sources de
  la matrice ;
- aucune valeur d'un homonyme n'est affichée « confirmé » ou « probable » ;
- chaque valeur affichée a une source et un chemin vérifiables.

## 12. Étapes suivantes

Les portes ouvertes ont lieu en janvier 2027.

1. Présenter ce document à Tiago, puis à l'enseignant ; noter leurs réponses
   dans la section 10.
2. Enquête manuelle sur nos propres données avec la matrice : remplir la fiche
   de référence, tester les services de fiches de fuites et les sources « À
   tester ».
3. Préparer le budget dans `BUDGET.md`.
4. Archiver le prototype dans `sandbox-v1`, puis faire repartir `sandbox` de
   `main`.
5. Écrire le modèle de données (identifiant, constat, chemin, confiance, champs
   de la fiche) et ses tests.
6. Construire le moteur d'enquête, puis l'interface.
