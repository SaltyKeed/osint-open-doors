import "server-only";
import type { AppMode } from "@/server/env";
import type { BreachProvider } from "./types";
import { xposedOrNot } from "./xposedornot";

// Adding a provider = one folder in providers/ and one line here.
const ALL_PROVIDERS: readonly BreachProvider[] = [xposedOrNot];

// The mode decides, not the presence of a key (D10, rule 2).
export function getActiveProviders(mode: AppMode): BreachProvider[] {
  return ALL_PROVIDERS.filter((p) => mode === "deep" || p.tier === "surface");
}
