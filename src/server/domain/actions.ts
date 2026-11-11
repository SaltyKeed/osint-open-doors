import type { DataCategory, Finding } from "./types";

export type Action = {
  id: string;
  title: string; // shown to the visitor (French)
  detail: string;
};

// A rule returns the number of findings that trigger it (0 = not applicable).
type Rule = { id: string; count: (findings: Finding[]) => number; title: (count: number) => string; detail: string };

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? "s" : ""}`;

// Findings that are surely about the visitor (not name-only pages, not username leads).
function linked(findings: Finding[]): Finding[] {
  return findings.filter(
    (f) => f.kind === "breach" || f.kind === "directory" || f.kind === "account" || (f.kind === "web" && f.verified),
  );
}

function withCategory(findings: Finding[], ...categories: DataCategory[]): number {
  return findings.filter(
    (f) =>
      (f.kind === "breach" || f.kind === "directory" || f.kind === "account") &&
      f.categories.some((c) => categories.includes(c)),
  ).length;
}

// Ordered by priority: the first actions are the most urgent.
const RULES: Rule[] = [
  {
    id: "change-passwords",
    count: (f) => f.filter((x) => x.kind === "breach" && x.categories.includes("password")).length,
    title: (n) => `Changer les mots de passe concernés (${plural(n, "fuite")})`,
    detail:
      "Change le mot de passe des comptes touchés et de tous les comptes où tu utilisais le même. Utilise un gestionnaire de mots de passe.",
  },
  {
    id: "enable-2fa",
    count: (f) => f.filter((x) => x.kind === "breach").length,
    title: () => "Activer la double authentification",
    detail: "Active la validation en deux étapes (application ou clé) sur ta messagerie et tes comptes importants.",
  },
  {
    id: "phishing",
    count: (f) => f.filter((x) => x.kind === "breach" || x.kind === "directory" || (x.kind === "web" && x.verified)).length,
    title: () => "Se méfier des messages ciblés",
    detail:
      "Un attaquant peut utiliser ces données pour un faux message crédible (email, SMS, appel). Ne clique pas sur un lien inattendu et ne donne jamais de code reçu.",
  },
  {
    id: "directory",
    count: (f) => f.filter((x) => x.kind === "directory").length,
    title: () => "Limiter ton inscription dans l'annuaire",
    detail:
      "Demande à ton opérateur de masquer ton adresse, ou de ne plus publier ton numéro. Ajoute l'astérisque (*) pour refuser le démarchage publicitaire.",
  },
  {
    id: "web-removal",
    count: (f) => f.filter((x) => x.kind === "web" && x.verified).length,
    title: (n) => `Faire retirer les pages qui te concernent (${plural(n, "page")})`,
    detail:
      "Supprime ou modifie tes anciennes publications. Sinon, demande au site de retirer tes données, puis demande à Google de déréférencer la page.",
  },
  {
    id: "github-noreply",
    count: (f) => f.filter((x) => x.kind === "account" && x.service === "GitHub").length,
    title: () => "Masquer ton email sur GitHub",
    detail: "Active « Keep my email addresses private » et utilise l'adresse noreply fournie par GitHub pour tes commits.",
  },
  {
    id: "old-accounts",
    count: (f) => f.filter((x) => x.kind === "profile").length,
    title: (n) => `Faire le tri dans tes comptes (${plural(n, "compte")} avec ce pseudo)`,
    detail:
      "Ferme les comptes que tu n'utilises plus et vérifie ce que montrent les autres. Utiliser le même pseudo partout permet de relier tous tes comptes entre eux.",
  },
  {
    id: "watch-bank",
    count: (f) => withCategory(f, "financial"),
    title: () => "Surveiller tes relevés bancaires",
    detail: "Vérifie tes relevés et signale toute opération inconnue à ta banque.",
  },
  {
    id: "identity",
    count: (f) => withCategory(f, "address", "birthDate", "governmentId"),
    title: () => "Rester attentif à l'usurpation d'identité",
    detail:
      "Ces données permettent de se faire passer pour toi. Méfie-toi des demandes de vérification d'identité que tu n'as pas faites.",
  },
];

// When nothing is linked to the visitor, the plan still gives concrete actions (prevention).
const PREVENTION: Action[] = [
  {
    id: "unique-passwords",
    title: "Utiliser un mot de passe différent pour chaque compte",
    detail: "Un gestionnaire de mots de passe s'en souvient pour toi. Une fuite sur un site ne touche alors qu'un seul compte.",
  },
  {
    id: "enable-2fa",
    title: "Activer la double authentification",
    detail: "Active la validation en deux étapes (application ou clé) sur ta messagerie et tes comptes importants.",
  },
  {
    id: "search-yourself",
    title: "Chercher ton nom de temps en temps",
    detail: "Nos sources ne voient pas tout. Refais l'exercice chez toi, une ou deux fois par an.",
  },
];

export function buildActionPlan(findings: Finding[]): Action[] {
  if (linked(findings).length === 0) return PREVENTION;
  return RULES.flatMap((rule) => {
    const n = rule.count(findings);
    return n > 0 ? [{ id: rule.id, title: rule.title(n), detail: rule.detail }] : [];
  });
}
