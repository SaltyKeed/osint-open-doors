import { queryIdentifiers, searchRequestSchema } from "@/server/domain/search-query";
import { investigate, type InvestigationEvent } from "@/server/investigation";
import { SOURCES } from "@/server/providers/registry";

// The answer contains personal data: no browser or proxy may keep a copy.
const NO_STORE = { "Cache-Control": "no-store" };

const encoder = new TextEncoder();

function invalidRequest(): Response {
  // Fixed body: the visitor's input is never sent back.
  return Response.json({ error: "invalid_request" }, { status: 400, headers: NO_STORE });
}

/** One JSON event per line (NDJSON), sent as soon as the engine yields it (T4). */
function toNdjson(events: AsyncGenerator<InvestigationEvent>): ReadableStream<Uint8Array> {
  return new ReadableStream({
    async pull(controller) {
      const { value, done } = await events.next();
      if (done) controller.close();
      else controller.enqueue(encoder.encode(`${JSON.stringify(value)}\n`));
    },
    // The browser closed the connection: stop the engine.
    async cancel() {
      await events.return(undefined);
    },
  });
}

// POST, not GET: the visitor's data stays in the body, never in the URL.
export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return invalidRequest();
  }
  const query = searchRequestSchema.safeParse(body);
  if (!query.success) return invalidRequest();

  // request.signal is aborted when the visitor leaves the page.
  const events = investigate(queryIdentifiers(query.data), SOURCES, { signal: request.signal });
  return new Response(toNdjson(events), {
    headers: { ...NO_STORE, "Content-Type": "application/x-ndjson" },
  });
}
