import type { DataCategory, Exposure } from "./types";

export type Action = {
  id: string;
  title: string; // shown to the visitor (French)
  detail: string;
};

// Ordered by priority: the first matching actions are the most urgent.
const ACTIONS: { action: Action; triggers: DataCategory[] }[] = [
  {
    triggers: ["password"],
    action: {
      id: "change-passwords",
      title: "Changer les mots de passe concernés",
      detail:
        "Change le mot de passe des comptes touchés et de tous les comptes où tu utilisais le même. Utilise un gestionnaire de mots de passe.",
    },
  },
  {
    triggers: ["password", "email"],
    action: {
      id: "enable-2fa",
      title: "Activer la double authentification",
      detail:
        "Active la validation en deux étapes (application ou clé) sur ta messagerie et tes comptes importants.",
    },
  },
  {
    triggers: ["email", "phone", "name"],
    action: {
      id: "phishing",
      title: "Se méfier des messages ciblés",
      detail:
        "Un attaquant peut utiliser ces données pour un faux message crédible (email, SMS, appel). Ne clique pas sur un lien inattendu et ne donne jamais de code reçu.",
    },
  },
  {
    triggers: ["financial"],
    action: {
      id: "watch-bank",
      title: "Surveiller tes relevés bancaires",
      detail: "Vérifie tes relevés et signale toute opération inconnue à ta banque.",
    },
  },
  {
    triggers: ["address", "birthDate", "governmentId"],
    action: {
      id: "identity",
      title: "Rester attentif à l'usurpation d'identité",
      detail:
        "Ces données permettent de se faire passer pour toi. Méfie-toi des demandes de vérification d'identité que tu n'as pas faites.",
    },
  },
];

export function buildActionPlan(exposures: Exposure[]): Action[] {
  const exposed = new Set(exposures.flatMap((e) => e.categories));
  return ACTIONS.filter(({ triggers }) => triggers.some((t) => exposed.has(t))).map(
    ({ action }) => action,
  );
}
