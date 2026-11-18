import "server-only";
import { assessConfidence, shouldRebound, type Confidence } from "@/server/domain/confidence";
import { countHints, isCommonPseudo, isLinkedToConfirmed } from "@/server/domain/evidence";
import { findingKey, mergeFindings, type Finding } from "@/server/domain/finding";
import { identifierKey, normalizeIdentifier, type Identifier } from "@/server/domain/identifier";
import { isRarePseudo } from "@/server/domain/pseudo";
import { SourceQuotaError, type Source, type SourceRecord } from "@/server/domain/source";

/** What the engine tells the screen while it works (T4). */
export type InvestigationEvent =
  /** A confirmed or probable finding, new or updated (more sources, shorter path...). */
  | { type: "finding"; finding: Finding }
  /** A new identifier that will be searched. */
  | { type: "lead"; identifier: Identifier; confidence: Confidence; path: Identifier[] }
  | { type: "source-failed"; source: string; reason: "error" | "quota" }
  /** Last event. Possible and namesake records are only counted (invariant on namesakes). */
  | { type: "done"; hidden: { possible: number; namesake: number } };

interface QueueItem {
  identifier: Identifier;
  confidence: Confidence;
  /** From the visitor's input to this identifier, included. */
  path: Identifier[];
}

export interface InvestigationOptions {
  /** Aborted when the visitor leaves: the engine stops. */
  signal: AbortSignal;
  callTimeoutMs?: number;
}

export async function* investigate(
  inputs: readonly Identifier[],
  sources: readonly Source[],
  { signal, callTimeoutMs = 8000 }: InvestigationOptions,
): AsyncGenerator<InvestigationEvent> {
  const queue: QueueItem[] = [];
  /** Identifiers already queued, so that each one is searched once. */
  const queued = new Set<string>();
  /** EMAIL, TEL, PROFIL... that belong to the visitor. */
  const confirmedKeys = new Set<string>();
  /** findingKey of confirmed findings, compared to find coherent hints. */
  const confirmedValues = new Set<string>();
  const findings = new Map<string, Finding>();
  const quotaReached = new Set<string>();
  /** Calls made to each source, for sources with maxCallsPerInvestigation. */
  const calls = new Map<string, number>();
  const hidden = { possible: 0, namesake: 0 };

  function enqueue(identifier: Identifier, confidence: Confidence, path: Identifier[]): boolean {
    const key = identifierKey(identifier);
    if (queued.has(key)) return false;
    queued.add(key);
    queue.push({ identifier, confidence, path: [...path, identifier] });
    return true;
  }

  // The visitor certified the inputs: they are confirmed, and the name is a confirmed A1.
  for (const input of inputs) {
    confirmedKeys.add(identifierKey(input));
    if (input.type === "NOM") confirmedValues.add(findingKey("A1", input.value));
    enqueue(input, "confirmed", []);
  }

  for (let item = queue.shift(); item && !signal.aborted; item = queue.shift()) {
    const active = sources.filter(
      (s) =>
        s.accepts.includes(item.identifier.type) &&
        !quotaReached.has(s.id) &&
        (calls.get(s.id) ?? 0) < (s.maxCallsPerInvestigation ?? Infinity),
    );
    for (const s of active) calls.set(s.id, (calls.get(s.id) ?? 0) + 1);
    const settled = await Promise.allSettled(
      active.map((s) =>
        s.investigate(item.identifier, AbortSignal.any([signal, AbortSignal.timeout(s.callTimeoutMs ?? callTimeoutMs)])),
      ),
    );
    // The visitor left during the calls: nothing more to send.
    if (signal.aborted) return;

    for (const [i, outcome] of settled.entries()) {
      const source = active[i]!;
      if (outcome.status === "rejected") {
        const reason = outcome.reason instanceof SourceQuotaError ? "quota" : "error";
        if (reason === "quota") quotaReached.add(source.id);
        // Source id and reason only: an error message could contain the visitor's input.
        console.error(`[investigation] source failed: ${source.id} (${reason})`);
        yield { type: "source-failed", source: source.id, reason };
        continue;
      }
      const records = outcome.value;
      const commonPseudo = item.identifier.type === "PSEUDO" && isCommonPseudo(records.length, source.sitesChecked);
      for (const record of records) {
        yield* handleRecord(record, source, item, commonPseudo);
      }
    }
  }
  if (!signal.aborted) yield { type: "done", hidden };

  function* handleRecord(
    record: SourceRecord,
    source: Source,
    item: QueueItem,
    commonPseudo: boolean,
  ): Generator<InvestigationEvent> {
    const { identifier: queried } = item;
    const confidence = assessConfidence({
      queried: { type: queried.type, confidence: item.confidence },
      linkedToConfirmed: isLinkedToConfirmed(record, confirmedKeys),
      rarePseudo: queried.type === "PSEUDO" && isRarePseudo(queried.value) && !commonPseudo,
      // A source with a list of sites only checks that the account exists (T7).
      existenceCheck: source.sitesChecked !== undefined,
      coherentHints: countHints(record, confirmedValues),
    });
    if (confidence === "possible" || confidence === "namesake") {
      hidden[confidence] += 1;
      return;
    }
    const aboutVisitor = record.about === "subject";

    for (const field of record.fields) {
      const key = findingKey(field.field, field.value);
      const incoming: Finding = {
        field: field.field,
        value: field.value,
        sources: [source.id],
        confidence,
        path: item.path,
        ...(field.breach && { breach: field.breach }),
      };
      const existing = findings.get(key);
      const [merged] = mergeFindings(existing ? [existing, incoming] : [incoming]);
      findings.set(key, merged!);
      if (confidence === "confirmed" && aboutVisitor) confirmedValues.add(key);
      // Send only what changed: a second source with nothing new stays silent.
      if (JSON.stringify(existing) !== JSON.stringify(merged)) yield { type: "finding", finding: merged! };
    }

    for (const raw of record.identifiers) {
      // Sources return raw values: an invalid one never enters the queue.
      const identifier = normalizeIdentifier(raw.type, raw.value);
      if (!identifier) continue;
      if (confidence === "confirmed" && aboutVisitor) confirmedKeys.add(identifierKey(identifier));
      const lead = { identifier, confidence, about: record.about, foundFrom: item.confidence };
      if (shouldRebound(lead) && enqueue(identifier, confidence, item.path)) {
        yield { type: "lead", identifier, confidence, path: item.path };
      }
    }
  }
}
