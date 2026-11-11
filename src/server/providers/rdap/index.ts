import "server-only";
import { z } from "zod";
import { providerFetch } from "../http";
import { type BreachProvider, ProviderError } from "../types";

const PROVIDER_ID = "rdap";

// Shared mailbox providers: their domain says nothing about the visitor.
const SHARED_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "hotmail.com", "hotmail.fr", "hotmail.ch", "outlook.com",
  "outlook.fr", "live.com", "live.fr", "msn.com", "yahoo.com", "yahoo.fr", "icloud.com",
  "me.com", "mac.com", "proton.me", "protonmail.com", "protonmail.ch", "gmx.ch", "gmx.net",
  "gmx.de", "gmx.fr", "bluewin.ch", "sunrise.ch", "hispeed.ch", "netplus.ch", "romandie.com",
  "orange.fr", "free.fr", "laposte.net", "aol.com", "yandex.com", "mail.com", "tutanota.com",
  "example.com", "example.org", "example.net",
]);

const rdapSchema = z.object({
  events: z.array(z.object({ eventAction: z.string(), eventDate: z.string() })).optional(),
  entities: z
    .array(z.object({ roles: z.array(z.string()).optional(), vcardArray: z.tuple([z.string(), z.array(z.array(z.unknown()))]).optional() }))
    .optional(),
});

function registrantNameIsPublic(data: z.infer<typeof rdapSchema>): boolean {
  const registrant = data.entities?.find((e) => e.roles?.includes("registrant"));
  const fn = registrant?.vcardArray?.[1].find((field) => field[0] === "fn")?.[3];
  return typeof fn === "string" && fn.trim() !== "" && !/redact|privacy|private/i.test(fn);
}

// A personal domain (jean-dupont.ch) is public and often linked to its owner.
export const rdap: BreachProvider = {
  id: PROVIDER_ID,
  tier: "surface",
  supports: ["email"],
  async search(query, signal) {
    const domain = query.email?.split("@")[1]?.toLowerCase();
    if (!domain || SHARED_DOMAINS.has(domain)) return [];

    const response = await providerFetch(PROVIDER_ID, `https://rdap.org/domain/${domain}`, signal, {}, [404]);
    if (response.status === 404) return [];
    const parsed = rdapSchema.safeParse(await response.json());
    if (!parsed.success) throw new ProviderError(PROVIDER_ID, "invalid-response");

    const registered = parsed.data.events?.find((e) => e.eventAction === "registration")?.eventDate.slice(0, 4);
    const nameIsPublic = registrantNameIsPublic(parsed.data);
    return [
      {
        kind: "account",
        providerId: PROVIDER_ID,
        service: "Nom de domaine",
        summary:
          `Ton adresse utilise le domaine ${domain}${registered ? `, enregistré en ${registered}` : ""}. ` +
          (nameIsPublic
            ? "Le nom du titulaire est visible dans le registre public."
            : "Le titulaire est masqué dans le registre public, mais le domaine peut mener à un site."),
        categories: nameIsPublic ? ["name"] : [],
        matchedOn: "email",
      },
    ];
  },
};
