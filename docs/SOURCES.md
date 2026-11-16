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
- Retenu : source payante ou nouvelle choisie le 2026-11-16 (section 10).
- Écarté : ne sera pas utilisé (raison donnée).

Les prix ont été relevés le 2026-11-16. Ceux marqués « source tierce » ne
viennent pas de la page officielle et sont à vérifier avant l'achat.

## 1. Fuites de données

Toutes les sources accessibles de fuites, de bases volées et de journaux
d'infostealers ont été recensées (D21), comparées pour retirer les doublons
(D22), puis mesurées sur leur couverture réelle (D23). Le cadre est celui de
D12 : on interroge des services qui indexent les fuites, on ne télécharge
jamais de fuite.

### 1.1 Sources retenues

| Service | Appel | Entrées | Renvoie | Remplit | Accès et prix | Statut |
| --- | --- | --- | --- | --- | --- | --- |
| Leak-Lookup (API privée) | `POST https://leak-lookup.com/api/search`, paramètres `key`, `type`, `query` | `email_address`, `username`, `ipaddress`, `phone`, `domain`, `password`, `fullname` | Par fuite, les fiches en paires colonne et valeur : email, téléphone, IP, nom, pays, mot de passe, hash ; adresse sur demande | A1 B1 B2 B3 H1 H2 H3 H4 | Sur devis, accordé au cas par cas ; 5 requêtes par minute, 10 000 résultats au plus | Retenu, devis à demander |
| Snusbase | `POST https://api.snusbase.com/data/search`, en-tête `Auth` ; aussi `tools/combo-lookup` et `tools/hash-lookup` | `email`, `username`, `lastip`, `password`, `hash`, `name`, `_domain`, avec jokers `%` et `?` | Fiches groupées par base, avec les champs de la table (nom, adresse, téléphone, date de naissance, IP, mot de passe en clair ou hash) | A1 A2 A3 B1 B2 B3 H1 H2 H3 H4 | API incluse pour les membres payants, 2048 recherches par 12 heures ; prix non publié (dès 6.49 USD par semaine selon une source tierce) | Retenu |
| LeakCheck Pro | `GET https://leakcheck.io/api/v2/query/{valeur}?type=…`, en-tête `X-API-Key` | `email`, `username`, `phone`, `keyword`, `domain`, `hash` | Par fiche : `source` (nom, date), `email`, `username`, `first_name`, `last_name`, `dob`, `address`, `zip`, `phone`, `password`, liste `fields` | A1 A2 B1 B2 B3 H1 H2 H3 | Monthly : 9.99 USD par mois, 200 recherches par jour | Retenu |
| Have I Been Pwned Core 1 | `GET https://haveibeenpwned.com/api/v3/breachedaccount/{email}?truncateResponse=false`, en-tête `hibp-api-key` | Email | Fuites où l'email apparaît, avec titre, date, description, types de données, logo | H1 | 4.39 USD par mois, 10 requêtes par minute | Retenu |
| Hudson Rock | `GET https://cavalier.hudsonrock.com/api/json/v2/osint-tools/search-by-email?email=…` et `search-by-username?username=…` | Email, pseudo | Ordinateur infecté : date, système, nombre d'identifiants volés | H5 | Gratuit | Prototype |
| LeakRadar Starter | API REST | Email, pseudo, domaine | Identifiants volés par un infostealer : identifiant, mot de passe, adresse du site | H3 H5 F2 | 25 EUR par mois (299.99 par an), 10 000 révélations par jour | Retenu |
| Catalogue HIBP | `GET https://haveibeenpwned.com/api/v3/breaches` | aucune | Titre, date, description, types de données et logo de 1052 fuites | H1 (présentation d'une fuite trouvée par un autre service) | Gratuit | Prototype |
| ransomware.live | `GET https://api.ransomware.live/v2/searchvictims/{organisation}` | Domaine de l'email ou employeur | Organisation revendiquée par un rançongiciel | H1 (fuite de l'employeur) | Gratuit | Prototype |

Leak-Lookup, Snusbase et LeakCheck renvoient des mots de passe en clair.
L'adaptateur les garde seulement pour le champ H3, affiché derrière le bouton
« œil » (D19).

### 1.2 Couverture mesurée

Mesure du 2026-11-16. Les catalogues publics de Snusbase
(`GET https://api.snusbase.com/data/stats`, 2251 bases, 18,5 milliards de
lignes) et de Leak-Lookup (page des fuites, 4776 bases) ont été comparés au
catalogue de Have I Been Pwned (1052 fuites), par nom de site. Le rapprochement
par nom est approximatif. LeakCheck ne publie pas sa liste : sa couverture n'a
pas pu être mesurée.

