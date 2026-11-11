# Idées d'amélioration

Ce fichier garde les idées pour plus tard. Elles ne sont pas décidées : elles
seront reprises une fois qu'une première version fonctionne. Une idée retenue
devient une décision numérotée dans `DECISIONS.md` et est retirée d'ici.

## I1. Moteur d'enquête avec rebond

Date : 2026-11-11

### Principe

Aujourd'hui, chaque source est interrogée avec les données saisies par le
visiteur. Une vraie enquête OSINT va plus loin : une information trouvée sert
de point de départ pour une nouvelle recherche (« rebond » ou « pivoting »).

Exemple : l'email mène à un compte GitHub, le compte GitHub donne un pseudo, le
pseudo mène à d'autres profils, un profil indique une ville, la ville permet de
retrouver l'adresse dans l'annuaire.

Le but pédagogique est de montrer que des informations isolées et anodines
permettent, une fois assemblées, d'en apprendre beaucoup sur une personne.

### Étapes

1. Collecter : interroger toutes les sources disponibles pour chaque donnée
   connue.
2. Rebondir : chaque nouvelle donnée trouvée (pseudo, domaine, ville…) devient
   une nouvelle recherche.
3. Vérifier : calculer pour chaque résultat un niveau de confiance (la donnée
   concerne-t-elle bien le visiteur ?).

### Limites du rebond

- Profondeur limitée (par exemple 2 ou 3 rebonds).
- Budget de requêtes par visiteur, pour rester dans les quotas gratuits.
- Temps maximum. Les résultats s'affichent au fur et à mesure.
- Le rebond part uniquement des données du visiteur.

### Sources envisagées

Les sources gratuites de ce tableau (sauf WhatsMyName, Zefix, ORCID et
Wikidata) sont intégrées depuis D14 et D16. La Wayback Machine sert à vérifier
les pages trouvées, ce qui est un premier rebond limité.

| Catégorie | Sources | Accès |
|---|---|---|
| Moteurs de recherche | Tavily : donnée exacte, plusieurs formats de téléphone, filtres par site et par type de fichier | Clé gratuite |
| Pseudos et réseaux sociaux | Liste WhatsMyName (pages de profil publiques) | Gratuit |
| Code | GitHub, GitLab (commits, profils) | Gratuit |
| Identité technique | Gravatar, serveurs de clés PGP, domaine de l'email (RDAP) | Gratuit |
| Archives du web | Wayback Machine (pages supprimées) | Gratuit |
| Annuaires et registres | search.ch, Zefix, Feuille officielle suisse du commerce | Gratuit |
| Presse, sport, associations | Recherche ciblée (presse locale, résultats sportifs) | Via Tavily |
| Publications | ORCID, Wikidata | Gratuit |
| Fuites | XposedOrNot (`surface`), service payant (`deep`, voir D10) | Selon le mode |

Ajout possible au formulaire : un champ « pseudo » optionnel, car le pseudo est
souvent la donnée qui mène au plus grand nombre de profils.

### Vérification par niveaux de confiance

Chaque résultat est relié au visiteur par des preuves :

| Preuve | Force |
|---|---|
| Email ou téléphone identique (après normalisation) | Forte |
| Même photo de profil (comparaison d'empreinte d'image) | Forte |
| Même pseudo, avec une autre preuve | Moyenne |
| Même ville, même année de naissance | Faible |
| Nom seul | Très faible (probablement un homonyme) |

Niveaux affichés :

- Confirmé : au moins une preuve forte.
- Probable : plusieurs preuves moyennes qui se recoupent.
- Incertain : nom seul.

L'écran explique pour chaque résultat pourquoi il est rattaché au visiteur
(« trouvé grâce au pseudo, confirmé par la photo de profil »).

Ce calcul serait de la logique pure (`src/server/domain/`), testable avec
Vitest.

### Protections à prévoir

- Preuve que les données appartiennent au visiteur : un code envoyé à l'email
  saisi, à taper sur le poste, avant la recherche approfondie. Une case à
  cocher ne suffit plus à ce niveau.
- La règle anti-homonymes reste valable : seuls les résultats « Confirmé »
  sont détaillés. Les autres affichent uniquement des métadonnées sans donnée
  de tiers. Tout assouplissement de cette règle demande une décision avec
  l'enseignant.
- Chaque nouvelle source reçoit la saisie du visiteur : le texte de
  consentement doit la mentionner.

### Pistes écartées

| Piste | Raison |
|---|---|
| Énumération de comptes (holehe, GHunt) | Détourne les fonctions « mot de passe oublié » ou des API internes, contraire aux conditions d'utilisation des sites. |
| Présence sur WhatsApp, Telegram, Truecaller | Nécessite de synchroniser des contacts, interdit par ces services. |
| Scraping direct de Google ou des réseaux sociaux | Interdit par leurs conditions d'utilisation ; passer par une API de recherche. |

## I2. Aller plus loin : méthode et sources

Date : 2026-11-11

Pistes classées par gain attendu. Le point 1 est en cours sur la branche
`sandbox` (voir D17).

1. (Fait, D17.) Rebond et pseudo : récupérer les pseudos dans les profils liés à l'email
   (GitHub, Gravatar) et dans les adresses des pages vérifiées, puis vérifier
   chaque pseudo sur environ 650 sites avec la liste WhatsMyName. Ajouter un
   champ « pseudo » au formulaire.
2. (Fait, D18.) Variantes : chercher « E. Pachoud », « Pachoud E. » et la partie de l'email
   avant le @ comme pseudo ; pour le téléphone, interroger aussi les sites de
   signalement de spam (tellows…).
3. (Fait, D18.) Contexte : un champ optionnel « localité » ou « année de naissance ». Une
   page avec le nom complet et la localité devient « probable ».
4. (Bloqué par le filtre réseau, voir D18.) Fuites publiques gratuites en mode `deep` : ProxyNova (compilation COMB),
   psbdmp (pastes), Intelligence X (offre gratuite). Jamais de mot de passe
   affiché. État des services et conditions d'utilisation à vérifier.
5. (Archives X faites en D17 ; PDF couverts par Tavily, voir D18.) Lecture des PDF vérifiés (email, téléphone, auteur) et archives des profils
   déduits des pseudos (par exemple `twitter.com/pseudo` avant 2023).

Autres sources publiques envisagées (Keybase, ORCID et Wikidata faits en D18) : Zefix et la Feuille officielle suisse du
commerce (FOSC), Keybase, ORCID, Wikidata, Hunter.io (25 recherches par mois),
un deuxième moteur de recherche (Brave, Marginalia).

Protection à prévoir avant le rebond complet : le code de vérification par
email décrit dans I1.
