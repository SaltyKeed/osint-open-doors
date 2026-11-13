import "server-only";
import { queryKinds } from "@/server/domain/search-query";
import type { Exposure, SearchQuery } from "@/server/domain/types";
import type { BreachProvider } from "@/server/providers/types";
import { ignoredFields } from "./field-paths";

/** The dev console exists only under `npm run dev`, never in a production build (D18). */
export function isDevConsoleEnabled(): boolean {
  return process.env.NODE_ENV === "development";
}

export interface ProviderReport {
  id: string;
  status: "ok" | "error" | "skipped";
  durationMs: number;
  message: string | null;
  exposures: Exposure[];
  raw: unknown;
  ignoredFields: string[];
}

export async function inspectProviders(
  query: SearchQuery,
  providers: readonly BreachProvider[],
  timeoutMs = 8000,
): Promise<ProviderReport[]> {
  const kinds = queryKinds(query);
  return Promise.all(
    providers.map(async (provider): Promise<ProviderReport> => {
      const empty = { exposures: [], raw: null, ignoredFields: [] };
      if (!provider.supports.some((kind) => kinds.includes(kind))) {
        const message = `Accepte seulement : ${provider.supports.join(", ")}`;
        return { id: provider.id, status: "skipped", durationMs: 0, message, ...empty };
      }
      const start = performance.now();
      try {
        const { raw, parsed, exposures } = await provider.inspect(query, AbortSignal.timeout(timeoutMs));
        const durationMs = Math.round(performance.now() - start);
        const message = raw === null ? "Rien trouvé (API non appelée ou 404)" : null;
        return { id: provider.id, status: "ok", durationMs, message, exposures, raw, ignoredFields: ignoredFields(raw, parsed) };
      } catch (error) {
        const durationMs = Math.round(performance.now() - start);
        const message = error instanceof Error ? `${error.name}: ${error.message}` : "Erreur inconnue";
        return { id: provider.id, status: "error", durationMs, message, ...empty };
      }
    }),
  );
}
