import "server-only";
import { isDetailed, type Confidence } from "@/server/domain/confidence";
import { fillRate, type Attribute, type Finding } from "@/server/domain/fiche";
import { CATEGORIES, FIELDS, type FieldCode } from "@/server/domain/fiche-fields";
import type { IdentifierType } from "@/server/domain/identifier";
import { maskValue } from "@/server/domain/masking";
import type { SourceStatus } from "@/server/domain/source";
import type { Commune } from "@/server/domain/commune";
import { resolveCommune } from "@/server/geo/communes";
import type { InvestigationResult, SourceRun } from "./engine";

// What the screen receives. Possible values and namesakes stay on the server:
// only their number is sent (CADRAGE.md, section 7, "total seulement").

export interface ViewValue {
  value: string;
  masked: string;
  confidence: Extract<Confidence, "confirme" | "probable">;
  sources: string[];
  /** "trouvé grâce à…": each step as "source (type)", without the values. */
  path: string[];
  attributes: Attribute[];
  thirdParty: boolean;
}

export interface ViewField {
  code: FieldCode;
  label: string;
  values: ViewValue[];
  /** Possible values and namesakes: counted, never shown. */
  hiddenCount: number;
}

export interface InvestigationView {
  categories: { code: string; label: string; filled: number; total: number; fields: ViewField[] }[];
  /** Services that received the visitor's data during this investigation. */
  services: string[];
  /** What each source answered: "nothing found" must not look like a failure. */
  sourceReport: SourceReport[];
  summary: Summary;
  breaches: BreachCard[];
  infections: InfectionCard[];
  pages: PageCard[];
  profiles: ProfileCard[];
  archives: ArchiveCard[];
  actions: Action[];
  /** Unconfirmed accounts and pages (found by a pseudo or a name only): to check, never pivots. */
  leads: { profiles: LeadProfile[]; pages: PageCard[]; breaches: BreachCard[] };
  /** Commune of a confirmed postal address, for the map. Never the street. */
  commune: Commune | null;
}

export interface LeadProfile extends Card {
  platform: string;
  url: string;
  pseudo: string;
  details: string[];
}

export type CommuneResolver = (zip: string | undefined, city: string | undefined) => Commune | undefined;

// Lists of the result screen, one per kind of finding (layout of the first prototype).
// Only confirmed and probable findings are listed.

interface Card {
  confidence: Confidence;
  sources: string[];
  path: string[];
}

export interface BreachCard extends Card {
  name: string;
  date: string | null;
  accounts: string | null;
  data: string[];
  passwordExposed: boolean;
  description: string | null;
  logo: string | null;
}

export interface InfectionCard extends Card {
  label: string;
  attributes: Attribute[];
}

export interface PageCard extends Card {
  title: string;
  url: string;
  site: string;
  excerpt: string | null;
}

export interface ProfileCard extends Card {
  platform: string;
  url: string;
  attributes: Attribute[];
}

export interface ArchiveCard extends Card {
  target: string;
  first: string | null;
  last: string | null;
  count: string | null;
  link: string | null;
  pages: string | null;
}

export interface Summary {
  /** Everything confirmed or probable shown in the lists. */
  linked: number;
  breaches: number;
  passwordBreaches: number;
  infections: number;
  pages: number;
  profiles: number;
  archives: number;
  /** Possible values and namesakes: counted only. */
  unconfirmed: number;
}

export interface Action {
  id: string;
  title: string;
  detail: string;
}

const attr = (f: Finding, ...labels: string[]) =>
  f.attributes.find((a) => labels.includes(a.label))?.value ?? null;

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

