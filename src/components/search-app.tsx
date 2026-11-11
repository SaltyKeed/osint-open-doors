"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// Type-only imports: erased at build time, no server code reaches the browser.
import type { Action } from "@/server/domain/actions";
import type { DataCategory, Exposure } from "@/server/domain/types";

type SearchResponse = {
  mode: "surface" | "deep";
  maskedEmail: string;
  exposures: Exposure[];
  actions: Action[];
  failedProviders: string[];
};

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "done"; result: SearchResponse };

const CATEGORY_LABELS: Record<DataCategory, string> = {
  email: "Email",
  password: "Mot de passe",
  name: "Nom",
  phone: "Téléphone",
  address: "Adresse",
  birthDate: "Date de naissance",
  username: "Pseudo",
  ipAddress: "Adresse IP",
  financial: "Données bancaires",
  governmentId: "Pièce d'identité",
  location: "Localisation",
  other: "Autre",
};

// After this delay without interaction, everything is erased for the next visitor.
const INACTIVITY_MS = 2 * 60 * 1000;

export function SearchApp() {
  // State lives in memory only: no localStorage, no cookie (CLAUDE.md invariant).
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const reset = useCallback(() => {
    setEmail("");
    setConsent(false);
    setStatus({ kind: "idle" });
  }, []);

  useEffect(() => {
    let timer = setTimeout(reset, INACTIVITY_MS);
    const restart = () => {
      clearTimeout(timer);
      timer = setTimeout(reset, INACTIVITY_MS);
    };
    const events = ["pointerdown", "keydown", "scroll"] as const;
    events.forEach((e) => window.addEventListener(e, restart));
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, restart));
    };
  }, [reset]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ kind: "loading" });
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, consent }),
      });
      if (!response.ok) {
        setStatus({ kind: "error", message: "Saisie invalide. Vérifie l'adresse email." });
        return;
      }
      setStatus({ kind: "done", result: (await response.json()) as SearchResponse });
    } catch {
      setStatus({ kind: "error", message: "La recherche n'a pas abouti. Réessaie." });
    }
  }

  if (status.kind === "done") {
    return <Results result={status.result} onReset={reset} />;
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle className="text-2xl">Qu&apos;est-ce qu&apos;on trouve sur toi ?</CardTitle>
        <CardDescription>
          Entre ton adresse email pour savoir si elle apparaît dans des fuites de données connues.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-5" autoComplete="off">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Adresse email</Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex items-start gap-3">
            <Checkbox
              id="consent"
              checked={consent}
              onCheckedChange={(checked) => setConsent(checked === true)}
            />
            <Label htmlFor="consent" className="leading-snug font-normal">
              Je confirme que cette adresse est la mienne. Elle est envoyée au service
              XposedOrNot pour la recherche, puis effacée. Rien n&apos;est enregistré.
            </Label>
          </div>
          {status.kind === "error" && (
            <p role="alert" className="text-sm text-destructive">
              {status.message}
            </p>
          )}
          <Button type="submit" disabled={!consent || status.kind === "loading"}>
            {status.kind === "loading" ? "Recherche en cours…" : "Lancer la recherche"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Results({ result, onReset }: { result: SearchResponse; onReset: () => void }) {
  const count = result.exposures.length;
  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold">
          {count === 0
            ? "Aucune fuite connue pour cette adresse"
            : `${result.maskedEmail} apparaît dans ${count} fuite${count > 1 ? "s" : ""}`}
        </h2>
        {result.failedProviders.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Certaines sources n&apos;ont pas répondu : le résultat peut être incomplet.
          </p>
        )}
      </div>

      {result.actions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ton plan d&apos;action</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="flex list-decimal flex-col gap-3 pl-5">
              {result.actions.map((action) => (
                <li key={action.id}>
                  <p className="font-medium">{action.title}</p>
                  <p className="text-sm text-muted-foreground">{action.detail}</p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {count > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {result.exposures.map((exposure) => (
            <Card key={`${exposure.providerId}-${exposure.source}`} size="sm">
              <CardHeader>
                <CardTitle>{exposure.source}</CardTitle>
                <CardDescription>
                  {[exposure.year, exposure.records && `${exposure.records.toLocaleString("fr-CH")} comptes`]
                    .filter(Boolean)
                    .join(" · ")}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-1.5">
                {exposure.categories.map((category) => (
                  <Badge key={category} variant={category === "password" ? "destructive" : "secondary"}>
                    {CATEGORY_LABELS[category]}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button onClick={onReset} size="lg">
          Effacer et terminer
        </Button>
        {/* Active mode shown discreetly to check the kiosk on the event day (D10, rule 4). */}
        <span className="text-xs text-muted-foreground">mode {result.mode}</span>
      </div>
    </div>
  );
}
