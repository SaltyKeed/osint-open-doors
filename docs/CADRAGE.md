# Cadrage de l'outil d'enquête

Date : 2026-11-16, adapté le 2026-11-17

Proposé par Enzo sur la branche `sandbox` (décisions D19 à D25 de cette
branche), repris avec des modifications en T1 (`DECISIONS.md`). Validation de
l'enseignant orale, à confirmer par écrit.

## 1. Pourquoi ce document

Le premier prototype (archivé dans la branche `sandbox-v1`) a été construit
source par source (32 décisions). Il n'a jamais défini ce que l'outil doit
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
| Qui voit l'écran ? | Le volontaire et l'élève présent au stand, dans un coin privé. Pas de projection. |
| Où ? | Aux portes ouvertes du CPNE, sur un PC de l'école. |
| Jusqu'où ? | Toute la fiche de la section 5. Pas de priorité entre les champs. |
| Comment avance l'enquête ? | Automatiquement, de rebond en rebond, jusqu'à ce qu'aucun nouvel identifiant fiable n'apparaisse. |
| Quel résultat ? | La fiche de vie remplie, chaque valeur avec sa source, son niveau de confiance et son chemin. |
| Quand est-ce réussi ? | Quand le volontaire juge sa fiche juste et complète (section 11). |

Ce but remplace celui du départ (un visiteur qui voit les métadonnées des
fuites où il apparaît). Le changement est décidé en T1 ; l'enseignant l'a
validé oralement.

## 3. Scénario

