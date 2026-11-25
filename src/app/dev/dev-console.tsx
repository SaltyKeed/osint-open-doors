"use client";

import { type FormEvent, useState } from "react";
import type { SourceReport } from "@/server/dev/inspect-sources";
import type { SourceField } from "@/server/domain/source";

interface SourceInfo {
  id: string;
  accepts: string[];
}

interface Result {
  query: unknown;
  reports: SourceReport[];
}

const FIELDS = [
  { name: "email", label: "Email", type: "email" },
  { name: "phone", label: "Téléphone", type: "tel" },
  { name: "pseudo", label: "Pseudo", type: "text" },
  { name: "firstName", label: "Prénom", type: "text" },
  { name: "lastName", label: "Nom", type: "text" },
] as const;

const STATUS_STYLE: Record<SourceReport["status"], string> = {
  ok: "bg-green-100 text-green-900",
  error: "bg-red-100 text-red-900",
  skipped: "bg-zinc-200 text-zinc-800",
};

const COLUMNS = ["Fiche", "Champ", "Valeur", "Détails", "Nouveaux identifiants"];

export function DevConsole({ sources }: { sources: SourceInfo[] }) {
  const [selected, setSelected] = useState(() => new Set(sources.map((s) => s.id)));
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
    const body: Record<string, unknown> = { consent: form.get("consent") === "on", sources: [...selected] };
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
        <h1 className="text-xl font-semibold">Console de test des sources</h1>
        <p className="text-zinc-600">
          Outil de développement, disponible uniquement avec <code>npm run dev</code>. Rien n&apos;est
          enregistré : recharger la page efface tout.
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
          <legend className="font-medium">Sources</legend>
          {sources.length === 0 && <p>Aucune source dans le registre.</p>}
          {sources.map((s) => (
            <label key={s.id} className="flex items-center gap-2">
              <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} />
              <span className="font-mono">{s.id}</span>
              <span className="text-zinc-600">(accepte : {s.accepts.join(", ")})</span>
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
            <SourceBlock key={`${report.id}-${report.input}`} report={report} />
          ))}
        </section>
      )}
    </main>
  );
}

function details(field: SourceField): string {
  const b = field.breach;
  if (b) {
    const records = b.records?.toLocaleString("fr-CH") ?? "?";
    return `${b.domain ?? "-"}, ${b.year ?? "-"}, ${b.dataTypes.join(" ")}, ${records} comptes, ${b.verified ? "vérifiée" : "non vérifiée"}`;
  }
  const i = field.infection;
  if (i) return `${i.date ?? "date ?"}, ${i.operatingSystem ?? "système ?"}, ${i.stolenCredentials ?? "?"} identifiants volés`;
  if (field.page) return field.page.title;
  return "-";
}

function SourceBlock({ report }: { report: SourceReport }) {
  return (
    <article className="space-y-3 rounded border border-zinc-300 p-4">
      <header className="flex flex-wrap items-center gap-3">
        <h2 className="font-mono text-base font-semibold">
          {report.id}
          {report.input && <span className="font-normal text-zinc-600"> ← {report.input}</span>}
        </h2>
        <span className={`rounded px-2 py-0.5 text-xs ${STATUS_STYLE[report.status]}`}>{report.status}</span>
        <span className="text-zinc-600">{report.durationMs} ms</span>
        {report.message && <span className="text-zinc-700">{report.message}</span>}
      </header>

      {report.status === "ok" && (
        <>
          <div>
            <h3 className="font-medium">Résultat mappé : {report.records.length} fiche(s)</h3>
            {report.records.length > 0 && (
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
                    {report.records.flatMap((record, r) =>
                      record.fields.map((field, f) => (
                        <tr key={`${r}-${f}`} className="border-b border-zinc-200">
                          <td className="px-2 py-1">
                            {r + 1}
                            {record.about === "relative" && " (proche)"}
                          </td>
                          <td className="px-2 py-1 font-mono">{field.field}</td>
                          <td className="px-2 py-1">{field.value}</td>
                          <td className="px-2 py-1">{details(field)}</td>
                          <td className="px-2 py-1">
                            {record.identifiers.map((i) => `${i.type}:${i.value}`).join(", ") || "-"}
                          </td>
                        </tr>
                      )),
                    )}
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
