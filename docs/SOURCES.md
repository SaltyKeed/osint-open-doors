# Catalogue des sources

Date : 2026-11-16

Ce document dit sur quoi l'outil tape pour remplir la fiche de vie
(`CADRAGE.md`, section 5). Pour chaque source : l'adresse appelée, ce qu'on lui
envoie, ce qu'elle renvoie, les champs de la fiche qu'elle remplit, les
nouveaux identifiants qu'elle produit (rebonds) et son accès.

Une source qui n'est pas dans ce catalogue n'est pas appelée par l'outil. Une
nouvelle source y entre selon la règle de `CADRAGE.md`, section 6.3.

Statuts :

- Prototype : un adaptateur existe dans la branche `sandbox-v1` et a déjà
  répondu ; il est à reprendre.
- Nouveau : jamais codé ; l'adresse vient de la documentation officielle.
- Retenu : source payante ou nouvelle choisie le 2026-11-16 (section 11).
- Écarté : ne sera pas utilisé (raison donnée).

Les prix ont été relevés le 2026-11-16. Ceux marqués « source tierce » ne
viennent pas de la page officielle et sont à vérifier avant l'achat.

## 1. Fiches de fuites

Ce sont les seules sources qui renvoient le contenu de la fiche de la personne
dans une fuite (H2) : nom, adresse, téléphone, date de naissance, IP, mot de
passe. Elles sont payantes.

| Source | Appel | Entrées | Renvoie | Accès | Statut |
| --- | --- | --- | --- | --- | --- |
| LeakCheck Pro | `GET https://leakcheck.io/api/v2/query/{valeur}?type=…`, en-tête `X-API-Key` | `email`, `username`, `phone`, `domain`, `keyword`, `hash` | Par fiche : `source` (nom, date de la fuite), `email`, `username`, `first_name`, `last_name`, `dob`, `address`, `zip`, `phone`, `password`, et la liste `fields` des champs présents | 9.99 USD par mois, 200 recherches par jour, 3 requêtes par seconde | Retenu |
| Snusbase | API de recherche, documentation sur `docs.snusbase.com` (adresse exacte à relever après création du compte) | Email, nom, pseudo, IP, téléphone, hash | Fiche complète : noms, adresses, mots de passe en clair et autres champs | API gratuite pour les membres payants, jusqu'à 2048 requêtes par jour ; prix de l'abonnement non publié | Retenu |
| DeHashed | `POST https://api.dehashed.com/v2/search`, en-tête `Dehashed-Api-Key` | Email, pseudo, nom, téléphone, adresse, IP, domaine, VIN, hash | Fiche : email, pseudo, mot de passe, hash, IP, téléphone, nom, adresse, date de naissance, entreprise, nom de la base | API seulement avec l'offre Professional, 179.99 USD par mois, plus des crédits (source tierce) | Retenu |
| Intelligence X | API de recherche (non relevée, source écartée) | Email, domaine, téléphone, URL | Fichiers bruts (pastes, fuites) qui contiennent la valeur | Compte gratuit : 50 recherches par jour, usage non commercial. API des fuites dès 10 000 EUR par an. | Écarté : l'offre gratuite ne renvoie pas de fiches, l'offre utile est hors budget |

Ces services renvoient des mots de passe en clair. L'adaptateur les garde
seulement pour le champ H3, affiché derrière le bouton « œil » (D19).

## 2. Liste des fuites et sécurité

Ces sources disent dans quelles fuites la personne apparaît et ce qui a fui,
sans le contenu de la fiche. Elles complètent la section 1 avec une
description fiable de chaque fuite.

| Source | Appel | Entrée | Renvoie | Remplit | Rebonds | Accès | Statut |
| --- | --- | --- | --- | --- | --- | --- | --- |
| XposedOrNot | `GET https://api.xposedornot.com/v1/breach-analytics?email=…` | Email | Fuites, dates, types de données exposées | H1 | aucun | Gratuit | Prototype |
| Have I Been Pwned | `GET https://haveibeenpwned.com/api/v3/breachedaccount/{email}?truncateResponse=false`, en-tête `hibp-api-key` | Email | Fuites avec titre, date, description, types de données, logo | H1 | aucun | Core 1 : 4.39 USD par mois, 10 requêtes par minute | Retenu |
| Catalogue HIBP | `GET https://haveibeenpwned.com/api/v3/breaches` | aucune | Description de toutes les fuites connues | H1 (description d'une fuite trouvée ailleurs) | aucun | Gratuit | Prototype |
| Hudson Rock | `GET https://cavalier.hudsonrock.com/api/json/v2/osint-tools/search-by-email?email=…`, `search-by-username?username=…` | Email, pseudo | Ordinateurs infectés : date, système, nombre d'identifiants volés | H5 | aucun | Gratuit | Prototype |
| ransomware.live | `GET https://api.ransomware.live/v2/searchvictims/{organisation}` | Domaine de l'email ou employeur | Organisation revendiquée par un rançongiciel | H1 (fuite de l'employeur) | aucun | Gratuit | Prototype |

