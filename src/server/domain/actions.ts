import type { DataCategory, Finding } from "./types";

export type Action = {
  id: string;
  title: string; // shown to the visitor (French)
  detail: string;
};

type Rule = { action: Action; applies: (findings: Finding[]) => boolean };

function exposedCategories(findings: Finding[]): Set<DataCategory> {
  return new Set(
    findings.flatMap((f) => (f.kind === "breach" || f.kind === "directory" || f.kind === "account" ? f.categories : [])),
  );
}

const hasCategory =
  (...categories: DataCategory[]) =>
  (findings: Finding[]) => {
    const exposed = exposedCategories(findings);
    return categories.some((c) => exposed.has(c));
  };

const hasKind = (kind: Finding["kind"]) => (findings: Finding[]) =>
  findings.some((f) => f.kind === kind);

const hasService = (service: string) => (findings: Finding[]) =>
  findings.some((f) => f.kind === "account" && f.service === service);

// Ordered by priority: the first actions are the most urgent.
const RULES: Rule[] = [
  {
    applies: (findings) => findings.some((f) => f.kind === "breach" && f.categories.includes("password")),
    action: {
      id: "change-passwords",
      title: "Changer les mots de passe concernés",
      detail:
        "Change le mot de passe des comptes touchés et de tous les comptes où tu utilisais le même. Utilise un gestionnaire de mots de passe.",
    },
  },
  {
    applies: hasKind("breach"),
    action: {
      id: "enable-2fa",
      title: "Activer la double authentification",
      detail:
        "Active la validation en deux étapes (application ou clé) sur ta messagerie et tes comptes importants.",
    },
  },
  {
    applies: (findings) => hasKind("breach")(findings) || hasKind("web")(findings) || hasKind("directory")(findings),
    action: {
      id: "phishing",
      title: "Se méfier des messages ciblés",
      detail:
        "Un attaquant peut utiliser ces données pour un faux message crédible (email, SMS, appel). Ne clique pas sur un lien inattendu et ne donne jamais de code reçu.",
    },
  },
  {
    applies: hasKind("directory"),
    action: {
      id: "directory",
      title: "Limiter ton inscription dans l'annuaire",
      detail:
        "Demande à ton opérateur de masquer ton adresse, ou de ne plus publier ton numéro. Ajoute l'astérisque (*) pour refuser le démarchage publicitaire.",
    },
  },
  {
    applies: hasKind("web"),
    action: {
      id: "web-removal",
      title: "Faire retirer les pages qui te concernent",
      detail:
        "Supprime ou modifie tes anciennes publications. Sinon, demande au site de retirer tes données, puis demande à Google de déréférencer la page.",
    },
  },
  {
    applies: hasService("GitHub"),
    action: {
      id: "github-noreply",
      title: "Masquer ton email sur GitHub",
      detail:
        "Active « Keep my email addresses private » et utilise l'adresse noreply fournie par GitHub pour tes commits.",
    },
  },
  {
    applies: hasCategory("financial"),
    action: {
      id: "watch-bank",
      title: "Surveiller tes relevés bancaires",
      detail: "Vérifie tes relevés et signale toute opération inconnue à ta banque.",
    },
  },
  {
    applies: hasCategory("address", "birthDate", "governmentId"),
    action: {
      id: "identity",
      title: "Rester attentif à l'usurpation d'identité",
      detail:
        "Ces données permettent de se faire passer pour toi. Méfie-toi des demandes de vérification d'identité que tu n'as pas faites.",
    },
  },
];

export function buildActionPlan(findings: Finding[]): Action[] {
  return RULES.filter((rule) => rule.applies(findings)).map((rule) => rule.action);
}
