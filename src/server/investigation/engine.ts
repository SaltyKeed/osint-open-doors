import "server-only";
import { assessConfidence, isDetailed } from "@/server/domain/confidence";
import { addSighting, type Fiche, type FoundValue } from "@/server/domain/fiche";
import type { FieldCode } from "@/server/domain/fiche-fields";
import { countHints, type Candidate, type Reference } from "@/server/domain/hints";
import {
  fold,
  identifierKey,
  nameKey,
  UNIQUE_TYPES,
  type IdentifierType,
} from "@/server/domain/identifier";
import type { InvestigationContext } from "@/server/domain/investigation-input";
import { canPivot, childLead, type Lead } from "@/server/domain/lead";
import { isRarePseudo } from "@/server/domain/rare-pseudo";
import type { Source, SourceRecord, SourceResult, SourceStatus } from "@/server/domain/source";

// The investigation loop of CADRAGE.md, section 7: take an identifier, ask every
// source that accepts its type, rate what comes back, queue the new reliable
// identifiers, stop when nothing new and reliable appears.

export interface SourceRun {
  sourceId: string;
  identifierType: IdentifierType;
  status: SourceStatus;
  records: number;
}

export interface InvestigationResult {
  fiche: Fiche;
  runs: SourceRun[];
}

export interface InvestigateOptions {
  env: Readonly<Record<string, string | undefined>>;
  signal?: AbortSignal;
  /** Per call: a slow source is cut and marked "error", the others go on. */
  timeoutMs?: number;
  /** Whole investigation: after it, no new identifier is queried and the fiche is returned. */
  deadlineMs?: number;
}

/** Where the volunteer's own input goes in the fiche. */
const INPUT_FIELD: Partial<Record<IdentifierType, FieldCode>> = { EMAIL: "B1", TEL: "B2", PSEUDO: "F1", NOM: "A1" };

async function runSafely(source: Source, lead: Lead, options: InvestigateOptions): Promise<SourceResult> {
  const timeout = AbortSignal.timeout(source.timeoutMs ?? options.timeoutMs ?? 15_000);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
  try {
    return await source.run(lead.identifier, { signal, env: options.env });
  } catch (error) {
    // Error messages of the sources are fixed ("github: HTTP 429"): no input inside.
    const quota = error instanceof Error && error.message.includes("HTTP 429");
    return { status: quota ? "quota" : "error", records: [] };
  }
}

function reference(fiche: Fiche, context: InvestigationContext): Reference {
  const detailed = [...fiche.values()].filter((f) => isDetailed(f.confidence) && !f.thirdParty);
  const values = (field: FieldCode) => detailed.filter((f) => f.field === field).map((f) => f.value);
  return {
    nameKeys: new Set(values("A1").map(nameKey)),
    cities: new Set([...values("C1"), ...(context.locality ? [context.locality] : [])].map(fold)),
    birthYear: context.birthYear,
    photoUrls: new Set(values("A5")),
  };
}

function candidate(record: SourceRecord): Candidate {
  const own = record.values.filter((v) => !v.thirdParty);
  const values = (field: FieldCode) => own.filter((v) => v.field === field).map((v) => v.value);
  const year = values("A2").map((v) => /\b(19|20)\d{2}\b/.exec(v)?.[0]).find(Boolean);
  return { names: values("A1"), cities: values("C1"), birthYear: year ? Number(year) : null, photoUrls: values("A5") };
}

export async function investigate(
  leads: readonly Lead[],
  context: InvestigationContext,
  sources: readonly Source[],
  options: InvestigateOptions,
): Promise<InvestigationResult> {
  const fiche: Fiche = new Map();
  const runs: SourceRun[] = [];
  const seen = new Set<string>();
  const confirmed = new Set<string>();

  for (const lead of leads) {
    confirmed.add(identifierKey(lead.identifier));
    const field = INPUT_FIELD[lead.identifier.type];
    const value: FoundValue | null = field ? { field, value: lead.identifier.value } : null;
    if (value) {
      addSighting(fiche, value, { sourceId: "saisie", origin: "saisie", evidence: null, confidence: "confirme", path: lead.path });
    }
  }

  const until = Date.now() + (options.deadlineMs ?? Number.POSITIVE_INFINITY);
  const queue = [...leads];
  for (let lead = queue.shift(); lead; lead = queue.shift()) {
    if (Date.now() > until) break;
    const key = identifierKey(lead.identifier);
    if (seen.has(key) || !canPivot(lead)) continue;
    seen.add(key);
    if (options.signal?.aborted) break;

    const current = lead;
    const applicable = sources.filter((s) => s.accepts.includes(current.identifier.type));
    const results = await Promise.all(
      applicable.map(async (source) => {
        if (source.requiredEnv.some((name) => !options.env[name])) {
          return { source, result: { status: "no_key", records: [] } as SourceResult };
        }
        return { source, result: await runSafely(source, current, options) };
      }),
    );

    for (const { source, result } of results) {
      runs.push({ sourceId: source.id, identifierType: current.identifier.type, status: result.status, records: result.records.length });
      for (const record of result.records) {
        const confidence = assessConfidence({
          queried: { type: current.identifier.type, confidence: current.confidence },
          linksToConfirmed: record.identifiers.some(
            (i) => !i.thirdParty && UNIQUE_TYPES.has(i.identifier.type) && confirmed.has(identifierKey(i.identifier)),
          ),
          rarePseudo: current.identifier.type === "PSEUDO" && isRarePseudo(current.identifier.value),
          hints: countHints(candidate(record), reference(fiche, context)),
        });
        const sighting = { sourceId: source.id, origin: record.origin, evidence: record.evidence, confidence, path: current.path };
        for (const value of record.values) addSighting(fiche, value, sighting);
        for (const { identifier, thirdParty = false } of record.identifiers) {
          const child = childLead(current, source.id, identifier, confidence, thirdParty);
          if (confidence === "confirme" && !thirdParty) confirmed.add(identifierKey(identifier));
          if (canPivot(child) && !seen.has(identifierKey(identifier))) queue.push(child);
        }
      }
    }
  }
  return { fiche, runs };
}
