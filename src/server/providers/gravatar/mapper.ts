import "server-only";
import { handleFromProfileUrl } from "@/server/domain/handles";
import type { AccountFinding, DataCategory } from "@/server/domain/types";
import type { GravatarProfile } from "./schema";

export const PROVIDER_ID = "gravatar";

export function avatarOnlyFinding(): AccountFinding {
  return {
    kind: "account",
    providerId: PROVIDER_ID,
    service: "Gravatar",
    summary:
      "Une photo de profil publique est liée à ton adresse. Beaucoup de sites (WordPress, forums, GitHub…) l'affichent automatiquement.",
    categories: ["photo"],
    matchedOn: "email",
  };
}

// Public Gravatar profile: what it shows, and the accounts declared on it (pivots).
export function toProfileFinding(profile: GravatarProfile): AccountFinding {
  const visible: string[] = ["une photo"];
  const categories: DataCategory[] = ["photo"];
  if (profile.display_name) {
    visible.push("un nom");
    categories.push("name");
  }
  if (profile.location) {
    visible.push(`une localité (${profile.location})`);
    categories.push("location");
  }
  if (profile.job_title || profile.company) visible.push("ton métier ou entreprise");
  if (profile.description) visible.push("une description");

  const accounts = (profile.verified_accounts ?? []).filter((a) => !a.is_hidden && a.url);
  const labels = [...new Set(accounts.map((a) => a.service_label).filter((l): l is string => Boolean(l)))];
  const handles = [...new Set(accounts.map((a) => handleFromProfileUrl(a.url ?? "")).filter((h): h is string => h !== null))];

  return {
    kind: "account",
    providerId: PROVIDER_ID,
    service: "Profil Gravatar",
    summary:
      `Un profil public est lié à ton adresse : il montre ${visible.join(", ")}.` +
      (labels.length > 0 ? ` Comptes déclarés : ${labels.join(", ")}.` : ""),
    categories,
    matchedOn: "email",
    handles,
  };
}
