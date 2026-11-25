import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isDevConsoleEnabled } from "@/server/dev/inspect-sources";
import { SOURCES } from "@/server/providers/registry";
import { DevConsole } from "./dev-console";
import { InvestigationConsole } from "./investigation-console";

export const metadata: Metadata = { title: "Console de test des sources" };

// Dev console (D18): 404 in a production build, so it never reaches the kiosk.
export default function DevPage() {
  if (!isDevConsoleEnabled()) notFound();
  const sources = SOURCES.map((s) => ({ id: s.id, accepts: [...s.accepts] }));
  return (
    <main className="mx-auto w-full max-w-5xl space-y-10 p-6 font-sans text-sm">
      <h1 className="text-2xl font-semibold">Console de test</h1>
      <DevConsole sources={sources} />
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Enquête complète</h2>
        <p className="text-zinc-600">
          Appelle <code>/api/search</code> comme le fera le formulaire du visiteur et affiche les événements du
          moteur, sans la réponse brute.
        </p>
        <InvestigationConsole />
      </section>
    </main>
  );
}
