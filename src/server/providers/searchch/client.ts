import "server-only";
import { fetchText } from "@/server/providers/http";

const API_URL = "https://search.ch/tel/api/";

/** At most 3 entries read: more homonyms than that are only counted (T13). */
const MAX_ENTRIES = 3;

/**
 * One request. A phone is searched as written (`+41...`); a name is searched among private persons only.
 * The address holds the key and the visitor's input: it is never put in a message.
 */
export function lookup(what: string, kind: "TEL" | "NOM", key: string, signal: AbortSignal): Promise<string | null> {
  const params = new URLSearchParams({ was: what, key, lang: "fr", maxnum: String(MAX_ENTRIES) });
  if (kind === "NOM") {
    params.set("privat", "1");
    params.set("firma", "0");
  }
  return fetchText("searchch", `${API_URL}?${params}`, signal);
}
