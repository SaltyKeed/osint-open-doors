// Domain model: what the rest of the app knows about a search and its results.
// No provider-specific field and no unmasked personal value ever appear here
// (one exception under review: the commune of a directory listing, D27).

import type { Commune } from "./commune";

export type QueryKind = "email" | "phone" | "name" | "username";

// Validated visitor input. The phone is normalized to E.164 (+41791234567).
export type SearchQuery = {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  // Optional context to tell the visitor apart from homonyms (D20).
  city?: string;
  birthYear?: string;
  // Full birth date when the visitor gives it, ISO "2006-03-14" (D28). Only used to
  // guess and recognize usernames; never displayed nor sent to a source as such.
  birthDate?: string;
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
  // Finer categories for the "by data type" view (D30).
  "health",
  "messages",
  "privateLife",
  "work",
  "device",
  "social",
  "activity",
  "other",
] as const;

export type DataCategory = (typeof DATA_CATEGORIES)[number];

type FindingBase = {
  providerId: string;
  // Visitor data that links this finding to the visitor (anti-homonym rule).
  matchedOn: QueryKind;
  // Other providers that reported the same thing (merged by merge.ts). Used to see
  // which providers bring nothing new (D26).
  alsoFoundBy?: string[];
};

// The visitor's data appears in a known data breach (metadata only).
export type BreachFinding = FindingBase & {
  kind: "breach";
  source: string;
  domain?: string;
  year?: string;
  records?: number;
  categories: DataCategory[];
  // The breach was completed with the public HIBP catalog (D29): clean title, plain-text
  // description of what happened, and the service logo (D32).
  describedBy?: "hibp";
  title?: string;
  description?: string;
  logo?: string;
  // Quality warnings from the catalog: unconfirmed, fabricated, spam list (D29).
  notes?: string[];
};

// A public web page found with the visitor's data.
// verified = the page text contains the visitor's email or phone.
// Not verified = found by name only, maybe a homonym (D17).
export type WebFinding = FindingBase & {
  kind: "web";
  verified: boolean;
  // Not verified but the page also contains the visitor's city or birth year (D20).
  probable?: boolean;
  probableBecause?: string; // e.g. "localité"
  site: string;
  url: string;
  title: string; // emails and phone numbers already masked
  snippet: string; // emails and phone numbers already masked
  // Filled by the web archive step (Wayback Machine), when available.
  archive?: WebArchiveInfo;
  // "gone": the site answers 404/410, the page was deleted.
  live?: "online" | "gone" | "unknown";
  // Profile page whose username is built from the visitor's name (and birth date), D28.
  handleMatch?: { handle: string; explanation: string; usesBirthDate: boolean; strong: boolean };
};

export type WebArchiveInfo = {
  firstYear: string;
  lastYear: string;
  snapshotUrl: string; // public link to the latest archived copy
};

// The visitor is listed in a public directory.
export type DirectoryFinding = FindingBase & {
  kind: "directory";
  source: string;
  categories: DataCategory[]; // which data the listing makes public
  noPromo: boolean; // "*" in the directory: no advertising calls
  // Commune of the listing, shown on a map (D27). Never the street nor the number.
  commune?: Commune;
};

// A public account or record is linked to the visitor's email.
export type AccountFinding = FindingBase & {
  kind: "account";
  service: string;
  summary: string; // shown to the visitor (French), no unmasked value
  categories: DataCategory[];
  // Usernames found in this account, used for the pivot step (rebond).
  handles?: string[];
};

// An account with this username exists on a site (WhatsMyName check).
// The same username can belong to someone else: it is a lead, not a proof.
export type ProfileFinding = FindingBase & {
  kind: "profile";
  site: string;
  category: string;
  url: string;
  username: string;
  // "pseudo": typed by the visitor; otherwise the source of the pivot (e.g. "GitHub").
  origin: string;
  archive?: WebArchiveInfo;
  // Facts read from the public profile (D24): creation year, country, activity.
  // Never a display name, bio or city: the account may belong to someone else.
  details?: string[];
  // The username was guessed from the visitor's name, not found or typed (D28).
  guessed?: boolean;
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
  | ProfileFinding
  | CountFinding;
