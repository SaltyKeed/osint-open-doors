"use client";

import { type FormEvent, useState } from "react";
import type { InvestigationView, ViewValue } from "@/server/investigation/view";

// First version of the visitor screen (sandbox prototype). The final interface
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

const CONFIDENCE: Record<ViewValue["confidence"], { label: string; style: string }> = {
  confirme: { label: "confirmé", style: "bg-green-100 text-green-900" },
  probable: { label: "probable", style: "bg-amber-100 text-amber-900" },
};

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      {!open && <path d="M3 3l18 18" />}
    </svg>
  );
}

function Value({ item }: { item: ViewValue }) {
  const [visible, setVisible] = useState(false);
  const confidence = CONFIDENCE[item.confidence];
  return (
    <li className="rounded border border-zinc-200 p-3">
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm break-all">{visible ? item.value : item.masked}</span>
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="text-zinc-500 hover:text-zinc-900"
          aria-label={visible ? "Masquer la valeur" : "Afficher la valeur"}
        >
          <EyeIcon open={visible} />
        </button>
        <span className={`ml-auto rounded px-2 py-0.5 text-xs ${confidence.style}`}>{confidence.label}</span>
      </div>
      <p className="mt-1 text-xs text-zinc-500">
        Source : {item.sources.join(", ")} · trouvé grâce à : {item.path.join(" → ")}
        {item.thirdParty && " · proche"}
      </p>
      {visible && item.attributes.length > 0 && (
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 text-xs">
          {item.attributes.map((a) => (
            <div key={`${a.label}:${a.value}`} className="contents">
              <dt className="text-zinc-500">{a.label}</dt>
              <dd className="break-all">{a.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </li>
  );
}

export function Investigation() {
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

  if (view) {
    return (
      <main className="mx-auto w-full max-w-4xl p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Ta fiche de vie</h1>
          <button
            type="button"
            onClick={() => setView(null)}
            className="rounded bg-zinc-900 px-4 py-2 text-sm text-white"
          >
            Effacer et terminer
          </button>
        </div>
        <p className="mt-1 text-sm text-zinc-600">
          Les valeurs sont masquées : le bouton œil affiche chacune. Services qui ont reçu tes données :{" "}
          {view.services.join(", ") || "aucun"}.
        </p>
        <div className="mt-6 grid gap-4">
          {view.categories.map((category) => (
            <section key={category.code} className="rounded-lg border border-zinc-200 p-4">
              <header className="flex items-baseline justify-between">
                <h2 className="font-semibold">
                  {category.code}. {category.label}
                </h2>
                <span className="text-sm text-zinc-500">
                  {category.filled} / {category.total} champs
                </span>
              </header>
              {category.fields.length === 0 ? (
                <p className="mt-2 text-sm text-zinc-400">Rien trouvé.</p>
              ) : (
                category.fields.map((field) => (
                  <div key={field.code} className="mt-3">
                    <h3 className="text-sm font-medium">
                      {field.code} · {field.label}
                    </h3>
                    <ul className="mt-1 grid gap-2">
                      {field.values.map((item) => (
                        <Value key={item.value} item={item} />
                      ))}
                    </ul>
                    {field.hiddenCount > 0 && (
                      <p className="mt-1 text-xs text-zinc-500">
                        + {field.hiddenCount} résultat(s) peu fiable(s) ou homonyme(s), non affiché(s).
                      </p>
                    )}
                  </div>
                ))
              )}
            </section>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl p-6">
      <h1 className="text-2xl font-semibold">OSINT Open Doors</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Saisis tes propres informations. L&apos;outil cherche ce qui est public sur toi et reconstitue ta fiche. Rien
        n&apos;est enregistré.
      </p>
      <form onSubmit={onSubmit} className="mt-6 grid gap-4 rounded-lg border border-zinc-200 p-4 sm:grid-cols-2">
        {INPUTS.map((input) => (
          <label key={input.name} className="grid gap-1 text-sm">
            {input.label}
            <input name={input.name} type={input.type} className="rounded border border-zinc-300 px-3 py-2" />
          </label>
        ))}
        <label className="flex items-start gap-2 text-sm sm:col-span-2">
          <input name="consent" type="checkbox" className="mt-1" />
          Je certifie que ces informations sont les miennes et j&apos;accepte qu&apos;elles soient envoyées aux services
          interrogés (XposedOrNot, Hudson Rock, Gravatar, GitHub) le temps de l&apos;enquête.
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-zinc-900 px-4 py-2 text-white disabled:opacity-50 sm:col-span-2"
        >
          {loading ? "Enquête en cours…" : "Lancer l'enquête"}
        </button>
        {error && <p className="text-sm text-red-700 sm:col-span-2">{error}</p>}
      </form>
    </main>
  );
}
