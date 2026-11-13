import "server-only";
import type { AppMode } from "@/server/env";
import type { BreachProvider } from "./types";
import { xposedOrNot } from "./xposedornot";

export const SURFACE_PROVIDERS: readonly BreachProvider[] = [xposedOrNot];

// Paid sources, enabled only in deep mode once the budget is accepted (D10, D12).
export const DEEP_PROVIDERS: readonly BreachProvider[] = [];

// The mode decides, not the presence of an API key (D10).
export function getProviders(mode: AppMode): readonly BreachProvider[] {
  return mode === "deep" ? [...SURFACE_PROVIDERS, ...DEEP_PROVIDERS] : SURFACE_PROVIDERS;
}
