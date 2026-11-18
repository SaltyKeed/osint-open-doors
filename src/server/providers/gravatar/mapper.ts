import type { Identifier } from "@/server/domain/identifier";
import type { SourceField, SourceRecord } from "@/server/domain/source";
import type { GravatarProfile } from "./schema";

/** "https://gravatar.com/lmartin06" → "lmartin06": the Gravatar username, chosen by the person. */
function usernameOf(profileUrl: string): string | null {
  try {
    return new URL(profileUrl).pathname.split("/").find(Boolean) ?? null;
  } catch {
    return null;
  }
}

// Second whitelist: each field is copied one by one, empty values are left out.
export function toRecords(profile: GravatarProfile): SourceRecord[] {
  const fields: SourceField[] = [];
  const identifiers: Identifier[] = [];
  const add = (field: SourceField["field"], value: string) => {
    if (value.trim()) fields.push({ field, value: value.trim() });
  };

  add("A1", profile.display_name);
  add("A5", profile.avatar_url);
  add("C1", profile.location);
  add("E1", [profile.job_title.trim(), profile.company.trim()].filter(Boolean).join(", "));

  const username = usernameOf(profile.profile_url);
  if (username) {
    add("F1", username);
    identifiers.push({ type: "PSEUDO", value: username });
  }
  add("F2", profile.profile_url);
  // A hidden account was not made public by the person: it is never shown nor searched.
  for (const account of profile.verified_accounts.filter((a) => !a.is_hidden)) {
    add("F2", account.url);
    identifiers.push({ type: "PROFIL", value: account.url });
  }
  return [{ about: "subject", fields, identifiers }];
}