## 3. Comptes liés à l'email

| Source | Appel | Renvoie | Remplit | Rebonds | Accès | Statut |
| --- | --- | --- | --- | --- | --- | --- |
| Gravatar | `GET https://api.gravatar.com/v3/profiles/{sha256 de l'email}` et `https://www.gravatar.com/avatar/{hash}?d=404` | Nom affiché, photo, bio, lieu, comptes liés | A1 A5 C1 F2 | `PSEUDO` `PROFIL` | Gratuit | Prototype |
| Libravatar | `GET https://seccdn.libravatar.org/avatar/{hash}?d=404` | Photo | A5 | aucun | Gratuit | Nouveau |
| GitHub | `GET https://api.github.com/search/commits?q=author-email:{email}` puis `GET https://api.github.com/users/{login}` | Compte qui a commité avec cet email : nom, ville, employeur, site, bio | A1 C1 E1 E3 F2 F3 | `PSEUDO` `PROFIL` `DOMAINE` | Gratuit (jeton sans droit conseillé) | Prototype |
| Clés PGP | `GET https://keys.openpgp.org/vks/v1/by-email/{email}` | Nom et autres emails de la clé | A1 B1 | `EMAIL` | Gratuit | Prototype |
| Keybase | `GET https://keybase.io/_/api/1.0/user/lookup.json?…` | Comptes prouvés (GitHub, domaine, réseaux) | F1 F2 F3 | `PSEUDO` `PROFIL` `DOMAINE` | Gratuit | Prototype |
| Domaine de l'email | Calcul local, puis RDAP (section 8) si ce n'est pas un webmail | Organisation (école, employeur) | E1 D1 | `ORGA` `DOMAINE` | Gratuit | Nouveau |
| Partie avant le @ | Calcul local | Pseudo candidat | aucun | `PSEUDO` (confiance « possible ») | Local | Prototype |

## 4. Comptes liés au pseudo

### 4.1 Vérification sur une liste de sites

| Source | Appel | Renvoie | Remplit | Rebonds | Accès | Statut |
| --- | --- | --- | --- | --- | --- | --- |
| WhatsMyName (`wmn-data.json`) | Copie figée dans le dépôt (CC BY-SA 4.0), puis une requête par site sur l'adresse du profil | Compte trouvé, absent ou inconnu (code HTTP et texte de la page, les deux exigés) | F1 F2 | `PROFIL` | Gratuit | À refaire : le prototype téléchargeait le fichier depuis GitHub, le projet est archivé |
| Maigret (`data.json`) | Fusion avec WhatsMyName : seulement les sites avec texte de présence et d'absence, sans `disabled` ni `protection` | Comme ci-dessus, environ 3000 sites | F1 F2 | `PROFIL` | Gratuit (MIT) | Nouveau |

### 4.2 API publiques des plateformes

Quand une plateforme a une API publique, on l'appelle au lieu de lire la page :
la réponse est plus sûre et donne plus de champs.

