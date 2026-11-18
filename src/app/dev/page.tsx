import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isDevConsoleEnabled } from "@/server/dev/inspect-sources";
import { SOURCES } from "@/server/providers/registry";
import { DevConsole } from "./dev-console";

export const metadata: Metadata = { title: "Console de test des sources" };

// Dev console (D18): 404 in a production build, so it never reaches the kiosk.
export default function DevPage() {
  if (!isDevConsoleEnabled()) notFound();
  const sources = SOURCES.map((s) => ({ id: s.id, accepts: [...s.accepts] }));
  return <DevConsole sources={sources} />;
}
