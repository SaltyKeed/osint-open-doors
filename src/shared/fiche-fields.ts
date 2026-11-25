/** Fields of the life record, in the display order of CADRAGE.md, section 5. */
export const FIELD_CODES = [
  "A1", "A2", "A3", "A4", "A5",
  "B1", "B2", "B3",
  "C1", "C2", "C3",
  "D1",
  "E1", "E2", "E3",
  "F1", "F2", "F3",
  "G1", "G2", "G3",
  "H1", "H2", "H3", "H4", "H5",
  "I1", "I2", "I3",
  "J1",
] as const;

export type FieldCode = (typeof FIELD_CODES)[number];

export const FIELD_LABELS: Record<FieldCode, string> = {
  A1: "Nom et prénom, variantes et noms d'usage",
  A2: "Date de naissance ou âge",
  A3: "Sexe (tel qu'indiqué dans une source)",
  A4: "Langues, nationalité (telles qu'indiquées dans une source)",
  A5: "Photos de profil",
  B1: "Adresses email",
  B2: "Numéros de téléphone",
  B3: "Adresses postales, actuelle et anciennes",
  C1: "Ville de résidence",
  C2: "Lieux de vie passés",
  C3: "Lieux fréquentés cités publiquement",
  D1: "Écoles et formations, avec les années",
  E1: "Employeurs et postes, actuels et passés",
  E2: "Fonctions au registre du commerce",
  E3: "Projets et publications",
  F1: "Pseudos",
  F2: "Comptes en ligne",
  F3: "Sites personnels et noms de domaine",
  G1: "Sports, clubs, associations, résultats",
  G2: "Loisirs visibles sur les comptes",
  G3: "Mentions dans la presse",
  H1: "Fuites de données",
  H2: "Contenu de la fiche dans chaque fuite",
  H3: "Mots de passe exposés",
  H4: "Adresses IP connues et localisation approximative",
  H5: "Ordinateurs infectés par un logiciel espion",
  I1: "Pages qui citent un identifiant",
  I2: "Pages supprimées retrouvées dans les archives",
  I3: "Documents qui citent un identifiant",
  J1: "Proches identifiables",
};

/** The 10 categories of the life record, in the order of CADRAGE.md, section 5. */
export const FIELD_CATEGORIES: readonly { code: string; label: string; fields: readonly FieldCode[] }[] = [
  { code: "A", label: "Identité", fields: ["A1", "A2", "A3", "A4", "A5"] },
  { code: "B", label: "Coordonnées", fields: ["B1", "B2", "B3"] },
  { code: "C", label: "Lieux", fields: ["C1", "C2", "C3"] },
  { code: "D", label: "Formation", fields: ["D1"] },
  { code: "E", label: "Vie professionnelle", fields: ["E1", "E2", "E3"] },
  { code: "F", label: "Présence en ligne", fields: ["F1", "F2", "F3"] },
  { code: "G", label: "Activités et centres d'intérêt", fields: ["G1", "G2", "G3"] },
  { code: "H", label: "Exposition et sécurité", fields: ["H1", "H2", "H3", "H4", "H5"] },
  { code: "I", label: "Traces sur le web", fields: ["I1", "I2", "I3"] },
  { code: "J", label: "Entourage", fields: ["J1"] },
];