| Plateforme | Appel | Renvoie | Remplit | Accès | Statut |
| --- | --- | --- | --- | --- | --- |
| GitHub | `GET https://api.github.com/users/{pseudo}` | Nom, ville, employeur, site, bio, date de création | A1 C1 E1 F2 F3 | Gratuit | Prototype |
| GitLab | `GET https://gitlab.com/api/v4/users?username={pseudo}` | Nom, photo | A1 A5 F2 | Gratuit | Prototype |
| Codeberg | `GET https://codeberg.org/api/v1/users/{pseudo}` | Nom, lieu, site | A1 C1 F2 | Gratuit | Prototype |
| Mastodon | `GET https://mastodon.social/api/v1/accounts/lookup?acct={pseudo}` | Nom, bio, liens, date | A1 F2 | Gratuit | Prototype |
| Bluesky | `GET https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor={pseudo}` | Nom, bio, photo, date | A1 A5 F2 | Gratuit | Prototype |
| Chess.com | `GET https://api.chess.com/pub/player/{pseudo}` | Nom, pays, ville, date d'inscription | A1 C1 F2 G2 | Gratuit | Prototype |
| Lichess | `GET https://lichess.org/api/user/{pseudo}` | Bio, pays, date | F2 G2 | Gratuit | Prototype |
| Minecraft | `GET https://api.mojang.com/users/profiles/minecraft/{pseudo}` | Existence du compte | F2 G2 | Gratuit | Prototype |
| Scratch | `GET https://api.scratch.mit.edu/users/{pseudo}` | Pays, bio, date | F2 G2 | Gratuit | Prototype |
| Speedrun.com | `GET https://www.speedrun.com/api/v1/users?lookup={pseudo}` | Pays, liens vers Twitch et YouTube | F2 G2 | Gratuit | Prototype |
| Hacker News | `GET https://hacker-news.firebaseio.com/v0/user/{pseudo}.json` | Bio, date | F2 | Gratuit | Prototype |
| dev.to | `GET https://dev.to/api/users/by_username?url={pseudo}` | Nom, lieu, bio, liens | A1 C1 F2 | Gratuit | Prototype |
| Docker Hub | `GET https://hub.docker.com/v2/users/{pseudo}` | Nom, lieu, société | A1 C1 E1 F2 | Gratuit | Prototype |
| Discogs | `GET https://api.discogs.com/users/{pseudo}` | Nom, lieu, site | A1 C1 F2 G2 | Gratuit | Prototype |
| Wikipédia | `GET https://fr.wikipedia.org/w/api.php?action=query&list=users&ususers={pseudo}` | Existence, date d'inscription | F2 | Gratuit | Prototype |
| Steam | `GET https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?vanityurl={pseudo}` puis `GetPlayerSummaries/v2` | Nom, pays, photo, date, jeux si publics | A1 A5 C1 F2 G2 | Clé gratuite | Nouveau |
| Twitch | `GET https://api.twitch.tv/helix/users?login={pseudo}` | Bio, photo, date de création | A5 F2 G2 | Application gratuite | Nouveau |
| YouTube | `GET https://www.googleapis.com/youtube/v3/channels?forHandle=@{pseudo}&part=snippet` | Nom, description, pays, date | A1 F2 G2 | Clé gratuite, 10 000 unités par jour | Nouveau |

Chaque profil trouvé est lu une deuxième fois pour en tirer les liens vers
d'autres comptes et les autres pseudos (rebonds `PROFIL` et `PSEUDO`).

## 5. Moteurs de recherche

Les grands réseaux (LinkedIn, Instagram, TikTok, Facebook, X) n'ont plus d'API
publique et interdisent le scraping. On les atteint uniquement par un moteur de
recherche : titre et extrait de la page publique.

| Source | Appel | Accès | Statut |
| --- | --- | --- | --- |
| Tavily | `POST https://api.tavily.com/search` (filtre par domaines, profondeur `basic` ou `advanced`) | 1000 crédits gratuits par mois, gratuit pour les étudiants (à demander), puis 0.008 USD par crédit | Prototype |
| Brave Search API | `GET https://api.search.brave.com/res/v1/web/search?q=…`, en-tête `X-Subscription-Token` | 5 USD par 1000 requêtes, 5 USD offerts par mois | Retenu |
| Google Custom Search | API JSON | Fermée aux nouveaux clients, arrêt le 2027-01-01 (le mois de la démo) | Écarté |

### Requêtes envoyées

C'est la liste exacte de ce qu'on tape dans le moteur. `{nom}` vaut « Prénom
Nom » entre guillemets.

| Entrée | Requête | Filtre de domaines | Remplit |
| --- | --- | --- | --- |
| Email | `"{email}"` | aucun | I1 I3 |
| Téléphone | Tous les formats du numéro (`+41791234567`, `079 123 45 67`…) reliés par `OR` | aucun, puis annuaires et sites de signalement (tellows, local.ch…) | I1 B3 |
| Pseudo | `"{pseudo}"` | aucun, puis réseaux sociaux | F2 I1 |
| Nom | `{nom}` | aucun | I1 |
| Nom | `{nom}` | `linkedin.com` | D1 E1 C1 |
| Nom | `{nom}` | Réseaux sociaux (Instagram, TikTok, Facebook, X, Strava, Pinterest…) | F2 |
| Nom | `{nom}` | Presse romande et suisse (arcinfo.ch, rts.ch, 20min.ch…) | G3 |
| Nom | `{nom}` | Sport et clubs (swiss-athletics.ch, swiss-ski.ch, swissvolley.ch, chess-results.com…) | G1 C3 |
| Nom | `{nom} CV OR pdf OR membres OR liste` | aucun | I3 D1 E1 |
| Nom | `"P. Nom" OR "Nom P."` | aucun | I1 |
| Nom et localité | `{nom} "{localité}"` | aucun | C1 I1 |
| Nom et organisation | `{nom} "{organisation}"` | aucun | D1 E1 G1 |
| Pseudos devinés | `"{pseudo deviné}"` (à partir du nom et de la date de naissance) | Réseaux sociaux | F1 F2 |

Les listes de domaines du prototype (`sandbox-v1`,
`src/server/providers/tavily/searches.ts`) sont reprises.

## 6. Annuaires et registres suisses

