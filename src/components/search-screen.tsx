"use client";

import { ChevronDown, Search } from "lucide-react";
import { useState } from "react";
import { addEntries, type Entry, entriesToPayload, SearchBar } from "@/components/search-bar";
import { preloadGlobe } from "@/components/search-globe-loader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { looksLikeLoneName } from "@/lib/detect";

export type Payload = ReturnType<typeof entriesToPayload>;

export function hasSearchableInput(payload: Payload): boolean {
  return Boolean(payload.email || payload.phone || payload.lastName || payload.username);
}

const SOURCES =
  "XposedOrNot (fuites de données), Tavily (recherche web et presse), search.ch (annuaire), GitHub, Gravatar, " +
  "keys.openpgp.org, Keybase, ORCID, Wikidata et le registre des domaines. Ton pseudo et la partie de ton email " +
  "avant le @ sont testés sur environ 650 sites publics. Les pages trouvées sont vérifiées dans les archives du web.";

export function SearchScreen({
  entries,
  onEntriesChange,
  text,
  onTextChange,
  consent,
  onConsentChange,
  error,
  onSubmit,
  onAnnounce,
}: {
  entries: Entry[];
  onEntriesChange: (entries: Entry[]) => void;
  text: string;
  onTextChange: (text: string) => void;
  consent: boolean;
  onConsentChange: (consent: boolean) => void;
  error: string | null;
  onSubmit: (entries: Entry[]) => void;
  onAnnounce: (message: string) => void;
}) {
  const [unknown, setUnknown] = useState<string[]>([]);
  const [missing, setMissing] = useState<string | null>(null);

  const payload = entriesToPayload(entries);
  const hasName = Boolean(payload.firstName && payload.lastName);
  const hasContext = Boolean(payload.city || payload.birthYear);
  const loneName = entries.find(looksLikeLoneName);

  // One help message at a time, the first that applies.
  const help =
    unknown[0] ??
    (loneName
      ? `« ${loneName.value} » est pris comme pseudo. Si c'est ta localité, clique sur « Pseudo » pour changer le type. Pour chercher ton nom, tape ton prénom et ton nom ensemble.`
      : hasContext && !hasSearchableInput(payload)
        ? "La localité et l'année de naissance servent à te distinguer des homonymes. Ajoute aussi ton prénom et ton nom."
        : "Pour te distinguer des homonymes, ajoute aussi ta localité ou ton année de naissance.");

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Text still in the field is validated first (the visitor may click without pressing Enter).
    let current = entries;
    if (text.trim() !== "") {
      const result = addEntries(entries, text);
      current = result.entries;
      onEntriesChange(current);
      setUnknown(result.unknown);
      onTextChange(result.unknown.length > 0 ? text : "");
      if (result.unknown.length > 0) return;
    }
    if (!hasSearchableInput(entriesToPayload(current))) {
      setMissing("Ajoute au moins un email, un numéro, ton prénom et ton nom, ou un pseudo.");
      return;
    }
    if (!consent) {
      setMissing("Coche la case pour confirmer que ces informations sont les tiennes.");
      return;
    }
    setMissing(null);
    onSubmit(current);
  }

  return (
    <form onSubmit={submit} autoComplete="off" noValidate className="flex w-full max-w-3xl flex-col gap-8">
      <div className="flex flex-col gap-4">
        <h1 id="screen-title" tabIndex={-1} className="font-heading text-6xl leading-[1.05] font-bold tracking-tight text-balance outline-none">
          Qu&apos;est-ce qu&apos;Internet sait de toi&nbsp;?
        </h1>
        <p className="max-w-2xl text-lg">
          Tape une information à la fois et appuie sur Entrée : ton email, ton numéro, ton prénom et ton nom, ou un
          pseudo. On reconnaît tout seul ce que c&apos;est.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <SearchBar
          entries={entries}
          onEntriesChange={(next) => {
            onEntriesChange(next);
            setMissing(null);
          }}
          text={text}
          onTextChange={(value) => {
            onTextChange(value);
            // Load the 3D globe while the visitor types, so it is ready when the search starts.
            preloadGlobe();
            if (unknown.length > 0) setUnknown([]);
          }}
          onUnknown={setUnknown}
          onAnnounce={onAnnounce}
          contextIgnored={!hasName && hasContext && hasSearchableInput(payload)}
        />
        <p id="search-help" aria-live="polite" className={unknown.length > 0 ? "text-base font-bold text-destructive" : "text-base text-muted-foreground"}>
          {help}
        </p>
      </div>

      <Card size="sm">
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <Checkbox
              id="consent"
              className="mt-0.5 size-5 border-primary"
              checked={consent}
              onCheckedChange={(checked) => {
                onConsentChange(checked === true);
                setMissing(null);
              }}
            />
            <Label htmlFor="consent" className="text-base leading-relaxed font-normal">
              Ces informations sont les miennes et j&apos;accepte qu&apos;elles soient envoyées aux sources de la
              recherche. Rien n&apos;est enregistré : tout est effacé à la fin.
            </Label>
          </div>
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="group ml-6 text-sm">
                Voir les sources utilisées
                <ChevronDown className="transition-transform group-data-[state=open]:rotate-180" aria-hidden />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="ml-8 pt-2 text-sm text-muted-foreground">{SOURCES}</CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {error && (
        <p role="alert" className="text-base font-bold text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <Button
          type="submit"
          size="lg"
          aria-disabled={!consent || !hasSearchableInput(payload) ? true : undefined}
          aria-describedby={missing ? "search-missing" : undefined}
          className="h-14 px-8 text-lg shadow-marker aria-disabled:opacity-60 aria-disabled:shadow-none"
        >
          <Search className="size-5" aria-hidden />
          Lancer la recherche
        </Button>
        {missing && (
          <p id="search-missing" role="alert" className="text-base font-bold">
            {missing}
          </p>
        )}
      </div>
    </form>
  );
}
