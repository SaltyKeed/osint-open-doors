import { z } from "zod";
import { buildActionPlan } from "@/server/domain/actions";
import { maskEmail, maskName, maskPhone } from "@/server/domain/masking";
import { normalizePhone } from "@/server/domain/phone";
import { getEnv } from "@/server/env";
import { getActiveProviders } from "@/server/providers/registry";
import { enrichWithArchive } from "@/server/providers/wayback";
import { runSearch } from "@/server/search-service";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? undefined : value))
    .optional();

// Visitor input: validated once here, trusted afterwards ("parse, don't validate").
const inputSchema = z
  .object({
    email: optionalText(254).pipe(z.email().optional()),
    phone: optionalText(30),
    firstName: optionalText(80),
    lastName: optionalText(80),
    consent: z.literal(true),
  })
  .transform((input, ctx) => {
    const phone = input.phone ? normalizePhone(input.phone) : undefined;
    if (phone === null) {
      ctx.addIssue({ code: "custom", path: ["phone"], message: "invalid" });
      return z.NEVER;
    }
    // A name is only searched with both first and last name.
    const hasName = Boolean(input.firstName && input.lastName);
    return {
      email: input.email,
      phone,
      firstName: hasName ? input.firstName : undefined,
      lastName: hasName ? input.lastName : undefined,
    };
  })
  .refine((q) => q.email || q.phone || q.firstName, { message: "empty" });

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
    // Only the names of the invalid fields, never their values.
    const fields = [...new Set(input.error.issues.map((i) => String(i.path[0] ?? "form")))];
    return Response.json({ error: "invalid-input", fields }, { status: 400 });
  }

  const query = input.data;
  const { APP_MODE } = getEnv();
  const { findings, failedProviders } = await runSearch(
    query,
    getActiveProviders(APP_MODE),
    12000,
    enrichWithArchive,
    10000,
  );

  return Response.json(
    {
      mode: APP_MODE,
      searched: {
        email: query.email ? maskEmail(query.email) : undefined,
        phone: query.phone ? maskPhone(query.phone) : undefined,
        name: query.firstName && query.lastName ? maskName(query.firstName, query.lastName) : undefined,
      },
      findings,
      actions: buildActionPlan(findings),
      failedProviders,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