```text
1. Le volontaire s'installe. Un élève explique le principe et reste présent
   pendant toute la recherche.
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
| J1 | Proches identifiables (famille, amis, collègues) : nom, prénom, âge et adresse si trouvés |

L'entourage est limité à ces informations de surface (T1). Ce sont des tiers
qui n'ont pas donné leur accord : le risque est accepté en T1. Les
identifiants des proches ne sont jamais renvoyés dans la boucle d'enquête :
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
remplissent et les nouveaux identifiants qu'elles produisent (rebonds). Le détail
de chaque source (adresse appelée, champs renvoyés, prix, statut) est dans
`SOURCES.md`. Le
statut « à tester » veut dire que la source n'a pas encore été vérifiée à la
main sur nos propres données.

Statuts :

- En place : un adaptateur existe dans `main`.
- Prototype : un adaptateur existe dans `sandbox-v1`, à reprendre et tester.
- Partiel : l'adaptateur de `sandbox-v1` couvre une partie de la ligne.
- À refaire : l'adaptateur de `sandbox-v1` est à réécrire.
- Nouveau : jamais codé ; l'adresse vient de la documentation officielle
  (`SOURCES.md`).
- Retenu : source payante choisie par Enzo (`SOURCES.md`, section 10),
  souscrite seulement après l'acceptation du budget.

| Entrée | Source | Remplit | Nouveaux identifiants | Accès | Statut |
| --- | --- | --- | --- | --- | --- |
| `EMAIL` | Fiches de fuites (`SOURCES.md`, section 1.1) | A1 A2 A3 B2 B3 H1 H2 H3 H4 | `TEL` `PSEUDO` `NOM` `IP` `EMAIL` | Payant | Retenu |
| `EMAIL` | XposedOrNot | H1 | aucun | Gratuit, quota | En place |
| `EMAIL` | Have I Been Pwned Core 1, catalogue HIBP | H1 | aucun | Abonnement et gratuit | Retenu |
| `EMAIL` | Infostealers et combolists : Hudson Rock, LeakRadar Enterprise | H3 H5 | `DOMAINE` `PROFIL` | Gratuit et payant | Prototype et retenu |
| `EMAIL` | Gravatar, Libravatar | A1 A5 F2 | `PSEUDO` `PROFIL` | Gratuit | Prototype |
| `EMAIL` | GitHub (utilisateurs et commits) | A1 C1 E1 E3 F2 | `PSEUDO` `PROFIL` `DOMAINE` | Gratuit | Prototype |
| `EMAIL` | Serveurs de clés PGP | A1 B1 | `EMAIL` | Gratuit | Prototype |
| `EMAIL` | Moteur de recherche (valeur exacte) | I1 I3 | `PROFIL` | Clé gratuite | Prototype |
| `EMAIL` | Domaine de l'email (hors webmail) | E1 | `ORGA` `DOMAINE` | Gratuit | Nouveau |
| `EMAIL` | Partie avant le @ | aucun | `PSEUDO` (confiance « possible ») | Local | Prototype |
| `TEL` | Fiches de fuites : LeakCheck Pro, Leak-Lookup, HackCheck | A1 A2 B1 B3 C1 E1 H1 H2 H3 | `EMAIL` `NOM` `PSEUDO` | Payant | Retenu |
| `TEL` | Annuaire search.ch | A1 B3 C1 | `NOM` | Gratuit, quota | Prototype |
| `TEL` | Analyse locale du numéro | pays, type de ligne, opérateur d'origine | aucun | Local | Prototype |
| `TEL` | Moteur de recherche (plusieurs formats) | I1 I3 | `PROFIL` | Clé gratuite | Prototype |
| `PSEUDO` | Base de sites (WhatsMyName et Maigret, figée dans le dépôt) | F1 F2 | `PROFIL` | Gratuit | À refaire |
| `PSEUDO` | Fiches de fuites (`SOURCES.md`, section 1.1) | A1 B1 B2 B3 H1 H2 H3 | `EMAIL` `TEL` | Payant | Retenu |
| `NOM` | Fiches de fuites : Leak-Lookup, Snusbase, HackCheck | A2 B1 B2 B3 H1 H2 | `EMAIL` `TEL` (seulement si la fiche est « confirmé ») | Payant | Retenu |
| `IP` | Fiches de fuites : Leak-Lookup, Snusbase, HackCheck | H2 | `EMAIL` | Payant | Retenu |
| `PSEUDO` | Moteur de recherche | I1 | `PROFIL` | Clé gratuite | Prototype |
| `PROFIL` | API publique du site (GitHub, GitLab, Mastodon, YouTube, Twitch, Steam, Chess.com...) | A1 A5 C1 E1 F2 G2 | `PSEUDO` `PROFIL` `DOMAINE` | Gratuit | Partiel |
| `PROFIL` | Listes publiques d'abonnés, d'amis et mentions | J1 | aucun (identifiants de tiers, jamais relancés) | Gratuit | Nouveau |
| `PROFIL` | Wayback Machine | I2 | `PROFIL` | Gratuit | Prototype |
| `NOM` | Moteur de recherche ciblé : LinkedIn | A1 C1 D1 E1 | `ORGA` `PROFIL` | Clé gratuite | Nouveau |
| `NOM` | Moteur de recherche ciblé : presse, résultats sportifs, associations | C3 G1 G3 | `ORGA` | Clé gratuite | Partiel |
| `NOM` | Zefix, FOSC | E2 | `ORGA` | Gratuit | Nouveau |
| `NOM` | ORCID, OpenAlex | E3 | `ORGA` | Gratuit | Partiel |
| `NOM` | Annuaire search.ch | B2 B3 C1 | `TEL` | Gratuit, quota | Prototype (total seulement) |
| `DOMAINE` | RDAP, crt.sh, Wayback Machine | F3 I2 | `EMAIL` `NOM` | Gratuit | Partiel |
| `IP` | ip-api.com | H4 C1 (approximatif) | aucun | Gratuit | Retenu |
| `ORGA` | Moteur de recherche « nom + organisation » | D1 E1 G1 | `PROFIL` | Clé gratuite | Nouveau |

Lecture d'un exemple : un email saisi est donné au service de fiches de fuites.
La fiche Pandabuy contient un téléphone et un pseudo. Le téléphone est un
nouvel identifiant `TEL` confirmé (même fiche que l'email) : il repart dans la
matrice (annuaire, autres fuites). Le pseudo repart dans la base de sites, qui
trouve un profil Steam, dont la page publique donne une ville.

### 6.3 Règle d'ajout d'une source

Une source entre dans la matrice seulement si :

1. elle remplit au moins un champ de la fiche, ou produit un nouvel identifiant ;
2. elle est légale à interroger automatiquement (section 6.4) ;
3. elle est décrite dans `SOURCES.md` : adresse appelée, entrées, champs
   renvoyés, accès et prix, d'après sa documentation officielle.

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
le quota de chaque source : une source dont le quota est atteint est sautée
et l'écran l'indique.

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
- Le chemin des rebonds, en direct pendant l'enquête.
- La liste des services qui ont reçu les données du visiteur.
- Un plan d'action par constat, construit par des règles écrites à l'avance,
  sans IA (T1).

La forme de l'interface (écrans, graphe, identité visuelle) sera décidée plus
tard. La console `/dev` actuelle sert seulement aux tests.

## 9. Invariants

| Invariant | Statut |
| --- | --- |
| Zéro stockage : données en mémoire le temps de l'enquête, pas de base, de fichier, de cookie ni de `localStorage` | Gardé |
| Aucune donnée personnelle dans les logs ni dans l'URL (`POST` uniquement) | Gardé |
| Clés API côté serveur uniquement | Gardé |
| Liste blanche de champs dans chaque adaptateur de source (les champs de la fiche) | Gardé |
| Effacement à la fin et après inactivité | Gardé |
| Consentement par case à cocher, un élève présent pendant la recherche | Gardé (T1) |
| Aucune donnée trouvée envoyée à une IA | Nouveau (T1) |
| Fiche trouvée par nom détaillée seulement si elle contient un autre identifiant saisi | Remplacé par les niveaux de confiance (section 7, T1) |
| Pas d'exposition de tiers | Changé : entourage limité au nom, prénom, âge et adresse (J1, T1) |
| Valeurs masquées | Changé : masquées par défaut, visibles avec le bouton « œil » (T1) |
| Jamais de mot de passe ni de hash affiché | Changé : affiché derrière le bouton « œil » (T1) |

Ces invariants s'appliquent au moteur d'enquête. Tant qu'il n'est pas codé,
`ARCHITECTURE.md`, section 2, décrit ceux du code actuel.

## 10. Décisions et validations

Les propositions d'Enzo du 2026-11-16 ont été reprises par Tiago en T1
(`DECISIONS.md`), avec l'accord d'Enzo.

| Sujet | Proposition d'Enzo | Retenu (T1) |
| --- | --- | --- |
| But | Enquête automatique sur la vie complète d'un volontaire consentant | Repris |
| Périmètre, durée, profondeur | Toute la fiche, sans limite ; arrêt quand plus rien de nouveau | Repris |
| Affichage | Tout est affiché, masqué par défaut, visible avec le bouton « œil » | Repris |
| Mots de passe | Affichés derrière le bouton « œil » | Repris |
| Entourage | Détaillé | Limité au nom, prénom, âge et adresse si trouvés |
| Preuve de possession | Case à cocher | Case à cocher et un élève présent pendant la recherche |
| Sources | Catalogue `SOURCES.md`, XposedOrNot supprimé | Catalogue repris, XposedOrNot gardé |
| Budget | Plus de 150 CHF | Sources gratuites d'abord ; payantes après l'acceptation du budget |
| Plan d'action | Rédigé par l'API Anthropic | Règles écrites à l'avance, sans IA |
| Organisation | `sandbox` fusionnée dans `main` en fin de projet | Les idées sont refaites dans `main`, une pull request par étape |

### Validé par l'enseignant (oralement, 2026-11-16)

Chaque point a été présenté par Enzo avec son risque. La validation est à
confirmer par écrit.

| Point | Risque présenté |
| --- | --- |
| Changement de but : d'un outil de sensibilisation aux fuites à une enquête complète | Le cadre D12 a été donné pour l'ancien but. |
| Contenu complet des fiches de fuites (H2) | Données issues de bases volées, affichées en clair derrière l'œil. |
| Mots de passe affichés (H3) | Un mot de passe encore utilisé s'affiche en clair sur un poste partagé ; l'élève présent peut le voir. Alternative : indice seulement (longueur, deux premiers caractères). |
| Entourage (J1) | Données de tiers qui n'ont pas donné leur accord (nLPD). T1 limite l'entourage aux informations de surface. |
| Case à cocher comme seule preuve | N'empêche pas un visiteur de taper l'email d'un autre et de voir sa fiche de fuite. Alternative : code envoyé à l'email. T1 ajoute la présence d'un élève. |
| Budget de plus de 150 CHF | À détailler dans `BUDGET.md`. |

### À régler pendant le développement

| Point | Comment |
| --- | --- |
| Prix de Snusbase | Relevé à la création du compte, reporté dans `BUDGET.md`. |
| Devis de Leak-Lookup | Demande de devis pour l'API privée, en présentant le projet scolaire ; si refus, LeakCheck et Snusbase restent les services à fiches. |
| Forme exacte des réponses des sources | Relevée avec la console `/dev` (D18) au moment de coder l'adaptateur. |
| Critère de pseudo rare | Défini avec des exemples inventés dans les tests du domaine. |
| Durée réelle d'une enquête | Mesurée sur les premiers essais, pour organiser le stand. |

## 11. Critères de réussite

Mesure sur des volontaires de test (Enzo, Tiago, d'autres élèves
consentants) :

1. On lance l'outil avec leurs saisies.
2. Le volontaire relit sa fiche et marque chaque valeur « juste » ou « fausse »,
   et signale ce qu'il sait être en ligne mais qui manque.
3. Une valeur fausse montre une erreur de rattachement ; une valeur manquante
   montre un trou dans la matrice (section 6.3).

L'outil est réussi si :

- chaque source de `SOURCES.md` a répondu au moins une fois pendant les
  essais ;
- aucune valeur d'un homonyme n'est affichée « confirmé » ou « probable » ;
- chaque valeur affichée a une source et un chemin vérifiables.

## 12. Étapes suivantes

Les portes ouvertes ont lieu en janvier 2027. Chaque étape a son issue et sa
pull request vers `main`.

1. Obtenir la confirmation écrite de l'enseignant.
2. Préparer le budget dans `BUDGET.md` et le faire accepter par l'enseignant.
3. Écrire le modèle de données (identifiant, constat, chemin, confiance,
   champs de la fiche) et ses tests.
4. Construire le moteur d'enquête avec les sources gratuites, en commençant
   par XposedOrNot, GitHub, Gravatar et Hudson Rock ; tester l'accès aux
   sources depuis le réseau de l'école.
5. Ajouter les sources payantes après l'acceptation du budget.
6. Décider et construire l'interface.
7. Essais sur volontaires et corrections.
