"use client";

import { type FormEvent, useState } from "react";
import type { ProviderReport } from "@/server/dev/inspect-providers";

interface ProviderInfo {
  id: string;
  supports: string[];
  mode: "surface" | "deep";
}

interface Result {
  query: unknown;
  reports: ProviderReport[];
}

const FIELDS = [
  { name: "email", label: "Email", type: "email" },
  { name: "phone", label: "Téléphone", type: "tel" },
  { name: "firstName", label: "Prénom", type: "text" },
  { name: "lastName", label: "Nom", type: "text" },
] as const;

const STATUS_STYLE: Record<ProviderReport["status"], string> = {
  ok: "bg-green-100 text-green-900",
  error: "bg-red-100 text-red-900",
  skipped: "bg-zinc-200 text-zinc-800",
};

const COLUMNS = ["Source", "Domaine", "Année", "Catégories", "Enregistrements", "Vérifiée"];

export function DevConsole({ providers, appMode }: { providers: ProviderInfo[]; appMode: string }) {
  const [selected, setSelected] = useState(() => new Set(providers.map((p) => p.id)));
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    // Empty fields are left out: the schema refuses an empty string.
    const body: Record<string, unknown> = { consent: form.get("consent") === "on", providers: [...selected] };
    for (const field of FIELDS) {
      const value = String(form.get(field.name) ?? "").trim();
      if (value) body[field.name] = value;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/dev/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) setError(`HTTP ${response.status} : ${JSON.stringify(data)}`);
      else setResult(data);
    } catch {
      setError("Le serveur ne répond pas.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 p-6 font-sans text-sm">
      <header>
        <h1 className="text-xl font-semibold">Console de test des providers</h1>
        <p className="text-zinc-600">
          Outil de développement, disponible uniquement avec <code>npm run dev</code>. Mode actuel :{" "}
          <code>{appMode}</code>. Rien n&apos;est enregistré : recharger la page efface tout.
        </p>
      </header>

      <form onSubmit={onSubmit} className="space-y-4 rounded border border-zinc-300 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {FIELDS.map((field) => (
            <label key={field.name} className="flex flex-col gap-1">
              {field.label}
              <input
                name={field.name}
                type={field.type}
                autoComplete="off"
                className="rounded border border-zinc-400 px-2 py-1"
              />
            </label>
          ))}
        </div>

        <fieldset className="space-y-1">
          <legend className="font-medium">Providers</legend>
          {providers.length === 0 && <p>Aucun provider dans le registry.</p>}
          {providers.map((p) => (
            <label key={p.id} className="flex items-center gap-2">
              <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
              <span className="font-mono">{p.id}</span>
              <span className="text-zinc-600">
                ({p.mode}, accepte : {p.supports.join(", ")})
              </span>
            </label>
          ))}
        </fieldset>

        <label className="flex items-center gap-2">
          <input type="checkbox" name="consent" defaultChecked />
          Consentement (le schéma refuse la recherche sans)
        </label>

        <button
          type="submit"
          disabled={loading || selected.size === 0}
          className="rounded bg-zinc-900 px-4 py-2 text-white disabled:opacity-50"
        >
          {loading ? "Recherche en cours…" : "Lancer la recherche"}
        </button>
      </form>

      {error && (
        <p role="alert" className="rounded bg-red-100 p-3 text-red-900">
          {error}
        </p>
      )}

      {result && (
        <section className="space-y-4" aria-live="polite">
          <details className="rounded border border-zinc-300 p-3">
            <summary className="cursor-pointer font-medium">Requête normalisée par le schéma</summary>
            <pre className="mt-2 overflow-auto text-xs">{JSON.stringify(result.query, null, 2)}</pre>
          </details>
          {result.reports.map((report) => (
            <ProviderBlock key={report.id} report={report} />
          ))}
        </section>
      )}
    </main>
  );
}

function ProviderBlock({ report }: { report: ProviderReport }) {
  return (
    <article className="space-y-3 rounded border border-zinc-300 p-4">
      <header className="flex flex-wrap items-center gap-3">
        <h2 className="font-mono text-base font-semibold">{report.id}</h2>
        <span className={`rounded px-2 py-0.5 text-xs ${STATUS_STYLE[report.status]}`}>{report.status}</span>
        <span className="text-zinc-600">{report.durationMs} ms</span>
        {report.message && <span className="text-zinc-700">{report.message}</span>}
      </header>

      {report.status === "ok" && (
        <>
          <div>
            <h3 className="font-medium">Résultat mappé : {report.exposures.length} fuite(s)</h3>
            {report.exposures.length > 0 && (
              <div className="mt-2 max-h-96 overflow-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="sticky top-0 bg-zinc-100 text-zinc-900">
                    <tr>
                      {COLUMNS.map((column) => (
                        <th key={column} className="border-b border-zinc-300 px-2 py-1">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.exposures.map((e, i) => (
                      <tr key={`${e.source}-${i}`} className="border-b border-zinc-200">
                        <td className="px-2 py-1">{e.source}</td>
                        <td className="px-2 py-1">{e.domain ?? "-"}</td>
                        <td className="px-2 py-1">{e.year ?? "-"}</td>
                        <td className="px-2 py-1">{e.categories.join(", ")}</td>
                        <td className="px-2 py-1">{e.recordCount?.toLocaleString("fr-CH") ?? "-"}</td>
                        <td className="px-2 py-1">{e.verified ? "oui" : "non"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <details>
            <summary className="cursor-pointer font-medium">
              Champs ignorés par le schéma : {report.ignoredFields.length}
            </summary>
            <ul className="mt-2 list-inside list-disc font-mono text-xs">
              {report.ignoredFields.map((path) => (
                <li key={path}>{path}</li>
              ))}
            </ul>
          </details>

          <details>
            <summary className="cursor-pointer font-medium">Réponse brute de l&apos;API</summary>
            <pre className="mt-2 max-h-[32rem] overflow-auto rounded bg-zinc-100 p-2 text-xs text-zinc-900">
              {JSON.stringify(report.raw, null, 2)}
            </pre>
          </details>
        </>
      )}
    </article>
  );
}
