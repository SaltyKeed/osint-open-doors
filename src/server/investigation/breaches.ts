import "server-only";
import { z } from "zod";
import { addSighting, type Attribute, type Fiche } from "@/server/domain/fiche";
import { fold } from "@/server/domain/identifier";

// Presents each breach found (H1) with the public catalogue of Have I Been Pwned
// (SOURCES.md, section 1.1): date, accounts, exposed data, description. The whole
// catalogue is downloaded: no data about the visitor is sent to HIBP.

export const catalogueSchema = z.array(
  z.object({
    Name: z.string(),
    Title: z.string(),
    Domain: z.string(),
    BreachDate: z.string(),
    PwnCount: z.number(),
    DataClasses: z.array(z.string()),
    Description: z.string(),
  }),
);

export type CatalogueBreach = z.infer<typeof catalogueSchema>[number];

const DATA_LABELS: Record<string, string> = {
  "Email addresses": "adresses email",
  Passwords: "mots de passe",
  Names: "noms",
  Usernames: "pseudos",
  "IP addresses": "adresses IP",
  "Phone numbers": "numéros de téléphone",
  "Physical addresses": "adresses postales",
  "Dates of birth": "dates de naissance",
  Genders: "sexe",
  "Geographic locations": "lieux",
  Purchases: "achats",
  "Website activity": "activité sur le site",
  "Job titles": "postes",
  "Social media profiles": "profils de réseaux sociaux",
  Employers: "employeurs",
  "Private messages": "messages privés",
  "Partial credit card data": "données partielles de carte bancaire",
  "Device information": "informations sur l'appareil",
  Salutations: "civilités",
  "Government issued IDs": "pièces d'identité",
  "Spoken languages": "langues",
  "Profile photos": "photos de profil",
  "Security questions and answers": "questions de sécurité",
  "Password hints": "indices de mot de passe",
  "Bank account numbers": "numéros de compte bancaire",
};

const REPLACED = new Set(["Année", "Date", "Données exposées", "Comptes touchés"]);

/** "Duolingo.com" and "DUOLINGO" give "duolingo". */
function key(name: string): string {
  return fold(name).replace(/\.[a-z]{2,6}$/, "").replace(/[^a-z0-9]/g, "");
}

export function findBreach(name: string, catalogue: readonly CatalogueBreach[]): CatalogueBreach | null {
  const wanted = key(name);
  if (wanted.length < 3) return null;
  return catalogue.find((b) => [b.Name, b.Title, b.Domain].some((n) => n && key(n) === wanted)) ?? null;
}

function plainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function attributes(b: CatalogueBreach): Attribute[] {
  const [year, month, day] = b.BreachDate.split("-");
  return [
    { label: "Date de la fuite", value: `${day}.${month}.${year}`, known: true },
    { label: "Comptes touchés", value: b.PwnCount.toLocaleString("fr-CH").replace(/[ ’']/g, " "), known: true },
    ...(b.DataClasses.length > 0
      ? [{ label: "Données exposées", value: b.DataClasses.map((d) => DATA_LABELS[d] ?? d).join(", "), known: true }]
      : []),
    ...(b.Description ? [{ label: "Description (anglais)", value: plainText(b.Description), known: true }] : []),
  ];
}

/** New fiche where every known breach carries its catalogue title and details. */
export function enrichBreaches(fiche: Fiche, catalogue: readonly CatalogueBreach[]): Fiche {
  const enriched: Fiche = new Map();
  for (const finding of fiche.values()) {
    const breach = finding.field === "H1" ? findBreach(finding.value, catalogue) : null;
    const value = breach?.Title ?? finding.value;
    // The catalogue details replace the shorter ones given by the sources.
    const own = breach ? finding.attributes.filter((a) => !REPLACED.has(a.label)) : finding.attributes;
    const extra = breach ? attributes(breach) : [];
    finding.sightings.forEach((sighting, i) => {
      addSighting(
        enriched,
        {
          field: finding.field,
          value,
          attributes: i === 0 ? [...extra, ...own] : [],
          thirdParty: finding.thirdParty,
        },
        sighting,
      );
    });
  }
  return enriched;
}

let cache: { at: number; breaches: CatalogueBreach[] } | null = null;

/** The catalogue changes a few times a week: one download a day is enough. Empty on failure. */
export async function loadCatalogue(signal?: AbortSignal): Promise<CatalogueBreach[]> {
  if (cache && Date.now() - cache.at < 24 * 3600 * 1000) return cache.breaches;
  try {
    const response = await fetch("https://haveibeenpwned.com/api/v3/breaches", {
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(10_000)]) : AbortSignal.timeout(10_000),
      headers: { "User-Agent": "osint-open-doors" },
    });
    if (!response.ok) return cache?.breaches ?? [];
    const parsed = catalogueSchema.safeParse(await response.json());
    if (!parsed.success) return cache?.breaches ?? [];
    cache = { at: Date.now(), breaches: parsed.data };
    return parsed.data;
  } catch {
    return cache?.breaches ?? [];
  }
}
