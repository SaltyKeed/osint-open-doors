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
