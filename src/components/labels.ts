import type { DataCategory } from "@/server/domain/types";

// Words shown to the visitor (French), shared by the screens.

export const CATEGORY_LABELS: Record<DataCategory, string> = {
  email: "Email",
  password: "Mot de passe",
  name: "Nom",
  phone: "Téléphone",
  address: "Adresse",
  birthDate: "Date de naissance",
  username: "Pseudo",
  photo: "Photo",
  ipAddress: "Adresse IP",
  financial: "Données bancaires",
  governmentId: "Pièce d'identité",
  location: "Localité",
  other: "Autre",
};

export const PROVIDER_LABELS: Record<string, string> = {
  xposedornot: "les fuites de données",
  leakcheck: "les fuites de données (LeakCheck)",
  tavily: "la recherche web",
  searchch: "l'annuaire search.ch",
  github: "GitHub",
  gravatar: "Gravatar",
  pgp: "le serveur de clés PGP",
  rdap: "le registre des domaines",
  whatsmyname: "la vérification des pseudos",
  profiles: "les profils publics (jeux, réseaux, développeurs)",
  orcid: "ORCID",
  wikidata: "Wikidata",
  shab: "la Feuille officielle suisse du commerce",
  wayback: "les archives du web",
};

export const plural = (n: number, singular: string, pluralForm = `${singular}s`) =>
  `${n.toLocaleString("fr-CH")} ${n > 1 ? pluralForm : singular}`;
