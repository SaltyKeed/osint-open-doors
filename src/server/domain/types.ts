// Domain model: what the rest of the app knows about a search and its results.
// No provider-specific field and no personal value ever appear here.

export type QueryKind = "email" | "phone" | "name";

export type SearchQuery = {
  email?: string;
};

// Kinds of data exposed in a breach. Only the category is kept, never the value.
export const DATA_CATEGORIES = [
  "email",
  "password",
  "name",
  "phone",
  "address",
  "birthDate",
  "username",
  "ipAddress",
  "financial",
  "governmentId",
  "location",
  "other",
] as const;

export type DataCategory = (typeof DATA_CATEGORIES)[number];

// One breach in which the visitor's data appears (metadata only).
export type Exposure = {
  providerId: string;
  source: string; // name of the breached service, e.g. "ExampleShop"
  domain?: string;
  year?: string;
  records?: number;
  categories: DataCategory[];
  matchedOn: QueryKind;
};
