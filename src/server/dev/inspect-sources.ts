import "server-only";
import type { Identifier, IdentifierType } from "@/server/domain/identifier";
import type { Source, SourceRecord } from "@/server/domain/source";
import { ignoredFields } from "./field-paths";

/** The dev console exists only under `npm run dev`, never in a production build (D18). */
export function isDevConsoleEnabled(): boolean {
  return process.env.NODE_ENV === "development";
}

export interface SourceReport {
  id: string;
  /** Type of the identifier given to the source, null when the source was skipped. */
  input: IdentifierType | null;
  status: "ok" | "error" | "skipped";
  durationMs: number;
  message: string | null;
  records: SourceRecord[];
  raw: unknown;
  ignoredFields: string[];
}

const empty = { records: [], raw: null, ignoredFields: [] };

async function inspectOne(source: Source, input: Identifier, timeoutMs: number): Promise<SourceReport> {
  const start = performance.now();
  try {
    const { raw, parsed, records } = await source.inspect(input, AbortSignal.timeout(timeoutMs));
    const durationMs = Math.round(performance.now() - start);
    const message = raw === null ? "Rien trouvé (API non appelée ou 404)" : null;
    return { id: source.id, input: input.type, status: "ok", durationMs, message, records, raw, ignoredFields: ignoredFields(raw, parsed) };
  } catch (error) {
    const durationMs = Math.round(performance.now() - start);
    const message = error instanceof Error ? `${error.name}: ${error.message}` : "Erreur inconnue";
    return { id: source.id, input: input.type, status: "error", durationMs, message, ...empty };
  }
}

/** One report per source and accepted identifier; one "skipped" report for a source that accepts none. */
export async function inspectSources(
  identifiers: readonly Identifier[],
  sources: readonly Source[],
  timeoutMs = 8000,
): Promise<SourceReport[]> {
  const reports = sources.flatMap((source) => {
    const accepted = identifiers.filter((input) => source.accepts.includes(input.type));
    if (accepted.length === 0) {
      const message = `Accepte seulement : ${source.accepts.join(", ")}`;
      const skipped: SourceReport = { id: source.id, input: null, status: "skipped", durationMs: 0, message, ...empty };
      return [Promise.resolve(skipped)];
    }
    return accepted.map((input) => inspectOne(source, input, timeoutMs));
  });
  return Promise.all(reports);
}