| Source | Appel | Entrée | Renvoie | Remplit | Rebonds | Accès | Statut |
| --- | --- | --- | --- | --- | --- | --- | --- |
| search.ch | `GET https://search.ch/tel/api/?was=…&key=…&privat=1` | Téléphone, nom | Nom, adresse, ville, autres numéros | A1 B2 B3 C1 | `NOM` `TEL` | Clé gratuite, quota mensuel | Prototype |
| Zefix | `https://www.zefix.admin.ch/ZefixPublicREST/api/v1/…` | Nom de personne ou d'entreprise | Entreprises et fonctions inscrites | E2 | `ORGA` | Identifiants à demander | Nouveau |
| FOSC (Feuille officielle du commerce) | `GET https://amtsblattportal.ch/api/v1/publications?…` | Nom | Publications (inscriptions, mutations) | E2 | `ORGA` | Gratuit | Prototype |

## 7. Formation, travaux et publications

| Source | Appel | Renvoie | Remplit | Accès | Statut |
| --- | --- | --- | --- | --- | --- |
| ORCID | `GET https://pub.orcid.org/v3.0/expanded-search/?q=…` | Chercheur, institution, travaux | D1 E1 E3 | Gratuit | Prototype |
| OpenAlex | `GET https://api.openalex.org/authors?search=…` | Auteur, institution, publications | E1 E3 | Clé gratuite (obligatoire depuis février 2026) | Nouveau |
| Wikidata | `GET https://www.wikidata.org/w/api.php?action=wbsearchentities&…` | Personne notable : date de naissance, études, emploi | A2 D1 E1 | Gratuit | Prototype |

## 8. Domaines, archives et IP

| Source | Appel | Entrée | Renvoie | Remplit | Rebonds | Accès | Statut |
| --- | --- | --- | --- | --- | --- | --- | --- |
| RDAP | `GET https://rdap.org/domain/{domaine}` | Domaine | Titulaire (souvent masqué), dates | F3 E1 | `NOM` `EMAIL` | Gratuit | Prototype |
| crt.sh | `GET https://crt.sh/?q={domaine}&output=json` | Domaine | Sous-domaines, certificats | F3 | `DOMAINE` | Gratuit | Nouveau |
| Wayback Machine | `GET https://web.archive.org/cdx/search/cdx?url=…&output=json` | Profil, domaine | Pages archivées, y compris supprimées | I2 | `PROFIL` | Gratuit | Prototype |
| Common Crawl | `GET https://index.commoncrawl.org/{index}-index?url=…&output=json` | Profil, domaine | Pages absentes de la Wayback Machine | I2 | `PROFIL` | Gratuit | Nouveau |
| ip-api.com | `GET http://ip-api.com/json/{ip}` (HTTPS réservé à l'offre payante) | IP trouvée dans une fuite | Pays, ville approximative, fournisseur | H4 C1 | aucun | Gratuit pour un usage non commercial, 45 requêtes par minute ; conditions à relire | Retenu |

## 9. Téléphone (analyse locale)

| Source | Appel | Renvoie | Remplit | Accès | Statut |
| --- | --- | --- | --- | --- | --- |
| libphonenumber-js | Bibliothèque locale, aucun appel réseau | Pays, type de ligne, opérateur d'origine (pas l'actuel), formats du numéro pour les recherches | B2 | Gratuit | Prototype |

## 10. Entourage

| Source | Appel | Renvoie | Remplit | Statut |
| --- | --- | --- | --- | --- |
| Profils trouvés (GitHub, Bluesky, Mastodon, Chess.com…) | Listes publiques d'abonnés, d'abonnements et d'amis, par l'API de chaque plateforme | Proches identifiables | J1 | Nouveau |
| Fiches de fuites | Champs qui désignent un tiers (contact d'urgence, parent) | Proches | J1 | Nouveau |
| Moteur de recherche | Pages qui citent la personne avec d'autres noms (équipe, liste de membres) | Proches | J1 | Nouveau |

Les identifiants des proches ne sont jamais renvoyés dans la boucle d'enquête.

## 11. Choix faits

Choix d'Enzo du 2026-11-16 (D20).

| Choix | Décision | Raison |
| --- | --- | --- |
| Service de fiches de fuites | LeakCheck, Snusbase et DeHashed | Couverture maximale : trois bases différentes, et DeHashed cherche aussi par nom et adresse. |
| Moteur de recherche | Tavily et Brave | Deux index différents : Brave trouve des pages que Tavily rate. |
| Have I Been Pwned | Core 1 | Descriptions fiables des fuites par email. |
| Géolocalisation d'IP | ip-api.com | Donne la ville approximative, gratuit pour un projet scolaire. |
| Intelligence X, Google Custom Search | Écartés | Hors budget ; API fermée le 2027-01-01. |

Les services payants ne sont souscrits qu'après l'acceptation du budget par
l'enseignant (`BUDGET.md`).