/** Fixed rules (T1: no AI), the most urgent first. */
function actionPlan(summary: Summary, profiles: ProfileCard[]): Action[] {
  const actions: Action[] = [];
  if (summary.infections > 0)
    actions.push({
      id: "infection",
      title: "Nettoie ton ordinateur",
      detail: "Un logiciel espion a volé des identifiants. Lance un antivirus complet, puis change tes mots de passe depuis un autre appareil sain.",
    });
  if (summary.passwordBreaches > 0)
    actions.push({
      id: "passwords",
      title: "Change tes mots de passe",
      detail: `Ton mot de passe a fuité dans ${summary.passwordBreaches} fuite(s). Change-le partout où tu l'as réutilisé et utilise un gestionnaire de mots de passe.`,
    });
  if (summary.breaches > 0)
    actions.push({
      id: "two-factor",
      title: "Active la double authentification",
      detail: "Sur ton email d'abord, puis sur tes comptes importants : un mot de passe volé ne suffit alors plus.",
    });
  if (summary.profiles > 0)
    actions.push({
      id: "profiles",
      title: "Vérifie la confidentialité de tes comptes",
      detail: `Comptes publics trouvés : ${[...new Set(profiles.map((p) => p.platform))].join(", ")}. Passe-les en privé ou retire ce que tu ne veux pas montrer.`,
    });
  if (summary.pages > 0)
    actions.push({
      id: "pages",
      title: "Demande le retrait des pages",
      detail: "Contacte le site qui publie l'information, puis demande à Google de retirer le résultat (formulaire « Supprimer des résultats »).",
    });
  if (summary.archives > 0)
    actions.push({
      id: "archives",
      title: "Pense aux archives",
      detail: "Une page supprimée reste lisible dans la Wayback Machine. Tu peux demander son retrait à Internet Archive.",
    });
  if (actions.length === 0)
    actions.push({
      id: "watch",
      title: "Surveille ton adresse",
      detail: "Rien de relié à toi n'a été trouvé. Inscris-toi aux alertes de Have I Been Pwned pour être prévenu d'une prochaine fuite.",
    });
  return actions;
}

export interface SourceReport {
  label: string;
  status: SourceStatus | "not_asked";
  records: number;
  /** Calls that failed (error, quota, unclear answer). */
  problems: number;
}

function report(label: string, runs: readonly SourceRun[]): SourceReport {
  const records = runs.reduce((sum, r) => sum + r.records, 0);
  const problems = runs.filter((r) => r.status === "error" || r.status === "quota" || r.status === "unknown").length;
  const has = (status: SourceStatus) => runs.some((r) => r.status === status);
  const status: SourceReport["status"] =
    runs.length === 0
      ? "not_asked"
      : records > 0
        ? "found"
        : has("quota")
          ? "quota"
          : has("error")
            ? "error"
            : runs.every((r) => r.status === "no_key")
              ? "no_key"
              : "not_found";
  return { label, status, records, problems };
}

/** "24.01.2023" or "2023-01" or "2023" gives a sortable "2023-01-24". */
function sortKey(date: string | null): string {
  if (!date) return "";
  const swiss = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(date);
  return swiss ? `${swiss[3]}-${swiss[2]}-${swiss[1]}` : date;
}

const TYPE_LABELS: Record<IdentifierType, string> = {
  EMAIL: "email",
  TEL: "téléphone",
  PSEUDO: "pseudo",
  NOM: "nom",
  PROFIL: "profil",
  DOMAINE: "domaine",
  IP: "IP",
  ORGA: "organisation",
};

