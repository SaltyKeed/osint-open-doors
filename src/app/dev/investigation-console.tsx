"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import type { Finding } from "@/server/domain/finding";
import type { Identifier } from "@/server/domain/identifier";
import type { InvestigationEvent } from "@/server/investigation";
import { FIELDS } from "./dev-console";
import { splitNdjson } from "./ndjson";

const isWebAddress = (value: string) => /^https?:\/\//i.test(value);

/** The first round's input as identifiers, in the form the second round sends back (T9). */
function inputIdentifiers(body: Record<string, unknown>): Identifier[] {
  const identifiers: Identifier[] = [];
  if (typeof body.email === "string") identifiers.push({ type: "EMAIL", value: body.email });
  if (typeof body.phone === "string") identifiers.push({ type: "TEL", value: body.phone });
  if (typeof body.pseudo === "string") identifiers.push({ type: "PSEUDO", value: body.pseudo });
  if (typeof body.firstName === "string" && typeof body.lastName === "string") {
    identifiers.push({ type: "NOM", value: `${body.firstName} ${body.lastName}` });
  }
  return identifiers;
}

const pathText = (path: Identifier[]) => path.map((i) => `${i.type}:${i.value}`).join(" → ");

export function InvestigationConsole() {
  const [events, setEvents] = useState<InvestigationEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // The request in progress: a new search or leaving the page cancels it.
  const controller = useRef<AbortController | null>(null);
  // The form's input, kept in memory for the second round (nothing is stored anywhere else).
  const firstInput = useRef<Record<string, unknown>>({});
  // Accounts the visitor confirmed in an earlier round, sent again with each new round.
  const confirmedAccounts = useRef<string[]>([]);
  const [ticked, setTicked] = useState<Set<string>>(new Set());

  useEffect(() => () => controller.current?.abort(), []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    // Empty fields are left out: the schema refuses an empty string.
    const body: Record<string, unknown> = { consent: form.get("consent") === "on" };
    for (const field of FIELDS) {
      const value = String(form.get(field.name) ?? "").trim();
      if (value) body[field.name] = value;
    }

    firstInput.current = body;
    confirmedAccounts.current = [];
    setTicked(new Set());
    setEvents([]);
    await runRound(body);
  }

  /** Sends one request to /api/search and adds the events to the screen as they arrive. */
  async function runRound(body: Record<string, unknown>) {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: current.signal,
      });
      if (!response.ok || !response.body) {
        setError(`HTTP ${response.status} : ${await response.text()}`);
        return;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        const { events: received, rest } = splitNdjson(buffer + decoder.decode(value, { stream: true }));
        buffer = rest;
        if (received.length > 0) setEvents((previous) => [...previous, ...(received as InvestigationEvent[])]);
      }
      // A last line without "\n" is still an event.
      const last = (buffer + decoder.decode()).trim();
      if (last !== "") setEvents((previous) => [...previous, JSON.parse(last) as InvestigationEvent]);
    } catch {
      // An abort is the visitor's own action, not an error.
      if (!current.signal.aborted) setError("Le serveur ne répond pas ou le flux est invalide.");
    } finally {
      if (controller.current === current) setLoading(false);
    }
  }

  function toggle(address: string) {
    setTicked((current) => {
      const next = new Set(current);
      if (next.has(address)) next.delete(address);
      else next.add(address);
      return next;
    });
  }

  async function continueInvestigation() {
    const isToConfirmAccount = (f: Finding) => f.field === "F2" && f.confidence === "to_confirm";
    const newlyConfirmed = toConfirm.map((f) => f.value).filter((address) => ticked.has(address));
    // Accounts confirmed in an earlier round were searched then: they are inputs, so no lead event says so.
    const searchedAccounts = confirmedAccounts.current.map((value): Identifier => ({ type: "PROFIL", value }));
    confirmedAccounts.current = [...confirmedAccounts.current, ...newlyConfirmed];
    // Inputs and confirmed accounts are confirmed; a lead is confirmed when the engine said so (T10).
    const entries = [
      ...inputIdentifiers(firstInput.current).map((i) => ({ ...i, confirmed: true })),
      ...searchedAccounts.map((i) => ({ ...i, confirmed: true })),
      ...events.flatMap((e) => (e.type === "lead" ? [{ ...e.identifier, confirmed: e.confidence === "confirmed" }] : [])),
    ];
    // One entry per identifier, confirmed if any of its entries is: the list is bounded by the server (MAX_SEARCHED).
    const byKey = new Map<string, (typeof entries)[number]>();
    for (const entry of entries) {
      const key = `${entry.type}:${entry.value}`;
      byKey.set(key, { ...entry, confirmed: entry.confirmed || byKey.get(key)?.confirmed === true });
    }
    const searched = [...byKey.values()];
    // Ticked accounts become confirmed; the others leave the screen (T9).
    setEvents((previous) =>
      previous.flatMap((e): InvestigationEvent[] => {
        if (e.type !== "finding" || !isToConfirmAccount(e.finding)) return [e];
        if (!ticked.has(e.finding.value)) return [];
        return [{ type: "finding", finding: { ...e.finding, confidence: "confirmed" } }];
      }),
    );
    setTicked(new Set());
    await runRound({ ...firstInput.current, confirmedProfiles: confirmedAccounts.current, searched });
  }

  const leads = events.filter((e) => e.type === "lead");
  const failed = events.filter((e) => e.type === "source-failed");
  const done = events.findLast((e) => e.type === "done");
  // Hidden records add up over the rounds.
  const hidden = { possible: 0, namesake: 0 };
  for (const e of events) {
    if (e.type !== "done") continue;
    hidden.possible += e.hidden.possible;
    hidden.namesake += e.hidden.namesake;
  }
  // An updated finding replaces the previous one (same field and value).
  const findings = new Map<string, Finding>();
  for (const e of events) if (e.type === "finding") findings.set(`${e.finding.field}\n${e.finding.value}`, e.finding);

  // Accounts found by the pseudo that only the visitor can recognize (T9).
  const toConfirm = [...findings.values()].filter((f) => f.field === "F2" && f.confidence === "to_confirm");

  return (
    <section className="space-y-4">
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
        <label className="flex items-center gap-2">
          <input type="checkbox" name="consent" defaultChecked />
          Consentement (le schéma refuse la recherche sans)
        </label>
        <button type="submit" disabled={loading} className="rounded bg-zinc-900 px-4 py-2 text-white disabled:opacity-50">
          {loading ? "Enquête en cours…" : "Lancer l'enquête complète"}
        </button>
      </form>

      {error && (
        <p role="alert" className="rounded bg-red-100 p-3 text-red-900">
          {error}
        </p>
      )}

      <div className="space-y-4" aria-live="polite">
        {leads.length > 0 && (
          <div>
            <h3 className="font-medium">Identifiants relancés</h3>
            <ul className="list-inside list-disc font-mono text-xs">
              {leads.map((lead, i) => (
                <li key={i}>
                  {lead.identifier.type}:{lead.identifier.value} ({lead.confidence}) : {pathText(lead.path)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {findings.size > 0 && (
          <div className="overflow-auto">
            <h3 className="font-medium">Constats</h3>
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-zinc-100 text-zinc-900">
                <tr>
                  {["Champ", "Valeur", "Confiance", "Sources", "Chemin"].map((column) => (
                    <th key={column} className="border-b border-zinc-300 px-2 py-1">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...findings.entries()].map(([key, finding]) => (
                  <tr key={key} className="border-b border-zinc-200">
                    <td className="px-2 py-1 font-mono">{finding.field}</td>
                    <td className="px-2 py-1">{finding.value}</td>
                    <td className="px-2 py-1">{finding.confidence}</td>
                    <td className="px-2 py-1">{finding.sources.join(", ")}</td>
                    <td className="px-2 py-1 font-mono">{pathText(finding.path)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {failed.length > 0 && (
          <div>
            <h3 className="font-medium">Sources en échec</h3>
            <ul className="list-inside list-disc font-mono text-xs">
              {failed.map((f, i) => (
                <li key={i}>
                  {f.source} ({f.reason})
                </li>
              ))}
            </ul>
          </div>
        )}

        {done && (
          <p>
            Enquête terminée. Fiches cachées : {hidden.possible} possible(s), {hidden.namesake} homonyme(s).
          </p>
        )}

        {done && !loading && toConfirm.length > 0 && (
          <fieldset className="space-y-2 rounded border border-zinc-300 p-4">
            <legend className="font-medium">Ces comptes portent ton pseudo. Lesquels sont à toi ?</legend>
            {toConfirm.map((account) => (
              <label key={account.value} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={ticked.has(account.value)}
                  onChange={() => toggle(account.value)}
                />
                {account.profile?.photo && (
                  // A plain <img>: the photo comes from a site we do not know in advance, so next/image cannot be
                  // configured for it. No referrer: the address of the account page is not sent to the image host (T10).
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={account.profile.photo}
                    alt={account.profile.name ?? "Photo du compte"}
                    width={48}
                    height={48}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    className="h-12 w-12 rounded object-cover"
                  />
                )}
                {account.profile?.name && <span className="font-medium">{account.profile.name}</span>}
                {isWebAddress(account.value) ? (
                  <a href={account.value} target="_blank" rel="noreferrer" className="text-blue-800 underline">
                    {account.value}
                  </a>
                ) : (
                  <span>{account.value}</span>
                )}
              </label>
            ))}
            <button
              type="button"
              onClick={continueInvestigation}
              className="rounded bg-zinc-900 px-4 py-2 text-white"
            >
              Continuer l&apos;enquête
            </button>
          </fieldset>
        )}
      </div>
    </section>
  );
}
