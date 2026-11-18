# Catalogue des sources

Date : 2026-11-16, adapté le 2026-11-17

Catalogue établi par Enzo sur la branche `sandbox` (décisions D20 à D24 de
cette branche), repris en T1 (`DECISIONS.md`). Les références D20 à D24 citées
plus bas renvoient à ces décisions de `sandbox`.

Ce document dit sur quoi l'outil tape pour remplir la fiche de vie
(`CADRAGE.md`, section 5). Pour chaque source : l'adresse appelée, ce qu'on lui
envoie, ce qu'elle renvoie, les champs de la fiche qu'elle remplit, les
nouveaux identifiants qu'elle produit (rebonds) et son accès.

Une source qui n'est pas dans ce catalogue n'est pas appelée par l'outil. Une
nouvelle source y entre selon la règle de `CADRAGE.md`, section 6.3.

Statuts :

- En place : un adaptateur existe dans `main`.
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
(D22), puis mesurées sur leur couverture réelle (D23, D24). Le cadre est celui
de D12 : on interroge des services qui indexent les fuites, y compris celles
qui circulent sur le dark web et sur Telegram ; on ne télécharge jamais de
fuite et on ne va pas sur les forums criminels.

### 1.1 Sources retenues

| Service | Appel | Entrées | Renvoie | Remplit | Accès et prix | Statut |
| --- | --- | --- | --- | --- | --- | --- |
| LeakCheck Pro | `GET https://leakcheck.io/api/v2/query/{valeur}?type=…`, en-tête `X-API-Key` | `email`, `username`, `phone`, `keyword`, `domain`, `hash` | Par fiche : `source` (nom, date), `email`, `username`, `first_name`, `last_name`, `dob`, `address`, `zip`, `phone`, `password`, liste `fields` | A1 A2 B1 B2 B3 H1 H2 H3 | Monthly : 9.99 USD par mois, 200 recherches par jour | Retenu |
| Leak-Lookup (API privée) | `POST https://leak-lookup.com/api/search`, paramètres `key`, `type`, `query` | `email_address`, `username`, `ipaddress`, `phone`, `domain`, `password`, `fullname` | Par fuite, les fiches en paires colonne et valeur : email, téléphone, IP, nom, pays, mot de passe, hash ; adresse sur demande | A1 B1 B2 B3 H1 H2 H3 H4 | Sur devis, accordé au cas par cas ; 5 requêtes par minute | Retenu, devis à demander |
| Snusbase | `POST https://api.snusbase.com/data/search`, en-tête `Auth` ; aussi `tools/combo-lookup` et `tools/hash-lookup` | `email`, `username`, `lastip`, `password`, `hash`, `name`, `_domain`, avec jokers `%` et `?` | Fiches groupées par base, avec les champs de la table (nom, adresse, téléphone, date de naissance, IP, mot de passe en clair ou hash) | A1 A2 A3 B1 B2 B3 H1 H2 H3 H4 | API incluse pour les membres payants, 2048 recherches par 12 heures ; prix non publié (dès 6.49 USD par semaine selon une source tierce) | Retenu |
| HackCheck Diamond | API REST (adresse à relever dans la documentation après souscription) | Email, pseudo, nom complet, hash, IP, téléphone, mot de passe, domaine | Fiches de fuites | A1 B1 B2 B3 H1 H2 H3 H4 | 39.49 USD par mois, 10 requêtes par seconde ; 15 % de réduction avec une adresse scolaire | Retenu (choix d'Enzo, D24) |
| Have I Been Pwned Core 1 | `GET https://haveibeenpwned.com/api/v3/breachedaccount/{email}?truncateResponse=false`, en-tête `hibp-api-key` | Email | Fuites où l'email apparaît, avec titre, date, description, types de données, logo ; y compris les compilations d'infostealers et les données saisies par la police | H1 | 4.39 USD par mois, 10 requêtes par minute | Retenu |
| LeakRadar Enterprise | API REST | Email, pseudo, domaine | Journaux d'infostealers (identifiant, mot de passe, adresse du site), combolists (dont celles diffusées sur Telegram) et dark web | H3 H5 F2 | 58.33 EUR par mois (699.99 par an), 100 000 révélations par jour | Retenu (D24) |
| XposedOrNot | `GET https://api.xposedornot.com/v1/breach-analytics?email=…` | Email | Fuites où l'email apparaît, avec date, types de données et gravité | H1 | Gratuit, 100 requêtes par jour par IP (D15) | En place |
| Hudson Rock | `GET https://cavalier.hudsonrock.com/api/json/v2/osint-tools/search-by-email?email=…` et `search-by-username?username=…` | Email, pseudo | Ordinateur infecté : date, système, nombre d'identifiants volés. Le nom de l'ordinateur, l'adresse IP, les chemins, les identifiants et mots de passe (même masqués) ne sont pas gardés | H5 | Gratuit, sans clé (outils OSINT gratuits) | En place |
| Catalogue HIBP | `GET https://haveibeenpwned.com/api/v3/breaches` | aucune | Titre, date, description, types de données et logo de 1052 fuites | H1 (présentation d'une fuite trouvée par un autre service) | Gratuit | Prototype |
| ransomware.live | `GET https://api.ransomware.live/v2/searchvictims/{organisation}` | Domaine de l'email ou employeur | Organisation revendiquée par un rançongiciel | H1 (fuite de l'employeur) | Gratuit | Prototype |

Les services à fiches renvoient des mots de passe en clair. L'adaptateur les
garde seulement pour le champ H3, affiché derrière le bouton « œil » (T1).

### 1.2 Couverture mesurée

Mesure du 2026-11-16. Les catalogues publics de Snusbase
(`GET https://api.snusbase.com/data/stats`, 2251 bases), de Leak-Lookup (page
des fuites, 4776 bases) et de LeakCheck (`https://leakcheck.io/breaches`, 1471
sources) ont été comparés, par nom de site, au catalogue de Have I Been Pwned
(1052 fuites). Le rapprochement par nom est approximatif. DeHashed, OathNet et
HackCheck ne publient pas leur liste.

| Années des fuites | Fuites connues de HIBP | Snusbase | Leak-Lookup | LeakCheck | Dans l'un des trois |
| --- | --- | --- | --- | --- | --- |
| Avant 2019 | 442 | 268 | 337 | 248 | 354 |
| 2019 à 2022 | 320 | 161 | 234 | 199 | 253 |
| 2023 | 48 | 18 | 22 | 21 | 29 |
| 2024 | 87 | 24 | 42 | 36 | 49 |
| 2025 | 63 | 14 | 27 | 16 | 32 |
| 2026 | 92 | 25 | 25 | 52 | 62 |

Ce que la mesure montre :

- LeakCheck est le plus à jour (52 des 92 fuites de 2026) et contient Pandabuy,
  Ticketek, Carhartt, Paidwork, National Public Data et Boulanger.
- Leak-Lookup couvre le plus de fuites anciennes ; environ 900 bases de
  Snusbase n'apparaissent pas chez Leak-Lookup. Les trois se complètent.
- Les fuites de 2023 à 2026 encore manquantes sont de trois types :
  compilations d'infostealers et combolists diffusées sur Telegram (Synthient,
  Alien, DataTroll), couvertes par LeakRadar Enterprise ; données saisies par la
  police ou des chercheurs (Operation Endgame, Genesis Market), que seul HIBP a
  reçues ; fuites d'entreprises (Hot Topic, Suno, Canadian Tire, Dell,
  Ticketmaster, Doctolib), peut-être chez HackCheck, sans moyen de le vérifier.
