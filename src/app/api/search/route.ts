import { queryIdentifiers, searchRequestSchema } from "@/server/domain/search-query";
import { SOURCES } from "@/server/providers/registry";
import { searchAll } from "@/server/search-service";

// The answer contains personal data: no browser or proxy may keep a copy.
const NO_STORE = { "Cache-Control": "no-store" };

function invalidRequest(): Response {
  // Fixed body: the visitor's input is never sent back.
  return Response.json({ error: "invalid_request" }, { status: 400, headers: NO_STORE });
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

  const result = await searchAll(queryIdentifiers(query.data), SOURCES);
  return Response.json(result, { headers: NO_STORE });
}
