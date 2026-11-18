import { investigationInputSchema, toInitialLeads } from "@/server/domain/investigation-input";
import { enrichBreaches, loadCatalogue } from "@/server/investigation/breaches";
import { investigate } from "@/server/investigation/engine";
import { toView } from "@/server/investigation/view";
import { SOURCES } from "@/server/sources";

// The answer contains personal data: no browser or proxy may keep a copy.
const NO_STORE = { "Cache-Control": "no-store" };

// POST, not GET: the visitor's data stays in the body, never in the URL.
export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const input = investigationInputSchema.safeParse(body);
  // Fixed body: the visitor's input is never sent back.
  if (!input.success) return Response.json({ error: "invalid_request" }, { status: 400, headers: NO_STORE });

  const { leads, context } = toInitialLeads(input.data);
  const [result, catalogue] = await Promise.all([
    investigate(leads, context, SOURCES, { env: process.env, signal: request.signal }),
    loadCatalogue(request.signal),
  ]);
  const fiche = enrichBreaches(result.fiche, catalogue);
  return Response.json(toView({ ...result, fiche }, SOURCES), { headers: NO_STORE });
}