- HIBP Core signale la présence de l'email dans toutes les fuites de son
  catalogue, y compris celles qu'aucun service à fiches n'a.
- Les sites suisses sont presque absents partout : 2 bases chez Snusbase, 5
  chez Leak-Lookup.

### 1.3 Comparaison et doublons

Un service dont tout l'apport est déjà couvert par un service retenu est un
doublon. La comparaison porte sur les entrées acceptées, le contenu renvoyé,
l'apport unique, le prix et, quand c'est possible, la couverture mesurée.

| Service | Recherche par | Renvoie | Apport unique | Prix | Verdict |
| --- | --- | --- | --- | --- | --- |
| LeakCheck Pro | Email, pseudo, téléphone, mot-clé, domaine | Fiche structurée | Le plus à jour sur 2026 | 9.99 USD par mois | Retenu |
| Leak-Lookup | Email, pseudo, IP, téléphone, domaine, mot de passe, nom complet | Fiche complète | Plus grande couverture des fuites anciennes | Sur devis | Retenu |
| Snusbase | Email, pseudo, nom, IP, mot de passe, hash, domaine, jokers | Fiche complète | Environ 900 bases absentes de Leak-Lookup, jokers | Non publié | Retenu |
| HackCheck | Email, pseudo, nom, IP, téléphone, hash, domaine | Fiche | Liste non publiée : peut contenir des fuites récentes manquantes | 39.49 USD par mois | Retenu (choix d'Enzo, D24) |
| Have I Been Pwned Core 1 | Email | Liste des fuites | Fuites récentes et données de la police absentes des services à fiches | 4.39 USD par mois | Retenu |
| LeakRadar Enterprise | Email, pseudo, domaine | Infostealers, combolists, dark web | Seule source mesurable pour les combolists Telegram de 2024 à 2026 | 58.33 EUR par mois | Retenu (D24) |
| LeakRadar Starter | Comme Enterprise | Infostealers seulement | Couvert par l'offre Enterprise | 25 EUR par mois | Remplacé par Enterprise |
| Hudson Rock | Email, pseudo | Résumé de l'infection | Date de l'infection, gratuit | Gratuit | Retenu |
| DeHashed | Email, pseudo, nom, téléphone, adresse, IP, VIN | Fiche, évite les mots de passe en clair | Liste non publiée ; recherche par adresse et VIN, inutile ici | Environ 180 USD par mois | Écarté (prix, non mesurable) |
| OathNet | Email, pseudo, IP, identifiants de jeux | Fiches et infostealers | Liste et prix non publiés | Non publié | Écarté (non mesurable) |
| BreachDirectory | Email, pseudo, téléphone, IP | Mots de passe masqués | Moins de contenu que les services retenus | 20 à 50 EUR par mois | Doublon |
| ProxyNova COMB | Email, pseudo | Paires email et mot de passe | Compilation COMB, déjà incluse dans Snusbase | Gratuit | Doublon |
| Revealer Pro | Email, pseudo | Fuites, infostealers (50 par jour), comptes | Son « énumération de comptes » est une technique exclue (`CADRAGE.md`, section 6.4) | 79.99 USD par mois | Doublon |
| Leak-Lookup public | Comme l'API privée | Noms des fuites seulement | 10 recherches par jour, insuffisant pour 200 visiteurs | Gratuit | Doublon de l'API privée |
| XposedOrNot | Email | Liste des fuites | Couvert par HIBP Core, qui est payant | Gratuit | Gardé (T1) : gratuit et déjà en place, utile tant que le budget n'est pas accepté |
| LeakCheck public, IPQS | Email | Liste des fuites | Couvert par HIBP Core et les services à fiches | Gratuit | Doublon |
| Catalogue XposedOrNot | aucune | Description de 801 fuites | Moins complet que le catalogue HIBP (1052) | Gratuit | Doublon |

### 1.4 Écartés pour une autre raison

| Service ou méthode | Raison |
| --- | --- |
| Intelligence X | L'offre qui donne les fiches (Identity Portal) coûte 10 000 EUR par an ; l'offre gratuite renvoie des fichiers bruts. |
| HEROIC, Breachsense, DarkOwl, SpyCloud, Constella, Flare, Recorded Future, Webz.io | Surveillance du dark web sur devis, réservée aux organisations. |
| LeakedSource | Vitrine de HEROIC (42 000 fuites annoncées, surtout des dépôts Telegram) ; pas d'API, mots de passe masqués. |
| Have I Been Pwned Pro (infostealers) | 379 USD par mois. |
| IntelBase | Prix et API non publiés. |
| Sites de rançongiciels (ransomware.live, RansomLook) pour une personne | Ils s'interrogent par organisation, pas par email ; ransomware.live est gardé pour l'employeur. |
| Bots Telegram (LeakOSINT et semblables) | Exploitants inconnus, souvent liés à la cybercriminalité ou situés dans des pays sous sanctions ; les données du volontaire leur seraient envoyées et le paiement financerait ces acteurs. |
| Forums et marchés du dark web, téléchargement de fuites | Accès à des sites criminels, recel de données volées, stockage de données de millions de personnes : contraire à D12 et à l'invariant « zéro stockage ». |
| WeLeakInfo, GhostProject, LeakPeek, Scylla, PwnDB | Fermés ou saisis par la justice. |
| Google Dark Web Report, Mozilla Monitor Plus | Arrêtés (janvier 2026 et décembre 2025). |

## 2. Comptes liés à l'email

| Source | Appel | Renvoie | Remplit | Rebonds | Accès | Statut |
| --- | --- | --- | --- | --- | --- | --- |
| Gravatar | `GET https://api.gravatar.com/v3/profiles/{sha256 de l'email}` : Gravatar reçoit l'empreinte, jamais l'email | Nom affiché, photo, lieu, poste et employeur, nom d'utilisateur, comptes vérifiés publics. La bio (texte libre) et les comptes masqués par la personne ne sont pas gardés | A1 A5 C1 E1 F1 F2 | `PSEUDO` `PROFIL` | Gratuit, sans clé | En place |
| Libravatar | `GET https://seccdn.libravatar.org/avatar/{hash}?d=404` | Photo | A5 | aucun | Gratuit | Nouveau |
| GitHub | `GET https://api.github.com/search/commits?q=author-email:{email}` puis `GET https://api.github.com/users/{login}` (3 comptes au plus) | Compte qui a commité avec cet email : nom, photo, email public, ville, employeur, dépôts, pseudo X, site. La bio et les messages de commit ne sont pas gardés ; les comptes fictifs de GitHub (`invalid-email-address`, `ghost`) comptent comme « aucun compte » | A1 A5 B1 C1 E1 E3 F1 F2 F3 | `PSEUDO` `EMAIL` `DOMAINE` | Gratuit ; jeton optionnel (`GITHUB_TOKEN`) : sans jeton, 60 appels par heure et 10 recherches par minute par adresse IP | En place |
| Clés PGP | `GET https://keys.openpgp.org/vks/v1/by-email/{email}` | Nom et autres emails de la clé | A1 B1 | `EMAIL` | Gratuit | Prototype |
| Keybase | `GET https://keybase.io/_/api/1.0/user/lookup.json?…` | Comptes prouvés (GitHub, domaine, réseaux) | F1 F2 F3 | `PSEUDO` `PROFIL` `DOMAINE` | Gratuit | Prototype |
| Domaine de l'email | Calcul local, puis RDAP (section 8) si ce n'est pas un webmail | Organisation (école, employeur) | E1 D1 | `ORGA` `DOMAINE` | Gratuit | Nouveau |

## 3. Comptes liés au pseudo

### 3.1 Vérification sur une liste de sites

| Source | Appel | Renvoie | Remplit | Rebonds | Accès | Statut |
| --- | --- | --- | --- | --- | --- | --- |
| WhatsMyName (`wmn-data.json`) | Copie figée dans le dépôt (projet archivé le 2026-11-09 ; CC BY-SA 4.0, Micah Hoffman et contributeurs), puis une requête par site sur l'adresse du profil. 569 sites sur 691 : sans sites pour adultes, sans protection anti-robot, sans `POST` (T7) | Compte trouvé, absent ou inconnu (code HTTP et texte de la page, les deux exigés). Seule l'adresse du compte est gardée | F2 | aucun (T7) | Gratuit | En place |
| Maigret (`data.json`) | Fusion avec WhatsMyName : seulement les sites avec texte de présence et d'absence, sans `disabled` ni `protection` | Comme ci-dessus, environ 3000 sites | F1 F2 | `PROFIL` | Gratuit (MIT) | Nouveau |

### 3.2 API publiques des plateformes

Quand une plateforme a une API publique, on l'appelle au lieu de lire la page :
la réponse est plus sûre et donne plus de champs.

| Plateforme | Appel | Renvoie | Remplit | Accès | Statut |
| --- | --- | --- | --- | --- | --- |
| GitHub | `GET https://api.github.com/users/{pseudo}` | Nom, ville, employeur, site (pas la bio) | A1 A5 B1 C1 E1 F1 F2 F3 | Gratuit | En place |
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
| Tavily | `POST https://api.tavily.com/search`, profondeur `basic` (1 crédit), `exact_match`, sans réponse générée ni texte des pages. Email et téléphone seulement, 3 recherches par enquête (T5) | 1000 crédits gratuits par mois sans carte bancaire (`TAVILY_API_KEY`), gratuit pour les étudiants (à demander), puis 0.008 USD par crédit | En place |
| Brave Search API | `GET https://api.search.brave.com/res/v1/web/search?q=…`, en-tête `X-Subscription-Token` | 5 USD par 1000 requêtes, 5 USD offerts par mois, carte bancaire exigée | Non utilisé (T5) |
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

Les listes de domaines du prototype (`sandbox-v1`,
`src/server/providers/tavily/searches.ts`) sont reprises.

En place : les requêtes par email et par téléphone (T5). Les requêtes « nom et
localité » et « nom et organisation », avec les filtres de domaines, sont
décidées et pas encore codées (T6, #80). Le nom seul et le pseudo ne sont pas
cherchés : leurs pages ne pourraient pas être affichées.

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

Pour un proche, l'adaptateur garde seulement le nom, le prénom, l'âge et
l'adresse si la source les donne (T1). Les identifiants des proches ne sont
jamais renvoyés dans la boucle d'enquête.

## 10. Choix faits

Choix d'Enzo du 2026-11-16 (D20 à D24 de `sandbox`), repris en T1 avec
XposedOrNot en plus.

| Choix | Décision | Raison |
| --- | --- | --- |
| Fiches de fuites | LeakCheck Pro, Leak-Lookup (API privée), Snusbase, HackCheck Diamond (D23, D24) | Couverture mesurée complémentaire (section 1.2) ; HackCheck pris sans mesure possible, par choix d'Enzo. |
| Présence dans les fuites récentes | Have I Been Pwned Core 1 (D23) | Plus de la moitié des fuites de 2023 à 2026 ne sont dans aucun service à fiches. |
| Infostealers et combolists | Hudson Rock (gratuit) et LeakRadar Enterprise (D24) | Seule source mesurable pour les combolists Telegram de 2024 à 2026. |
| Présentation des fuites | Catalogue HIBP | Description et logo de chaque fuite trouvée. |
| Liste des fuites par email, gratuite | XposedOrNot (T1) | Gratuit et déjà en place ; seule source de fuites par email tant que le budget n'est pas accepté. |
| Moteur de recherche | Tavily et Brave | Deux index différents : Brave trouve des pages que Tavily rate. |
| Géolocalisation d'IP | ip-api.com | Donne la ville approximative, gratuit pour un projet scolaire. |
| Intelligence X, Google Custom Search | Écartés | Hors budget ; API fermée le 2027-01-01. Autres sources écartées : section 1.4. |

Les services payants ne sont souscrits qu'après l'acceptation du budget par
l'enseignant (`BUDGET.md`).
