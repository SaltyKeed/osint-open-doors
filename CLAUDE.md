# OSINT Open Doors

Outil de sensibilisation pour les portes ouvertes du CPNE. Un visiteur teste ses
propres informations (email, téléphone, nom et prénom) sur un PC de l'école et
voit les métadonnées des fuites où il apparaît, avec un plan d'action.

Projet scolaire mené par deux élèves qui veulent apprendre : en codant, explique
le pourquoi de chaque choix (pattern, bibliothèque, structure) en quelques
phrases.

## Architecture

Lire `docs/ARCHITECTURE.md` avant de créer un fichier, d'ajouter une dépendance
ou de toucher à un provider. Il décrit l'architecture en place : structure
ports & adapters, stack, exécution. Il est mis à jour quand le code change.

`docs/DECISIONS.md` garde les options comparées et la raison de chaque choix.
Une nouvelle décision (dépendance, changement de structure, nouveau provider)
y est ajoutée à la fin, numérotée et datée.

Toute modification (code, configuration, Docker, agents, variables
d'environnement, organisation) met à jour la documentation concernée dans la
même pull request : `README.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`,
`CLAUDE.md`, `.env.example`. La documentation décrit toujours l'état actuel du
projet.

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

## Outils Claude

Sous-agents dans `.claude/agents/`, plugins déclarés dans
`.claude/settings.json`.

| Tâche | Outil |
|---|---|
| Rédiger ou relire un document | Sous-agent `technical-writer` |
| Préparer une étape de travail | Skill `superpowers:writing-plans` |
| Provider, mapper, logique du domaine | Skill `superpowers:test-driven-development` |
| Interface (parcours, mise en page) | Sous-agent `ux-architect`, puis skill `frontend-design` |
| Identité visuelle (couleurs, cartes, jauge) | Sous-agent `ui-designer` |
| Coder une partie de l'interface | Par défaut, Claude guide les élèves ; sur leur demande, il délègue au sous-agent `frontend-developer` |
| Docker, CI | Sous-agent `devops-automator` |
| Nouvelle décision ou terme du domaine | Skill `mattpocock-skills:domain-modeling` |
| Bug qui résiste | Skill `superpowers:systematic-debugging` |
| Relecture avant pull request | Skills `code-review` et `security-review` |
| Fin de tâche | Skill `superpowers:verification-before-completion` (tests et build passent) |

## Organisation

- `main` est la branche de référence. Chaque fonctionnalité ou correction a sa
  propre branche créée depuis `main` (`feat/…`, `fix/…`, `docs/…`, `chore/…`),
  intégrée par une pull request relue par l'autre membre du binôme.
- La branche `research` sert uniquement au démarrage du projet ; elle n'est plus
  utilisée une fois fusionnée dans `main`.
- Claude peut créer la branche, faire les commits, pousser et ouvrir la pull
  request avec `gh`, en demandant la relecture à l'autre membre du binôme.
  Messages de commit en anglais, style Conventional Commits. Ni les commits ni
  les pull requests ne mentionnent Claude ou l'IA : l'attribution automatique
  est désactivée dans `.claude/settings.json` (clé `attribution`).
- Avant de commencer un travail, vérifier que `main` et la branche en cours sont
  à jour avec GitHub (`git fetch`, puis `git pull` si nécessaire).
- Tâches suivies dans les GitHub Issues, avec un responsable assigné.
- Préférences personnelles dans `CLAUDE.local.md` (non versionné).
