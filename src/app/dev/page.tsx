import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isDevConsoleEnabled } from "@/server/dev/inspect-providers";
import { loadEnv } from "@/server/env";
import { getProviders, SURFACE_PROVIDERS } from "@/server/providers/registry";
import { DevConsole } from "./dev-console";

export const metadata: Metadata = { title: "Console de test des providers" };

// Dev console (D18): 404 in a production build, so it never reaches the kiosk.
export default function DevPage() {
  if (!isDevConsoleEnabled()) notFound();
  const providers = getProviders("deep").map((p) => ({
    id: p.id,
    supports: [...p.supports],
    mode: SURFACE_PROVIDERS.includes(p) ? ("surface" as const) : ("deep" as const),
  }));
  return <DevConsole providers={providers} appMode={loadEnv().APP_MODE} />;
}
