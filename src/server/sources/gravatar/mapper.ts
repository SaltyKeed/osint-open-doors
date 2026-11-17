import "server-only";
import type { FoundValue } from "@/server/domain/fiche";
import { normalizeIdentifier, type Identifier } from "@/server/domain/identifier";
import type { SourceRecord } from "@/server/domain/source";
import type { GravatarProfile } from "./schema";

const present = (s: string | undefined): s is string => s !== undefined && s.trim().length > 0;

export function toGravatarRecord(profile: GravatarProfile, email: Identifier): SourceRecord {
  const accounts = (profile.verified_accounts ?? []).filter((a) => !a.is_hidden);
  const job = [profile.job_title, profile.company].filter(present).join(", ");
  const values: FoundValue[] = [
    ...(present(profile.display_name) ? [{ field: "A1" as const, value: profile.display_name }] : []),
    ...(present(profile.avatar_url) ? [{ field: "A5" as const, value: profile.avatar_url }] : []),
    ...(present(profile.location) ? [{ field: "C1" as const, value: profile.location }] : []),
    ...(job ? [{ field: "E1" as const, value: job }] : []),
    ...(present(profile.profile_url)
      ? [
          {
            field: "F2" as const,
            value: profile.profile_url,
            attributes: present(profile.description) ? [{ label: "Bio", value: profile.description, known: true }] : [],
          },
        ]
      : []),
    ...accounts.map((a) => ({
      field: "F2" as const,
      value: a.url,
      attributes: [{ label: "Service", value: a.service_label, known: true }],
    })),
  ];
  const profiles = [profile.profile_url, ...accounts.map((a) => a.url)]
    .filter(present)
    .map((url) => normalizeIdentifier("PROFIL", url))
    .filter((i): i is Identifier => i !== null);
  return {
    origin: "Gravatar",
    evidence: profile.profile_url ?? null,
    values,
    // The profile is found by the hash of the email: the record holds this email.
    identifiers: [email, ...profiles].map((identifier) => ({ identifier })),
  };
}
