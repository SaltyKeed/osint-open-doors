# CI/CD et sécurité (DevSecOps)

Ce document décrit les contrôles automatiques du dépôt, les outils utilisés et
les règles à respecter quand on modifie un workflow. Il décrit l'état actuel.
Les choix sont expliqués dans
[DECISIONS.md, D13](DECISIONS.md#d13-ci-de-vérification),
[D14](DECISIONS.md#d14-protection-de-main-et-relecture) et
[D17](DECISIONS.md#d17-outils-devsecops).

## 1. Vue d'ensemble

```text
branche de travail
      |
      | git push, pull request vers main
      v
GitHub Actions          ci.yml    -> gitleaks-scan          (obligatoire)
                        app.yml   -> app-checks             (obligatoire)
                        docs.yml  -> markdownlint, link check (si docs/ change)
      |
      v
ruleset main-branch     checks obligatoires verts, 1 approbation,
                        branche à jour, conversations résolues
      |
      v
fusion dans main        les mêmes workflows tournent encore sur main

Dependabot (chaque lundi) -> ouvre des pull requests de mise à jour,
                             qui passent par le même chemin
```

Il n'y a pas encore de déploiement (CD) : l'application est lancée sur le PC de
l'école. La publication d'une image Docker est une question ouverte
([D11](DECISIONS.md#d11-cicd-et-stockage-de-limage)).

## 2. Workflows

| Fichier | Job | Contrôle | Déclenchement | Obligatoire |
| --- | --- | --- | --- | --- |
| `.github/workflows/ci.yml` | `gitleaks-scan` | Secrets dans tout l'historique Git | Chaque pull request, chaque push sur `main` | Oui |
| `.github/workflows/app.yml` | `app-checks` | `npm ci`, lint, typage, tests Vitest, build Next.js | Idem | Oui |
| `.github/workflows/docs.yml` | `markdownlint` | Structure des fichiers Markdown de `docs/` | Pull request ou push sur `main` qui modifie `docs/` | Non |
| `.github/workflows/docs.yml` | `link check` | Liens et ancres des fichiers de `docs/` (lychee) | Idem | Non |

Le nom affiché du check est la clé `name` du job. Sans `name`, c'est
l'identifiant du job. Le ruleset attend ce nom exact : renommer un job
obligatoire sans changer le ruleset bloque toutes les pull requests.

## 3. Outils

### Familles de contrôles

Chaque famille cherche un type de risque différent. Aucun outil ne les couvre
toutes.

| Famille | Ce qui est analysé | Question posée | Chez nous |
| --- | --- | --- | --- |
| Secrets | L'historique Git | Une clé ou un mot de passe a-t-il été commité ? | gitleaks, secret scanning de GitHub |
| SCA (Software Composition Analysis) | Les dépendances (paquets npm, actions) | Un paquet utilisé a-t-il une faille connue ? | Dependabot ; `dependency-review-action` prévu |
| SAST (Static Application Security Testing) | Notre code source, sans le lancer | Notre code contient-il une injection, une SSRF ? | CodeQL prévu |
| DAST (Dynamic Application Security Testing) | L'application qui tourne | Que voit un attaquant qui envoie des requêtes ? | OWASP ZAP, plus tard |
| Conteneur | L'image Docker et le `Dockerfile` | L'image contient-elle des paquets vulnérables ou une mauvaise configuration ? | Trivy, hadolint, plus tard |

### Outils en place

| Outil | Famille | Rôle | Où il est configuré |
| --- | --- | --- | --- |
| gitleaks | Secrets | Cherche des clés API et mots de passe dans chaque commit de l'historique. | `ci.yml` |
| Secret scanning de GitHub | Secrets | Bloque un push qui contient une clé d'un format connu (push protection). | Settings, Advanced Security |
| ESLint, TypeScript, Vitest, build | Qualité | Détectent le code invalide, les erreurs de type et les régressions. Le build détecte un module `server-only` importé par le navigateur. | `app.yml`, `package.json` |
| Dependabot alerts | SCA | Signale une dépendance npm ou une action qui a une faille connue (CVE). | Settings, Advanced Security |
| Dependabot security updates | SCA | Ouvre une pull request qui corrige la faille signalée. | Settings, Advanced Security |
| Dependabot version updates | SCA | Ouvre chaque semaine des pull requests pour les nouvelles versions. | `.github/dependabot.yml` |
| markdownlint, lychee | Documentation | Structure et liens de `docs/`. | `docs.yml`, `docs/.markdownlint.jsonc` |

### Réglages de Dependabot

`.github/dependabot.yml` surveille deux écosystèmes : `npm` (`package.json`) et
`github-actions` (les workflows de `.github/workflows/`).

| Réglage | Valeur | Raison |
| --- | --- | --- |
| Fréquence | Chaque lundi à 08:00, heure de Zurich | Une seule vague de pull requests par semaine, à traiter en début de semaine. |
| `cooldown` | 7 jours | Une version de paquet piratée est en général retirée en quelques jours. Attendre évite de l'installer. Les mises à jour de sécurité ne sont pas retardées. |
| Groupes npm | Mises à jour minor et patch regroupées | Une pull request par semaine pour les petites mises à jour. Chaque version majeure a sa propre pull request, car elle peut casser le code. |
| Groupe actions | Toutes les actions ensemble | Une seule pull request pour les workflows. |
| Messages de commit | `chore(deps):`, `chore(deps-dev):`, `ci:` | Conventional Commits, comme les autres commits. |
| Version majeure ignorée | `@types/node` | Les types doivent suivre la version de Node.js du projet (D16), pas la dernière. |
| Version majeure ignorée | `eslint` | `eslint-config-next` 16 utilise des plugins (react, jsx-a11y, import) qui n'acceptent que ESLint 9. |
| Version majeure ignorée | `typescript` | `typescript-eslint` TypeScript 7 casse le lint, pour la petite ampleur de ce projet deux migrations de TS 6 puis  7 ne sont pas nécessaires, TS 7 augmente la vitesse de compilation, ce qui ne sera pas un problème dans ce projet |

Pour une action, Dependabot remplace le SHA épinglé et met à jour le
commentaire de version (`# v7.0.1`).

## 4. Règles des workflows

Ces règles s'appliquent à tout nouveau workflow ou à toute modification.

- **Actions épinglées par SHA.** `uses: actions/checkout@<SHA> # v7.0.1`. Un
  tag comme `v7` peut être déplacé vers un autre code ; un SHA ne change pas.
  Le réglage du dépôt refuse les actions non épinglées.
- **Permissions minimales.** Chaque workflow déclare `permissions`, en
  lecture seule par défaut. Seul `ci.yml` peut écrire des commentaires de pull
  request, pour gitleaks.
- **`persist-credentials: false`** sur `actions/checkout` quand le job ne
  pousse rien : le jeton GitHub ne reste pas sur la machine, et un script lancé
  par `npm ci` ne peut pas le lire.
- **Pas de filtre `paths` sur un check obligatoire.** Un check qui ne se lance
  pas reste en attente et bloque la fusion. `docs.yml` a un filtre et n'est
  donc pas obligatoire.
- **`npm ci` et non `npm install`.** La CI installe exactement les versions de
  `package-lock.json`.
- **Même version de Node.js partout** : 24 dans `setup-node`, sur les postes
  et dans l'image Docker (D16).
- **Un check doit avoir échoué une fois.** Avant de rendre un check
  obligatoire, on vérifie qu'il passe au rouge sur une erreur volontaire.
- **Aucun secret dans un workflow.** Une clé API future sera un secret GitHub
  (Settings, Secrets and variables), jamais écrite dans un fichier.

## 5. Réglages GitHub

### Ruleset de la branche `main`

Le ruleset `main-branch` (Settings, Rules) s'applique à la branche par défaut.

| Règle | Réglage |
| --- | --- |
| Suppression de la branche | Interdite |
| Force push | Interdit |
| Pull request obligatoire | 1 approbation ; approbation annulée par un nouveau commit ; conversations résolues avant la fusion |
| Méthodes de fusion | Merge et squash |
| Checks obligatoires | `gitleaks-scan`, `app-checks`, branche à jour avec `main` |
| Contournement | Rôle Repository admin (responsable du dépôt), toujours autorisé |

### Autres réglages du dépôt

| Menu | Réglage |
| --- | --- |
| General, Pull Requests | Suppression automatique de la branche après la fusion |
| Advanced Security | Secret scanning et push protection ; Dependabot alerts et security updates |
| Actions, General | Jeton des workflows en lecture seule ; les workflows ne peuvent pas approuver de pull request ; actions épinglées par SHA obligatoires ; approbation requise pour les workflows des contributeurs externes |

## 6. Traiter une alerte

Tiago, responsable du dépôt, traite les alertes et relit les pull requests de
Dependabot.

- **Pull request de Dependabot.** Elle passe par les mêmes checks qu'une
  autre pull request. Si `app-checks` est vert, lire le changelog pour une
  version majeure, puis approuver et fusionner. Si un check est rouge, la
  mise à jour casse quelque chose : corriger dans la même branche ou fermer la
  pull request avec un commentaire.
- **Alerte Dependabot sans correctif.** Vérifier si le code vulnérable est
  utilisé par le projet. Sinon, fermer l'alerte avec la raison. Exemple : la
  faille de `minimatch` corrigée par un `overrides` dans `package.json`.
- **Secret trouvé par gitleaks.** Considérer le secret comme connu de tous :
  le révoquer chez le fournisseur, puis le retirer du code. Le supprimer du
  dernier commit ne suffit pas, il reste dans l'historique. Un faux positif
  s'exclut dans un fichier `.gitleaksignore` avec l'empreinte donnée par
  gitleaks.

## 7. Prévu

| Outil | Famille | Rôle | Statut |
| --- | --- | --- | --- |
| `dependency-review-action` | SCA | Bloque une pull request qui ajoute une dépendance avec une faille connue. | Retenu (D17), pas encore en place |
| CodeQL | SAST | Analyse notre code TypeScript : injection, SSRF, donnée non validée. | Retenu (D17), pas encore en place |
| Trivy, hadolint | Conteneur | Failles de l'image Docker, erreurs du `Dockerfile`. | Avec Docker ([IDEES.md, I2](IDEES.md#i2-améliorations-de-la-ci)) |
| OWASP ZAP | DAST | Teste l'application qui tourne : en-têtes HTTP, réponses. | Avec l'interface (I2) |

## 8. Références

### GitHub

- [Référence des options Dependabot](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference) :
  `groups`, `ignore`, `cooldown`, `commit-message`.
- [Configurer les mises à jour de version Dependabot](https://docs.github.com/fr/code-security/how-tos/secure-your-supply-chain/secure-your-dependencies/configure-version-updates).
- [Syntaxe des workflows GitHub Actions](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax).
- [Utilisation sécurisée de GitHub Actions](https://docs.github.com/en/actions/reference/security/secure-use) :
  épinglage par SHA, permissions, secrets.
- [Rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets).
- [Secret scanning](https://docs.github.com/en/code-security/secret-scanning/introduction/about-secret-scanning).
- [CodeQL](https://docs.github.com/en/code-security/code-scanning/introduction-to-code-scanning/about-code-scanning-with-codeql).

### Outils et actions

- [gitleaks](https://github.com/gitleaks/gitleaks)
- [actions/checkout](https://github.com/actions/checkout) : option
  `persist-credentials`.
- [actions/setup-node](https://github.com/actions/setup-node) : option `cache`.
- [actions/dependency-review-action](https://github.com/actions/dependency-review-action)
- [npm ci](https://docs.npmjs.com/cli/commands/npm-ci)
- [markdownlint](https://github.com/DavidAnson/markdownlint) et
  [lychee](https://github.com/lycheeverse/lychee)
- [Trivy](https://trivy.dev/), [hadolint](https://github.com/hadolint/hadolint)
  et [OWASP ZAP](https://www.zaproxy.org/)

### Pratiques

- [OWASP DevSecOps Guideline](https://owasp.org/www-project-devsecops-guideline/) :
  familles de contrôles dans un pipeline.
- [Conventional Commits](https://www.conventionalcommits.org/fr/v1.0.0/) :
  format des messages de commit.