| Années des fuites | Fuites connues de HIBP | Dans Snusbase | Dans Leak-Lookup | Dans l'un des deux |
| --- | --- | --- | --- | --- |
| Avant 2019 | 442 | 265 | 337 | 353 |
| 2019 à 2022 | 320 | 161 | 234 | 243 |
| 2023 à 2026 | 290 | 80 | 116 | 136 |

Ce que la mesure montre :

- Leak-Lookup couvre le plus de fuites, y compris des fuites récentes absentes
  de Snusbase (Pandabuy, Internet Archive, Boulanger).
- Environ 900 bases de Snusbase n'apparaissent pas chez Leak-Lookup, dont 58
  de plus d'un million de lignes : les deux services se complètent.
- Même réunis, ils ratent plus de la moitié des fuites de 2023 à 2026 connues de
  HIBP (Hot Topic, Suno, Ticketek, Carhartt…). HIBP Core donne au moins la
  présence de l'email dans ces fuites, sans le contenu de la fiche.
- Le catalogue de Snusbase contient surtout des sites de jeux (343 bases, plus
  96 serveurs Minecraft), des réseaux sociaux (216), des forums de hacking
  (194) et des boutiques (145). Il compte 2 bases de sites suisses, Leak-Lookup
  5.

### 1.3 Comparaison et doublons

Un service dont tout l'apport est déjà couvert par un service retenu est un
doublon. La comparaison porte sur les entrées acceptées, le contenu renvoyé,
l'apport unique, le prix et, quand c'est possible, la couverture mesurée.

| Service | Recherche par | Renvoie | Apport unique | Prix | Verdict |
| --- | --- | --- | --- | --- | --- |
| Leak-Lookup | Email, pseudo, IP, téléphone, domaine, mot de passe, nom complet | Fiche complète | Plus grande couverture mesurée, fuites récentes | Sur devis | Retenu |
| Snusbase | Email, pseudo, nom, IP, mot de passe, hash, domaine, jokers | Fiche complète | Environ 900 bases absentes de Leak-Lookup, jokers | Non publié | Retenu |
| LeakCheck Pro | Email, pseudo, téléphone, mot-clé, domaine | Fiche structurée | Couverture inconnue, peut contenir d'autres fuites | 9.99 USD par mois | Retenu (choix d'Enzo, D23) |
| Have I Been Pwned Core 1 | Email | Liste des fuites | Fuites récentes absentes des services à fiches | 4.39 USD par mois | Retenu |
| DeHashed | Email, pseudo, nom, téléphone, adresse, IP, VIN | Fiche, évite les mots de passe en clair | Recherche par adresse et VIN, inutile : on ne saisit jamais d'adresse | Environ 180 USD par mois | Doublon |
| HackCheck | Email, pseudo, nom, IP, téléphone, hash, domaine | Fiche | Aucun mesurable | 39.49 USD par mois | Doublon |
| BreachDirectory | Email, pseudo, téléphone, IP | Mots de passe masqués | Moins de contenu que les services retenus | 20 à 50 EUR par mois | Doublon |
| ProxyNova COMB | Email, pseudo | Paires email et mot de passe | Compilation COMB, déjà incluse dans Snusbase | Gratuit | Doublon |
| OathNet | Email, pseudo, IP, identifiants de jeux | Fiches et infostealers | Comptes de jeux liés (Discord, Xbox, Roblox), apport marginal | Non publié | Doublon |
| Hudson Rock | Email, pseudo | Résumé de l'infection | Date de l'infection, gratuit | Gratuit | Retenu |
| LeakRadar Starter | Email, pseudo, domaine | Identifiants volés avec le site | Contenu des journaux d'infostealers | 25 EUR par mois | Retenu |
| LeakRadar Enterprise | Comme Starter | En plus combolists et dark web | Combolists déjà dans Snusbase (`combo-lookup`) | 58.33 EUR par mois | Doublon |
| Revealer Pro | Email, pseudo | Fuites, infostealers (50 par jour), comptes | Son « énumération de comptes » est une technique exclue (`CADRAGE.md`, section 6.4) | 79.99 USD par mois | Doublon |
| Leak-Lookup public | Comme l'API privée | Noms des fuites seulement | 10 recherches par jour, insuffisant pour 200 visiteurs | Gratuit | Doublon de l'API privée |
| XposedOrNot, LeakCheck public, IPQS | Email | Liste des fuites | Couvert par HIBP Core et les services à fiches | Gratuit | Doublon |
| Catalogue XposedOrNot | aucune | Description de 801 fuites | Moins complet que le catalogue HIBP (1052) | Gratuit | Doublon |

### 1.4 Écartés pour une autre raison

