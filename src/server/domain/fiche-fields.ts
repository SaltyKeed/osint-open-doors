import "server-only";
import { z } from "zod";

// The "fiche de vie" of CADRAGE.md, section 5. `as const` makes the list both
// data (labels, fill rate) and a type: a wrong code such as "H6" is a compile error.

export const CATEGORIES = [
  { code: "A", label: "Identité" },
  { code: "B", label: "Coordonnées" },
  { code: "C", label: "Lieux" },
  { code: "D", label: "Formation" },
  { code: "E", label: "Vie professionnelle" },
  { code: "F", label: "Présence en ligne" },
  { code: "G", label: "Activités et centres d'intérêt" },
  { code: "H", label: "Exposition et sécurité" },
  { code: "I", label: "Traces sur le web" },
  { code: "J", label: "Entourage" },
] as const;

export const FIELDS = [
  { code: "A1", category: "A", label: "Nom et prénom" },
  { code: "A2", category: "A", label: "Date de naissance ou âge" },
  { code: "A3", category: "A", label: "Sexe" },
  { code: "A4", category: "A", label: "Langues, nationalité" },
  { code: "A5", category: "A", label: "Photos de profil" },
  { code: "B1", category: "B", label: "Adresses email" },
  { code: "B2", category: "B", label: "Numéros de téléphone" },
  { code: "B3", category: "B", label: "Adresses postales" },
  { code: "C1", category: "C", label: "Ville de résidence" },
  { code: "C2", category: "C", label: "Lieux de vie passés" },
  { code: "C3", category: "C", label: "Lieux fréquentés" },
  { code: "D1", category: "D", label: "Écoles et formations" },
  { code: "E1", category: "E", label: "Employeurs et postes" },
  { code: "E2", category: "E", label: "Fonctions au registre du commerce" },
  { code: "E3", category: "E", label: "Projets et publications" },
  { code: "F1", category: "F", label: "Pseudos" },
  { code: "F2", category: "F", label: "Comptes" },
  { code: "F3", category: "F", label: "Sites personnels et domaines" },
  { code: "G1", category: "G", label: "Sports, clubs, associations" },
  { code: "G2", category: "G", label: "Loisirs" },
  { code: "G3", category: "G", label: "Mentions dans la presse" },
  { code: "H1", category: "H", label: "Fuites de données" },
  { code: "H2", category: "H", label: "Contenu des fiches de fuites" },
  { code: "H3", category: "H", label: "Mots de passe exposés" },
  { code: "H4", category: "H", label: "Adresses IP" },
  { code: "H5", category: "H", label: "Ordinateurs infectés" },
  { code: "I1", category: "I", label: "Pages qui citent la personne" },
  { code: "I2", category: "I", label: "Pages archivées" },
  { code: "I3", category: "I", label: "Documents" },
  { code: "J1", category: "J", label: "Proches" },
] as const;

export type CategoryCode = (typeof CATEGORIES)[number]["code"];
export type FieldCode = (typeof FIELDS)[number]["code"];

const CODES = FIELDS.map((f) => f.code) as [FieldCode, ...FieldCode[]];
export const fieldCodeSchema = z.enum(CODES);

export function categoryOf(field: FieldCode): CategoryCode {
  return field[0] as CategoryCode;
}
