import { z } from "zod";
import { inspectSources, isDevConsoleEnabled } from "@/server/dev/inspect-sources";
import { queryIdentifiers, searchRequestSchema } from "@/server/domain/search-query";
import { SOURCES } from "@/server/providers/registry";

const NO_STORE = { "Cache-Control": "no-store" };
const sourceIdsSchema = z.object({ sources: z.array(z.string()).min(1) });

// Dev console only (D18): shows raw source responses, so it must never run in production.
export async function POST(request: Request): Promise<Response> {
  if (!isDevConsoleEnabled()) return new Response(null, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400, headers: NO_STORE });
  }
  const query = searchRequestSchema.safeParse(body);
  const ids = sourceIdsSchema.safeParse(body);
  if (!query.success || !ids.success) {
    // Dev only: the field names help to fix the form; values are never echoed.
    const fields = [...(query.error?.issues ?? []), ...(ids.error?.issues ?? [])].map((i) => i.path.join(".") || i.message);
    return Response.json({ error: "invalid_request", fields }, { status: 400, headers: NO_STORE });
  }

  const selected = SOURCES.filter((s) => ids.data.sources.includes(s.id));
  const reports = await inspectSources(queryIdentifiers(query.data), selected);
  return Response.json({ query: query.data, reports }, { headers: NO_STORE });
}