| Service ou méthode | Raison |
| --- | --- |
| Intelligence X | L'offre qui donne les fiches (Identity Portal) coûte 10 000 EUR par an ; l'offre gratuite renvoie des fichiers bruts. |
| HEROIC, SpyCloud, Constella, Flare, Recorded Future, Webz.io | Contrat d'entreprise sur devis, réservé à la surveillance d'organisations. |
| Have I Been Pwned Pro (infostealers) | 379 USD par mois. |
| IntelBase | Prix et API non publiés. |
| Bots Telegram (LeakOSINT et semblables) | Exploitants inconnus, souvent liés à la cybercriminalité ou situés dans des pays sous sanctions ; les données du volontaire leur seraient envoyées et le paiement financerait ces acteurs. |
| Téléchargement de fuites (forums, torrents, canaux) | Stocke les données de millions de personnes sur le poste : contraire à l'invariant « zéro stockage » et à D12. |
| WeLeakInfo, GhostProject, LeakPeek, Scylla, PwnDB | Fermés ou saisis par la justice. |
| Google Dark Web Report, Mozilla Monitor Plus | Arrêtés (janvier 2026 et décembre 2025). |

## 2. Comptes liés à l'email

| Source | Appel | Renvoie | Remplit | Rebonds | Accès | Statut |
| --- | --- | --- | --- | --- | --- | --- |
| Gravatar | `GET https://api.gravatar.com/v3/profiles/{sha256 de l'email}` et `https://www.gravatar.com/avatar/{hash}?d=404` | Nom affiché, photo, bio, lieu, comptes liés | A1 A5 C1 F2 | `PSEUDO` `PROFIL` | Gratuit | Prototype |
| Libravatar | `GET https://seccdn.libravatar.org/avatar/{hash}?d=404` | Photo | A5 | aucun | Gratuit | Nouveau |
| GitHub | `GET https://api.github.com/search/commits?q=author-email:{email}` puis `GET https://api.github.com/users/{login}` | Compte qui a commité avec cet email : nom, ville, employeur, site, bio | A1 C1 E1 E3 F2 F3 | `PSEUDO` `PROFIL` `DOMAINE` | Gratuit (jeton sans droit conseillé) | Prototype |
| Clés PGP | `GET https://keys.openpgp.org/vks/v1/by-email/{email}` | Nom et autres emails de la clé | A1 B1 | `EMAIL` | Gratuit | Prototype |
| Keybase | `GET https://keybase.io/_/api/1.0/user/lookup.json?…` | Comptes prouvés (GitHub, domaine, réseaux) | F1 F2 F3 | `PSEUDO` `PROFIL` `DOMAINE` | Gratuit | Prototype |
| Domaine de l'email | Calcul local, puis RDAP (section 8) si ce n'est pas un webmail | Organisation (école, employeur) | E1 D1 | `ORGA` `DOMAINE` | Gratuit | Nouveau |
| Partie avant le @ | Calcul local | Pseudo candidat | aucun | `PSEUDO` (confiance « possible ») | Local | Prototype |

## 3. Comptes liés au pseudo

### 3.1 Vérification sur une liste de sites

| Source | Appel | Renvoie | Remplit | Rebonds | Accès | Statut |
| --- | --- | --- | --- | --- | --- | --- |
| WhatsMyName (`wmn-data.json`) | Copie figée dans le dépôt (CC BY-SA 4.0), puis une requête par site sur l'adresse du profil | Compte trouvé, absent ou inconnu (code HTTP et texte de la page, les deux exigés) | F1 F2 | `PROFIL` | Gratuit | À refaire : le prototype téléchargeait le fichier depuis GitHub, le projet est archivé |
| Maigret (`data.json`) | Fusion avec WhatsMyName : seulement les sites avec texte de présence et d'absence, sans `disabled` ni `protection` | Comme ci-dessus, environ 3000 sites | F1 F2 | `PROFIL` | Gratuit (MIT) | Nouveau |

### 3.2 API publiques des plateformes

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

## 4. Moteurs de recherche

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

## 5. Annuaires et registres suisses

| Source | Appel | Entrée | Renvoie | Remplit | Rebonds | Accès | Statut |
| --- | --- | --- | --- | --- | --- | --- | --- |
| search.ch | `GET https://search.ch/tel/api/?was=…&key=…&privat=1` | Téléphone, nom | Nom, adresse, ville, autres numéros | A1 B2 B3 C1 | `NOM` `TEL` | Clé gratuite, quota mensuel | Prototype |
| Zefix | `https://www.zefix.admin.ch/ZefixPublicREST/api/v1/…` | Nom de personne ou d'entreprise | Entreprises et fonctions inscrites | E2 | `ORGA` | Identifiants à demander | Nouveau |
| FOSC (Feuille officielle du commerce) | `GET https://amtsblattportal.ch/api/v1/publications?…` | Nom | Publications (inscriptions, mutations) | E2 | `ORGA` | Gratuit | Prototype |