export function toView(
  result: InvestigationResult,
  sources: readonly { id: string; label: string }[],
  resolve: CommuneResolver = resolveCommune,
): InvestigationView {
  const label = (id: string) => (id === "saisie" ? "saisie" : (sources.find((s) => s.id === id)?.label ?? id));
  const findings = [...result.fiche.values()];
  const rates = fillRate(result.fiche);

  const toValue = (f: Finding): ViewValue => {
    const best = f.sightings.find((s) => s.confidence === f.confidence) ?? f.sightings[0];
    return {
      value: f.value,
      masked: maskValue(f.field, f.value),
      confidence: f.confidence as ViewValue["confidence"],
      sources: [...new Set(f.sightings.map((s) => label(s.sourceId)))],
      path: (best?.path ?? []).map((step) => `${label(step.sourceId)} (${TYPE_LABELS[step.identifier.type]})`),
      attributes: f.attributes,
      thirdParty: f.thirdParty,
    };
  };

  const detailed = findings.filter((f) => isDetailed(f.confidence) && !f.thirdParty);
  const of = (field: FieldCode) => detailed.filter((f) => f.field === field);
  const card = (f: Finding): Card => {
    const v = toValue(f);
    return { confidence: f.confidence, sources: v.sources, path: v.path };
  };
  const unconfirmed = findings.filter((f) => !isDetailed(f.confidence) && !f.thirdParty);
  const pageOf = (f: Finding): PageCard => {
    const url = attr(f, "Adresse") ?? f.value;
    return { ...card(f), title: f.value, url, site: hostOf(url), excerpt: attr(f, "Extrait") };
  };
  const leads = {
    profiles: unconfirmed
      .filter((f) => f.field === "F2")
      .map((f) => ({
        ...card(f),
        platform: attr(f, "Service") ?? hostOf(f.value),
        url: f.value,
        pseudo: attr(f, "Pseudo") ?? "",
        details: f.attributes.filter((a) => a.label === "Détail").map((a) => a.value),
      })),
    pages: unconfirmed.filter((f) => f.field === "I1").map(pageOf),
  };
  // "Rue du Lac 12, 2000 Neuchâtel": the zip code and the locality give the commune.
  const place = of("B3")
    .map((f) => /\b(\d{4})\s+([^,]+)$/.exec(f.value))
    .find((m) => m !== null);
  const commune = place ? (resolve(place[1], place[2]) ?? null) : null;

  const toBreach = (f: Finding): BreachCard => {
    const data = (attr(f, "Données exposées") ?? "").split(", ").filter(Boolean);
    return {
      ...card(f),
      name: f.value,
      date: attr(f, "Date de la fuite", "Date", "Année"),
      accounts: attr(f, "Comptes touchés"),
      data,
      passwordExposed: data.some((d) => d.startsWith("mot")),
      description: attr(f, "Description (anglais)"),
      logo: attr(f, "Logo"),
    };
  };
  // Password breaches first, then the most recent (dates are dd.mm.yyyy or yyyy-mm).
  const byPriority = (a: BreachCard, b: BreachCard) =>
    Number(b.passwordExposed) - Number(a.passwordExposed) || sortKey(b.date).localeCompare(sortKey(a.date));
  const breaches = of("H1").map(toBreach).sort(byPriority);
  const leadBreaches = unconfirmed.filter((f) => f.field === "H1").map(toBreach).sort(byPriority);
  const infections = of("H5").map((f) => ({ ...card(f), label: f.value, attributes: f.attributes }));
  const pages = of("I1").map(pageOf);
  const profiles = of("F2").map((f) => ({
    ...card(f),
    platform: attr(f, "Service") ?? hostOf(f.value),
    url: f.value,
    attributes: f.attributes.filter((a) => a.label !== "Service"),
  }));
  const archives = of("I2").map((f) => ({
    ...card(f),
    target: f.value,
    first: attr(f, "Première capture"),
    last: attr(f, "Dernière capture"),
    count: attr(f, "Captures"),
    link: attr(f, "Archive"),
    pages: attr(f, "Pages archivées"),
  }));
  const summary: Summary = {
    linked: breaches.length + infections.length + pages.length + profiles.length + archives.length,
    breaches: breaches.length,
    passwordBreaches: breaches.filter((b) => b.passwordExposed).length,
    infections: infections.length,
    pages: pages.length,
    profiles: profiles.length,
    archives: archives.length,
    unconfirmed: findings.filter((f) => !isDetailed(f.confidence)).length,
  };

  return {
    summary,
    breaches,
    infections,
    pages,
    profiles,
    archives,
    actions: actionPlan(summary, profiles),
    leads: { ...leads, breaches: leadBreaches },
    commune,
    categories: CATEGORIES.map((category) => {
      const rate = rates.find((r) => r.category === category.code);
      const fields = FIELDS.filter((field) => field.category === category.code)
        .map((field) => {
          const own = findings.filter((f) => f.field === field.code);
          return {
            code: field.code,
            label: field.label,
            values: own.filter((f) => isDetailed(f.confidence)).map(toValue),
            hiddenCount: own.filter((f) => !isDetailed(f.confidence)).length,
          };
        })
        .filter((field) => field.values.length > 0 || field.hiddenCount > 0);
      return { code: category.code, label: category.label, filled: rate?.filled ?? 0, total: rate?.total ?? 0, fields };
    }),
    services: [...new Set(result.runs.filter((r) => r.status !== "no_key").map((r) => label(r.sourceId)))],
    sourceReport: sources.map((s) => report(s.label, result.runs.filter((r) => r.sourceId === s.id))),
  };
}
