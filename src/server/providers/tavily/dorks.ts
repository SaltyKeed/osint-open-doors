import "server-only";
import { nameSideBySide } from "@/server/domain/name-match";
import type { DorkContext, DorkKind } from "@/server/domain/source";
import type { FieldCode } from "@/shared/fiche-fields";

export interface Dork {
  kind: DorkKind;
  field: FieldCode;
  query: string;
  /** At least one of these words must be in the title or the extract. */
  second: string[];
  includeDomains?: string[];
  /** The page address must be on one of these domains. */
  site?: string[];
  /** Sent first with the cantons, then once more without them if nothing was kept. */
  romandie: boolean;
}

export const ROMANDIE = "(Neuchâtel OR Vaud OR Genève OR Fribourg OR Valais OR Jura)";

/** Swiss press (SOURCES.md, section 4). */
export const PRESS_DOMAINS = [
  "arcinfo.ch",
  "rts.ch",
  "20min.ch",
  "lenouvelliste.ch",
  "laliberte.ch",
  "tdg.ch",
  "24heures.ch",
  "lecourrier.ch",
];

const PLATFORMS = ["instagram.com", "tiktok.com", "facebook.com"];

/** A double quote would end the phrase early and change the query. */
const clean = (value: string) => value.replaceAll('"', "").replace(/\s+/g, " ").trim();

/** Lowercase without accents, to compare words. */
const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/** The shortest value has the fewest words, so the most pages. */
const shortest = (values: string[] = []) => values.map(clean).filter(Boolean).sort((a, b) => a.length - b.length)[0];

/** The applicable dorks, in the order of the spec (1 to 8). */
export function buildDorks(context: DorkContext): Dork[] {
  const name = context.name ? clean(context.name) : "";
  const dorks: Dork[] = [];
  const byValue = (field: FieldCode, value: string | undefined) => {
    if (name && value) dorks.push({ kind: "value", field, query: `"${name}" "${value}"`, second: [value], romandie: false });
  };
  byValue("I1", shortest(context.values.C1));
  byValue("E1", shortest(context.values.E1));
  byValue("D1", shortest([...(context.values.D1 ?? []), ...(context.values.ORGA ?? [])]));
  if (context.onlyValues) return dorks;

  const pseudo = context.pseudo ? clean(context.pseudo.value) : "";
  if (pseudo) {
    dorks.push({
      kind: "pseudo",
      field: "F2",
      query: `"${pseudo}" ${PLATFORMS.map((d) => `site:${d}`).join(" OR ")}`,
      second: [pseudo],
      site: PLATFORMS,
      // A profile page rarely names a canton: the platforms already narrow the search, a retry would waste a credit.
      romandie: false,
    });
  }
  if (!name) return dorks;
  const keyword = (field: FieldCode, query: string, extra: Partial<Dork> = {}) =>
    dorks.push({ kind: "keyword", field, query, second: [], romandie: true, ...extra });
  keyword("F2", `"${name}" site:linkedin.com/in`, { site: ["linkedin.com"] });
  keyword("G1", `"${name}" club OR résultats OR classement`, { second: ["club", "résultats", "classement"] });
  keyword("G3", `"${name}"`, { includeDomains: PRESS_DOMAINS });
  keyword("I3", `"${name}" filetype:pdf`);
  return dorks;
}

function onDomain(url: string, domains: string[]): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return domains.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

/** True when the page holds the two pieces of information of the dork. The page text is read here only. */
export function keepsPage(
  dork: Dork,
  name: string | undefined,
  page: { url: string; title: string; content?: string | null },
): boolean {
  const text = `${page.title} ${page.content ?? ""}`;
  // The pseudo dork has no name in its query: the name is not required there.
  if (dork.kind !== "pseudo" && !(name && nameSideBySide(text, name))) return false;
  const domains = dork.site ?? dork.includeDomains;
  if (domains && !onDomain(page.url, domains)) return false;
  if (dork.second.length === 0) return true;
  // A pseudo often sits in the address only (instagram.com/lmartin_06).
  const haystack = fold(dork.kind === "pseudo" ? `${page.url} ${text}` : text);
  return dork.second.some((word) => haystack.includes(fold(word)));
}
