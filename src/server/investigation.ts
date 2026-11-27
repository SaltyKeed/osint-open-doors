import "server-only";
import { assessConfidence, capAt, MAX_HOMONYMS, shouldRebound, type Confidence } from "@/server/domain/confidence";
import { countHints, isCommonPseudo, isConfirmedName, isLinkedToConfirmed } from "@/server/domain/evidence";
import { findingKey, mergeFindings, type Finding } from "@/server/domain/finding";
import { identifierKey, normalizeIdentifier, type Identifier } from "@/server/domain/identifier";
import { isRarePseudo } from "@/server/domain/pseudo";
import { SourceQuotaError, type Source, type SourceRecord } from "@/server/domain/source";

/** What the engine tells the screen while it works (T4). */
export type InvestigationEvent =
  /** A confirmed, probable or to confirm finding, new or updated (more sources, shorter path...). */
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
  /** Identifiers a previous round already searched (T9): they are never given to the sources again. */
  alreadySearched?: readonly Identifier[];
  /** Among them, the ones the first round confirmed (T10): they link a record to the visitor, as an input does. */
  alreadyConfirmed?: readonly Identifier[];
}

export async function* investigate(
  inputs: readonly Identifier[],
  sources: readonly Source[],
  { signal, callTimeoutMs = 8000, alreadySearched = [], alreadyConfirmed = [] }: InvestigationOptions,
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
  let cardCount = 0;

  function enqueue(identifier: Identifier, confidence: Confidence, path: Identifier[]): boolean {
    const key = identifierKey(identifier);
    if (queued.has(key)) return false;
    queued.add(key);
    queue.push({ identifier, confidence, path: [...path, identifier] });
    return true;
  }

  // Marked as queued without being in the queue: they stay out even if a source finds them again.
  for (const identifier of alreadySearched) queued.add(identifierKey(identifier));

  for (const identifier of alreadyConfirmed) confirmedKeys.add(identifierKey(identifier));

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
    // The name listed for a phone line may be a parent's: it stays A1 only when it is the visitor's (T13).
    // Otherwise it is split off as a relative's name (J1), in a record of its own.
    const holder = record.fields.find((f) => f.field === "A1" && f.holder === true);
    if (holder && !isConfirmedName(holder.value, confirmedValues)) {
      const relative: SourceRecord = {
        about: "relative",
        fields: [{ field: "J1", value: holder.value }],
        identifiers: [],
      };
      yield* handleRecord({ ...record, fields: record.fields.filter((f) => f !== holder) }, source, item, commonPseudo);
      yield* handleRecord(relative, source, item, commonPseudo);
      return;
    }
    // A directory record found by a name (T13): its own hints prove nothing. If its address is one we already
    // confirmed (by phone), it is the visitor's own entry; otherwise the visitor decides, up to MAX_HOMONYMS.
    const isDirectory = record.homonyms !== undefined;
    const ownEntry =
      isDirectory && record.fields.some((f) => f.field === "B3" && confirmedValues.has(findingKey(f.field, f.value)));
    const assessed = ownEntry ? "confirmed" : assessConfidence({
      queried: { type: queried.type, confidence: item.confidence },
      linkedToConfirmed: isLinkedToConfirmed(record, confirmedKeys),
      rarePseudo: queried.type === "PSEUDO" && isRarePseudo(queried.value) && !commonPseudo,
      existenceCheck: source.sitesChecked !== undefined,
      coherentHints: isDirectory ? 0 : countHints(record, confirmedValues),
      fewHomonyms: record.homonyms !== undefined && record.homonyms <= MAX_HOMONYMS,
    });
    // A bio cites other people as well as the owner: what it mentions is never surer than probable (T10).
    const confidence = record.mentioned ? capAt(assessed, "probable") : assessed;
    if (confidence === "possible" || confidence === "namesake") {
      // With many homonyms the source gives the total: it is counted, no address is kept (T13).
      hidden[confidence] += record.homonyms !== undefined && record.homonyms > MAX_HOMONYMS ? record.homonyms : 1;
      return;
    }
    const aboutVisitor = record.about === "subject";
    // An account to confirm sends only its address (F2): the name and photo of a stranger never become a
    // finding of their own, they travel inside the F2 details (T10). Only a directory card sends all its fields.
    const fields =
      confidence === "to_confirm" && !isDirectory ? record.fields.filter((f) => f.field === "F2") : record.fields;
    // The findings of one card to confirm share a key: the visitor confirms them together (T13). An account is
    // identified by its address; a directory entry gets a number, because two homonyms can share name and city.
    const first = fields[0];
    const card =
      confidence === "to_confirm" && first
        ? isDirectory
          ? `${findingKey(first.field, first.value)}#${++cardCount}`
          : findingKey(first.field, first.value)
        : undefined;

    for (const field of fields) {
      const key = findingKey(field.field, field.value);
      const incoming: Finding = {
        field: field.field,
        value: field.value,
        sources: [source.id],
        confidence,
        path: item.path,
        ...(field.breach && { breach: field.breach }),
        ...(field.infection && { infection: field.infection }),
        ...(field.page && { page: field.page }),
        ...(field.profile && { profile: field.profile }),
        ...(card && { card }),
      };
      // Two homonyms often share a name and a city: each directory card keeps its own findings (T13). An
      // account keeps the plain slot, so that the same address found twice is merged and keeps the surer level.
      const slot = isDirectory && card ? `${card}|${key}` : key;
      const existing = findings.get(slot);
      const [merged] = mergeFindings(existing ? [existing, incoming] : [incoming]);
      findings.set(slot, merged!);
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
