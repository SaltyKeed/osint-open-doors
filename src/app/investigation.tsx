"use client";

import { type FormEvent, useState } from "react";
import type { InvestigationView } from "@/server/investigation/view";
import { Results } from "./results";

// Visitor screen of the sandbox prototype: input, then results. The final interface
// is decided later (T1). Nothing is stored: reloading the page erases everything.

const INPUTS = [
  { name: "email", label: "Email", type: "email" },
  { name: "phone", label: "Téléphone", type: "tel" },
  { name: "pseudo", label: "Pseudo", type: "text" },
  { name: "firstName", label: "Prénom", type: "text" },
  { name: "lastName", label: "Nom", type: "text" },
  { name: "locality", label: "Localité", type: "text" },
  { name: "birthDate", label: "Date de naissance", type: "date" },
] as const;

export function Investigation({ services }: { services: string[] }) {
  const [view, setView] = useState<InvestigationView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    // Empty fields are left out: the schema refuses an empty string.
    const body: Record<string, unknown> = { consent: form.get("consent") === "on" };
    for (const input of INPUTS) {
      const value = String(form.get(input.name) ?? "").trim();
      if (value) body[input.name] = value;
    }
    setLoading(true);
    setError(null);
    setView(null);
    try {
      const response = await fetch("/api/investigate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        setError("Saisie refusée : vérifie les champs et la case de consentement.");
        return;
      }
      setView((await response.json()) as InvestigationView);
    } catch {
      setError("L'enquête n'a pas pu aboutir.");
    } finally {
      setLoading(false);
    }
  }

  if (view) return <Results view={view} onReset={() => setView(null)} />;

  return (
    <main className="mx-auto w-full max-w-2xl p-6">
      <h1 className="text-3xl font-bold">OSINT Open Doors</h1>
      <p className="mt-1 text-zinc-600">
        Saisis tes propres informations. L&apos;outil cherche ce qui est public sur toi et reconstitue ta fiche. Rien
        n&apos;est enregistré.
      </p>
      <form onSubmit={onSubmit} className="mt-6 grid gap-4 rounded-xl border border-zinc-200 p-4 sm:grid-cols-2">
        {INPUTS.map((input) => (
          <label key={input.name} className="grid gap-1 text-sm">
            {input.label}
            <input name={input.name} type={input.type} className="rounded-lg border border-zinc-300 px-3 py-2" />
          </label>
        ))}
        <label className="flex items-start gap-2 text-sm sm:col-span-2">
          <input name="consent" type="checkbox" className="mt-1" />
          Je certifie que ces informations sont les miennes et j&apos;accepte qu&apos;elles soient envoyées aux services
          interrogés ({services.join(", ")}) le temps de l&apos;enquête.
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-zinc-900 px-4 py-3 text-white disabled:opacity-50 sm:col-span-2"
        >
          {loading ? "Enquête en cours…" : "Lancer l'enquête"}
        </button>
        {error && <p className="text-sm text-red-700 sm:col-span-2">{error}</p>}
      </form>
    </main>
  );
}
