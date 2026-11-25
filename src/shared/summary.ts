import type { Finding } from "@/server/domain/finding";
import { FIELD_CATEGORIES, FIELD_CODES, type FieldCode } from "./fiche-fields";

// No runtime import from src/server/ here: this file also runs in the browser (T12).

/** Counts of fields, not of findings. */
export interface FillRate {
  confirmed: number;
  probable: number;
  total: number;
}

export interface CategoryFill extends FillRate {
  code: string;
  label: string;
}

export type Urgency = "urgent" | "important" | "review";

export interface Action {
  id: string;
  urgency: Urgency;
  title: string;
  detail: string;
}

export interface Summary {
  fill: FillRate;
  /** Categories A to J. */
  categories: CategoryFill[];
  /** Urgent first, then important, then review; stable order inside a level. */
  actions: Action[];
  /** What an attacker could do beyond this tool (CADRAGE.md, section 6.4). Always present. */
  beyond: { title: string; detail: string }[];
}

/** The rules' texts never contain a value of the visitor: only counts, breach names (H1) and advice. */
const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

interface Rule {
  id: string;
  urgency: Urgency;
  field: FieldCode;
  build: (findings: Finding[]) => Pick<Action, "title" | "detail">;
}

// The order of this list is the order of the plan inside each urgency level.
const RULES: readonly Rule[] = [
  {
    id: "exposed-password",
    urgency: "urgent",
    field: "H3",
    build: () => ({
      title: "Change tes mots de passe exposés",
      detail:
        "Un de tes mots de passe est connu après une fuite. Change-le tout de suite, et change-le partout où tu l'as réutilisé.",
    }),
  },
  {
    id: "infected-computer",
    urgency: "urgent",
    field: "H5",
    build: () => ({
      title: "Nettoie ton ordinateur",
      detail:
        "Un ordinateur a été infecté par un logiciel espion. Nettoie-le ou réinstalle-le. Ensuite, change tous tes mots de passe depuis un autre appareil et active la double authentification.",
    }),
  },
  {
    id: "breaches",
    urgency: "important",
    field: "H1",
    build: (findings) => {
      const names = findings.map((f) => f.value).join(", ");
      // Only a breach that exposed passwords calls for a new password; the others feed scams.
      const passwords = findings.some((f) => f.breach?.dataTypes.includes("password"));
      const advice = passwords
        ? "Change ton mot de passe sur ces sites."
        : "Méfie-toi des messages qui citent ces sites : tes données peuvent servir à une arnaque.";
      return {
        title: "Tes données sont dans des fuites",
        detail: `Tu es dans ${plural(findings.length, "fuite", "fuites")} : ${names}. ${advice} Utilise un gestionnaire de mots de passe et la double authentification.`,
      };
    },
  },
  {
    id: "public-phone",
    urgency: "important",
    field: "B2",
    build: () => ({
      title: "Ton numéro de téléphone est public",
      detail: "Retire ton numéro des annuaires (search.ch, local.ch) et de tes profils publics.",
    }),
  },
  {
    id: "public-address",
    urgency: "important",
    field: "B3",
    build: () => ({
      title: "Ton adresse est publique",
      detail: "Retire ton adresse des annuaires et de tes profils publics.",
    }),
  },
  {
    id: "accounts",
    urgency: "review",
    field: "F2",
    build: (findings) => ({
      title: "Des comptes sont liés à toi",
      detail: `On a trouvé ${plural(findings.length, "compte", "comptes")}. Vérifie leur confidentialité et supprime ceux que tu n'utilises plus.`,
    }),
  },
  {
    id: "web-pages",
    urgency: "review",
    field: "I1",
    build: (findings) => {
      const it = findings.length > 1 ? "les" : "la";
      return {
        title: "Des pages parlent de toi",
        detail: `${plural(findings.length, "page cite", "pages citent")} un de tes identifiants. Demande au site de ${it} retirer (droit à l'effacement, nLPD), puis demande au moteur de recherche de ${it} déréférencer.`,
      };
    },
  },
  {
    id: "profile-photos",
    urgency: "review",
    field: "A5",
    build: () => ({
      title: "Tes photos de profil sont visibles",
      detail: "Limite les personnes qui peuvent voir tes photos de profil.",
    }),
  },
];

const URGENCY_ORDER: readonly Urgency[] = ["urgent", "important", "review"];

const BEYOND: Summary["beyond"] = [
  {
    title: "Tester les formulaires d'inscription",
    detail:
      "Un attaquant peut essayer de créer un compte ou de récupérer un mot de passe sur des centaines de sites pour voir où ton email est inscrit. Cet outil ne le fait pas.",
  },
  {
    title: "Se connecter avec un compte",
    detail:
      "Avec un compte connecté, un attaquant lit des profils que le public ne voit pas : amis, photos, avis. Cet outil ne se connecte à aucun compte.",
  },
  {
    title: "Lire directement Instagram, TikTok, LinkedIn et Facebook",
    detail:
      "Un attaquant peut aspirer ces profils avec des robots, même si les sites l'interdisent. Il y trouve tes publications, tes amis et tes habitudes. Cet outil lit seulement ce qu'une page de profil montre à tout le monde (nom affiché et photo), jamais tes publications ni tes amis.",
  },
  {
    title: "Reconnaître un visage",
    detail:
      "Avec une de tes photos, un attaquant peut chercher ton visage sur le web et retrouver des comptes sans connaître ton pseudo. Cet outil ne le fait pas : un visage est une donnée sensible.",
  },
  {
    title: "Contourner les protections des sites",
    detail:
      "Un attaquant peut contourner un CAPTCHA ou Cloudflare pour lire des pages fermées aux robots. Cet outil respecte ces protections.",
  },
];

export function summarize(findings: readonly Finding[]): Summary {
  // Only confirmed and probable findings count; a field is confirmed as soon as one finding is.
  const counted = findings.filter((f) => f.confidence === "confirmed" || f.confidence === "probable");
  const state = new Map<FieldCode, "confirmed" | "probable">();
  for (const f of counted) {
    if (f.confidence === "confirmed" || !state.has(f.field)) state.set(f.field, f.confidence as "confirmed" | "probable");
  }

  const count = (fields: readonly FieldCode[]): FillRate => ({
    confirmed: fields.filter((f) => state.get(f) === "confirmed").length,
    probable: fields.filter((f) => state.get(f) === "probable").length,
    total: fields.length,
  });

  const actions = RULES.flatMap((rule): Action[] => {
    // The same value written twice (two rounds, two sources) is one item for the visitor.
    const seen = new Set<string>();
    const matching = counted.filter((f) => {
      const key = f.value.trim().toLowerCase();
      if (f.field !== rule.field || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (matching.length === 0) return [];
    return [{ id: rule.id, urgency: rule.urgency, ...rule.build(matching) }];
  }).sort((a, b) => URGENCY_ORDER.indexOf(a.urgency) - URGENCY_ORDER.indexOf(b.urgency));

  return {
    fill: count(FIELD_CODES),
    categories: FIELD_CATEGORIES.map((c) => ({ code: c.code, label: c.label, ...count(c.fields) })),
    actions,
    beyond: BEYOND,
  };
}
