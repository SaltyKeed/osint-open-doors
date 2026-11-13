export type QueryKind = "email" | "phone" | "name";

export interface PersonName {
  first: string;
  last: string;
}

/** A visitor's search, already normalized: phone in +41 format, email in lowercase. */
export interface SearchQuery {
  email?: string;
  phone?: string;
  name?: PersonName;
}

export type DataCategory =
  | "email"
  | "password"
  | "phone"
  | "name"
  | "address"
  | "birthdate"
  | "username"
  | "ip"
  | "other";

/** Metadata of one breach where the visitor appears. Never contains the leaked values. */
export interface Exposure {
  providerId: string;
  /** Breach name. */
  source: string;
  domain: string | null;
  year: number | null;
  categories: DataCategory[];
  recordCount: number | null;
  verified: boolean;
}

/** A person found by a provider, values as the provider returned them (not normalized). */
export interface PersonRecord {
  email?: string;
  phone?: string;
  name?: PersonName;
}
