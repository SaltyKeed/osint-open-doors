// Domain model: what the rest of the app knows about a search and its results.
// No provider-specific field and no unmasked personal value ever appear here.

export type QueryKind = "email" | "phone" | "name";

// Validated visitor input. The phone is normalized to E.164 (+41791234567).
export type SearchQuery = {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
};

// Kinds of exposed data. Only the category is kept, never the value.
export const DATA_CATEGORIES = [
  "email",
  "password",
  "name",
  "phone",
  "address",
  "birthDate",
  "username",
  "photo",
  "ipAddress",
  "financial",
  "governmentId",
  "location",
  "other",
] as const;

export type DataCategory = (typeof DATA_CATEGORIES)[number];

type FindingBase = {
  providerId: string;
  // Visitor data that links this finding to the visitor (anti-homonym rule).
  matchedOn: QueryKind;
};

// The visitor's data appears in a known data breach (metadata only).
export type BreachFinding = FindingBase & {
  kind: "breach";
  source: string;
  domain?: string;
  year?: string;
  records?: number;
  categories: DataCategory[];
};

// A public web page found with the visitor's data.
// verified = the page text contains the visitor's email or phone.
// Not verified = found by name only, maybe a homonym (D15).
export type WebFinding = FindingBase & {
  kind: "web";
  verified: boolean;
  site: string;
  url: string;
  title: string; // emails and phone numbers already masked
  snippet: string; // emails and phone numbers already masked
};

// The visitor is listed in a public directory.
export type DirectoryFinding = FindingBase & {
  kind: "directory";
  source: string;
  categories: DataCategory[]; // which data the listing makes public
  noPromo: boolean; // "*" in the directory: no advertising calls
};

// A public account or record is linked to the visitor's email.
export type AccountFinding = FindingBase & {
  kind: "account";
  service: string;
  summary: string; // shown to the visitor (French), no unmasked value
  categories: DataCategory[];
};

// Results found by name only: probably homonyms, so only a total is shown.
export type CountFinding = FindingBase & {
  kind: "count";
  source: string;
  count: number;
  label: string; // e.g. "inscriptions portent ce nom dans l'annuaire"
};

export type Finding =
  | BreachFinding
  | WebFinding
  | DirectoryFinding
  | AccountFinding
  | CountFinding;
