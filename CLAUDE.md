# OSINT Open Doors

Outil de sensibilisation pour les portes ouvertes du CPNE. Un visiteur teste ses
propres informations (email, téléphone, nom et prénom) sur un PC de l'école et
voit les métadonnées des fuites où il apparaît, avec un plan d'action.

Projet scolaire mené par deux élèves qui veulent apprendre : en codant, explique
le pourquoi de chaque choix (pattern, bibliothèque, structure) en quelques
phrases.

## Architecture

Lire `docs/ARCHITECTURE.md` avant de créer un fichier, d'ajouter une dépendance
ou de toucher à un provider. Il contient la structure ports & adapters, les
choix de stack et leurs justifications.

Décisions ponctuelles : `docs/decisions/NNN-titre.md` (une décision par fichier).

## Invariants de confidentialité

Ils s'appliquent à tout le code, sans exception. Détail et justification :
`docs/ARCHITECTURE.md`, section 2.

- Les mappers des providers construisent les objets du domaine à partir d'une
  liste blanche de champs. La réponse brute reste dans le dossier du provider.
- Une fiche trouvée par nom est détaillée seulement si elle contient aussi le
  téléphone ou l'email saisi par le visiteur. Sinon, seul un total est affiché.
- Les valeurs affichées sont masquées (`+41 79 ••• •• 42`).
- Les données personnelles vivent uniquement en mémoire, le temps de la
  requête. Pas de base de données, de fichier, de cookie ni de `localStorage`.
- Les logs et messages d'erreur contiennent des identifiants techniques
  (provider, code HTTP), jamais une saisie du visiteur ni un corps de réponse.
- La recherche passe par un `POST` ; l'URL reste sans donnée personnelle.
- Le code qui utilise une clé API est dans `src/server/` et importe
  `server-only`.
- Les fixtures de test sont inventées.

## Conventions

- Code (identifiants, commentaires) en anglais ; documentation et interface en
  français.
- TypeScript strict. Toute donnée externe (saisie, réponse d'API) passe par un
  schéma zod.
- Logique métier dans `src/server/domain/`, sans appel réseau, testée avec
  Vitest. Tests écrits avant le code pour les mappers et le domaine.

## Style des documents

Documentation sobre et factuelle, comme écrite par les élèves : phrases simples,
texte brut sans emoji, sections séparées uniquement par des titres. Dans les
tableaux comparatifs, l'option choisie est marquée « (retenu) ».

## Organisation

- Branche de travail : `research`.
- Tâches suivies dans les GitHub Issues, avec un responsable assigné.
- Préférences personnelles dans `CLAUDE.local.md` (non versionné).
