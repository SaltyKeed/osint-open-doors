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
  health: "Santé",
  messages: "Messages privés",
  privateLife: "Vie privée",
  work: "Travail et études",
  device: "Appareil",
  social: "Réseaux sociaux",
  activity: "Achats et activité",
  other: "Autre",
};

// Why each kind of data matters, shown in the "by data type" view (D30).
export const CATEGORY_RISKS: Record<DataCategory, string> = {
  password: "Un pirate essaie ce mot de passe sur tes autres comptes : c'est la première cause de comptes volés.",
  financial: "Permet des achats frauduleux ou des arnaques qui citent ta banque.",
  governmentId: "Permet d'ouvrir des comptes ou des contrats à ton nom (usurpation d'identité).",
  health: "Données très sensibles : chantage, discrimination, arnaques ciblées.",
  privateLife: "Informations intimes (genre, situation, croyances…) qui peuvent servir au chantage ou au harcèlement.",
  messages: "Tes échanges privés ont été copiés : ils peuvent révéler beaucoup sur toi et ton entourage.",
  address: "Permet de savoir où tu habites et de rendre un faux courrier crédible.",
  phone: "Ouvre la porte aux SMS piégés, aux appels frauduleux et au vol de numéro (SIM swap).",
  birthDate: "Souvent utilisée pour vérifier ton identité ou deviner tes mots de passe.",
  ipAddress: "Donne une idée de ton fournisseur et de ta région au moment de la fuite.",
  device: "Décrit ton ordinateur ou ton téléphone : utile pour imiter ta connexion.",
  location: "Indique ta région ou tes déplacements.",
  photo: "Permet de te reconnaître et de relier tes comptes grâce à la photo.",
  work: "Ton employeur ou ton école : base d'arnaques au faux collègue ou au faux service informatique.",
  social: "Relie tes profils de réseaux sociaux entre eux.",
  activity: "Achats, centres d'intérêt et activité : de quoi écrire une arnaque sur mesure.",
  name: "Ton nom relie la fuite à toi et à tes autres comptes.",
  username: "Un pseudo réutilisé permet de retrouver tes autres comptes.",
  email: "Ton adresse reçoit des emails piégés et sert d'identifiant pour tes comptes.",
  other: "Autres données de la fuite que nous ne savons pas classer.",
};

// What to do for each kind of data, in one sentence (D30).
export const CATEGORY_ADVICE: Record<DataCategory, string> = {
  password: "change ce mot de passe sur chaque compte où tu l'utilises, puis active la double authentification.",
  financial: "vérifie tes relevés et demande une nouvelle carte à ta banque en cas de doute.",
  governmentId: "méfie-toi des demandes d'identité inattendues ; en cas d'usurpation, porte plainte.",
  health: "méfie-toi des messages qui citent ta santé ou ton assurance ; ne réponds pas à un chantage.",
  privateLife: "ne réponds pas à un message qui te menace de révéler ces informations ; parles-en à quelqu'un de confiance.",
  messages: "supprime les anciens comptes inutilisés et évite d'écrire des informations sensibles en message privé.",
  address: "méfie-toi des faux courriers et colis ; ne confirme jamais ton adresse à un inconnu.",
  phone: "ne clique pas sur les liens reçus par SMS et demande à ton opérateur un code de protection contre le vol de numéro.",
  birthDate: "ne l'utilise jamais dans un mot de passe et ne la confirme pas au téléphone.",
  ipAddress: "rien d'urgent : ton adresse IP change souvent.",
  device: "garde ton système et ton navigateur à jour.",
  location: "évite de publier ta position en direct sur les réseaux.",
  photo: "utilise une photo différente selon les comptes si tu ne veux pas qu'on les relie.",
  work: "méfie-toi des messages qui se font passer pour un collègue, un professeur ou le service informatique.",
  social: "vérifie ce que tes profils montrent publiquement et passe-les en privé si besoin.",
  activity: "méfie-toi des offres trop bien ciblées, elles peuvent venir de ces données.",
  name: "rien à changer, mais sois attentif aux messages qui t'appellent par ton nom pour te mettre en confiance.",
  username: "utilise des pseudos différents si tu ne veux pas qu'on relie tes comptes.",
  email: "active la double authentification sur ta messagerie et méfie-toi des emails piégés.",
  other: "regarde le détail de chaque fuite dans l'onglet Fuites.",
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
  hudsonrock: "les ordinateurs infectés (Hudson Rock)",
  ransomware: "les attaques par rançongiciel",
  dehashed: "les bases de données volées (DeHashed)",
};

// Short name of each provider, shown under every result (D26).
export const SOURCE_NAMES: Record<string, string> = {
  xposedornot: "XposedOrNot",
  leakcheck: "LeakCheck",
  tavily: "Tavily (recherche web)",
  searchch: "search.ch",
  github: "GitHub",
  gravatar: "Gravatar",
  pgp: "keys.openpgp.org",
  rdap: "RDAP (registre des domaines)",
  whatsmyname: "WhatsMyName",
  profiles: "API publique du site",
  keybase: "Keybase",
  orcid: "ORCID",
  wikidata: "Wikidata",
  shab: "FOSC (amtsblattportal.ch)",
  wayback: "Wayback Machine (archives)",
  hudsonrock: "Hudson Rock (infostealers)",
  ransomware: "ransomware.live",
  dehashed: "DeHashed",
  hibp: "Have I Been Pwned (catalogue)",
};

export const sourceName = (id: string) => SOURCE_NAMES[id] ?? id;

export const plural = (n: number, singular: string, pluralForm = `${singular}s`) =>
  `${n.toLocaleString("fr-CH")} ${n > 1 ? pluralForm : singular}`;