## 6. Formation, travaux et publications

| Source | Appel | Renvoie | Remplit | Accès | Statut |
| --- | --- | --- | --- | --- | --- |
| ORCID | `GET https://pub.orcid.org/v3.0/expanded-search/?q=…` | Chercheur, institution, travaux | D1 E1 E3 | Gratuit | Prototype |
| OpenAlex | `GET https://api.openalex.org/authors?search=…` | Auteur, institution, publications | E1 E3 | Clé gratuite (obligatoire depuis février 2026) | Nouveau |
| Wikidata | `GET https://www.wikidata.org/w/api.php?action=wbsearchentities&…` | Personne notable : date de naissance, études, emploi | A2 D1 E1 | Gratuit | Prototype |

## 7. Domaines, archives et IP

| Source | Appel | Entrée | Renvoie | Remplit | Rebonds | Accès | Statut |
| --- | --- | --- | --- | --- | --- | --- | --- |
| RDAP | `GET https://rdap.org/domain/{domaine}` | Domaine | Titulaire (souvent masqué), dates | F3 E1 | `NOM` `EMAIL` | Gratuit | Prototype |
| crt.sh | `GET https://crt.sh/?q={domaine}&output=json` | Domaine | Sous-domaines, certificats | F3 | `DOMAINE` | Gratuit | Nouveau |
| Wayback Machine | `GET https://web.archive.org/cdx/search/cdx?url=…&output=json` | Profil, domaine | Pages archivées, y compris supprimées | I2 | `PROFIL` | Gratuit | Prototype |
| Common Crawl | `GET https://index.commoncrawl.org/{index}-index?url=…&output=json` | Profil, domaine | Pages absentes de la Wayback Machine | I2 | `PROFIL` | Gratuit | Nouveau |
| ip-api.com | `GET http://ip-api.com/json/{ip}` (HTTPS réservé à l'offre payante) | IP trouvée dans une fuite | Pays, ville approximative, fournisseur | H4 C1 | aucun | Gratuit pour un usage non commercial, 45 requêtes par minute ; conditions à relire | Retenu |

## 8. Téléphone (analyse locale)

| Source | Appel | Renvoie | Remplit | Accès | Statut |
| --- | --- | --- | --- | --- | --- |
| libphonenumber-js | Bibliothèque locale, aucun appel réseau | Pays, type de ligne, opérateur d'origine (pas l'actuel), formats du numéro pour les recherches | B2 | Gratuit | Prototype |

## 9. Entourage

| Source | Appel | Renvoie | Remplit | Statut |
| --- | --- | --- | --- | --- |
| Profils trouvés (GitHub, Bluesky, Mastodon, Chess.com…) | Listes publiques d'abonnés, d'abonnements et d'amis, par l'API de chaque plateforme | Proches identifiables | J1 | Nouveau |
| Fiches de fuites | Champs qui désignent un tiers (contact d'urgence, parent) | Proches | J1 | Nouveau |
| Moteur de recherche | Pages qui citent la personne avec d'autres noms (équipe, liste de membres) | Proches | J1 | Nouveau |

Les identifiants des proches ne sont jamais renvoyés dans la boucle d'enquête.

## 10. Choix faits

Choix d'Enzo du 2026-11-16 (D20 à D23).

| Choix | Décision | Raison |
| --- | --- | --- |
| Fiches de fuites | Leak-Lookup (API privée), Snusbase et LeakCheck Pro (D23) | Leak-Lookup a la plus grande couverture mesurée ; Snusbase a environ 900 bases en plus ; LeakCheck est gardé par choix d'Enzo. |
| Présence dans les fuites récentes | Have I Been Pwned Core 1 (D23) | Plus de la moitié des fuites de 2023 à 2026 ne sont dans aucun service à fiches. |
| Infostealers | Hudson Rock (gratuit) et LeakRadar Starter (D22) | Résumé de l'infection, puis identifiants volés avec le site concerné. |
| Présentation des fuites | Catalogue HIBP | Description et logo de chaque fuite trouvée. |
| Moteur de recherche | Tavily et Brave | Deux index différents : Brave trouve des pages que Tavily rate. |
| Géolocalisation d'IP | ip-api.com | Donne la ville approximative, gratuit pour un projet scolaire. |
| Intelligence X, Google Custom Search | Écartés | Hors budget ; API fermée le 2027-01-01. Autres sources écartées : section 1.4. |

Les services payants ne sont souscrits qu'après l'acceptation du budget par
l'enseignant (`BUDGET.md`).
