import { z } from "zod";
import { buildActionPlan } from "@/server/domain/actions";
import { maskEmail } from "@/server/domain/masking";
import { getEnv } from "@/server/env";
import { getActiveProviders } from "@/server/providers/registry";
import { runSearch } from "@/server/search-service";

// Visitor input: validated once here, trusted afterwards ("parse, don't validate").
const inputSchema = z.object({
  email: z.email().max(254),
  consent: z.literal(true),
});

// POST only: personal data never appears in the URL (CLAUDE.md invariant).
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid-body" }, { status: 400 });
  }

  const input = inputSchema.safeParse(body);
  if (!input.success) {
    // No detail: the error must not echo the visitor's input.
    return Response.json({ error: "invalid-input" }, { status: 400 });
  }

  const { APP_MODE } = getEnv();
  const { exposures, failedProviders } = await runSearch(
    { email: input.data.email },
    getActiveProviders(APP_MODE),
  );

  return Response.json(
    {
      mode: APP_MODE,
      maskedEmail: maskEmail(input.data.email),
      exposures,
      actions: buildActionPlan(exposures),
      failedProviders,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
