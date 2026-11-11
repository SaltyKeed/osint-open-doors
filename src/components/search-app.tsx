"use client";

import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { InactivityDialog } from "@/components/inactivity-dialog";
import { LoadingScreen } from "@/components/loading-screen";
import { ResultsScreen, type SearchResponse } from "@/components/results-screen";
import { type Entry, entriesToPayload } from "@/components/search-bar";
import { type Payload, SearchScreen } from "@/components/search-screen";
import { Button } from "@/components/ui/button";

type Status =
  | { kind: "idle"; error: string | null }
  | { kind: "loading"; payload: Payload }
  | { kind: "failed" }
  | { kind: "done"; result: SearchResponse };

// After WARN_MS without interaction a warning appears; at ERASE_MS everything is erased.
const WARN_MS = 100_000;
const ERASE_MS = 120_000;
// The server stops after about 22 seconds; this only protects against a stuck request.
const CLIENT_TIMEOUT_MS = 40_000;

function errorMessage(status: number, fields: string[] | undefined): string {
  if (status === 400 && fields?.includes("phone")) return "Ce numéro de téléphone n'est pas valide.";
  if (status === 400 && fields?.includes("email")) return "Cette adresse email n'est pas valide.";
  if (status === 400 && fields?.includes("username")) {
    return "Le pseudo doit faire 3 à 40 caractères : lettres sans accent, chiffres, point, tiret ou trait de soulignement.";
  }
  if (status === 400) return "Ajoute au moins un email, un numéro, ton prénom et ton nom, ou un pseudo.";
  return "La recherche n'a pas abouti. Réessaie.";
}

export function SearchApp() {
  // Everything lives in memory only: no localStorage, no cookie (CLAUDE.md invariant).
  const [entries, setEntries] = useState<Entry[]>([]);
  const [text, setText] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle", error: null });
  const [resetKey, setResetKey] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const [warning, setWarning] = useState<number | null>(null); // seconds left, or null

  const request = useRef<{ id: number; controller: AbortController } | null>(null);
  const lastActivity = useRef(0);

  const hasSomething = entries.length > 0 || text !== "" || consent || status.kind !== "idle";

  const reset = useCallback(() => {
    request.current?.controller.abort();
    request.current = null;
    setEntries([]);
    setText("");
    setConsent(false);
    setStatus({ kind: "idle", error: null });
    setWarning(null);
    setResetKey((k) => k + 1); // remounts the search screen: nothing typed survives
    window.scrollTo(0, 0);
    setAnnouncement("Tes informations ont été effacées.");
  }, []);

  // Inactivity: warning, then erase. Only when there is something to erase.
  useEffect(() => {
    lastActivity.current = Date.now();
    const touch = () => {
      lastActivity.current = Date.now();
      setWarning(null);
    };
    const events = ["pointerdown", "keydown", "scroll", "wheel", "focusin"] as const;
    events.forEach((e) => window.addEventListener(e, touch));
    const tick = setInterval(() => {
      if (!hasSomething || status.kind === "loading") {
        lastActivity.current = Date.now();
        return;
      }
      const idle = Date.now() - lastActivity.current;
      if (idle >= ERASE_MS) reset();
      else if (idle >= WARN_MS) setWarning(Math.ceil((ERASE_MS - idle) / 1000));
    }, 1000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, touch));
      clearInterval(tick);
    };
  }, [hasSomething, status.kind, reset]);

  // Focus the title of each new screen: the screen reader announces it and the
  // keyboard does not restart from the top of the page.
  useEffect(() => {
    const id = setTimeout(() => document.getElementById("screen-title")?.focus(), 350);
    return () => clearTimeout(id);
  }, [status.kind, resetKey]);

  async function search(current: Entry[]) {
    const payload = entriesToPayload(current);
    const id = (request.current?.id ?? 0) + 1;
    const controller = new AbortController();
    request.current = { id, controller };
    setStatus({ kind: "loading", payload });

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, consent }),
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(CLIENT_TIMEOUT_MS)]),
      });
      if (request.current?.id !== id) return; // cancelled or reset meanwhile
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { fields?: string[] };
        setStatus({ kind: "idle", error: errorMessage(response.status, body.fields) });
        return;
      }
      const result = (await response.json()) as SearchResponse;
      if (request.current?.id !== id) return;
      const allFailed =
        result.queriedProviders.length > 0 && result.failedProviders.length === result.queriedProviders.length;
      setStatus(allFailed ? { kind: "failed" } : { kind: "done", result });
      lastActivity.current = Date.now();
    } catch {
      if (request.current?.id !== id) return;
      setStatus({ kind: "idle", error: "La recherche n'a pas abouti. Réessaie." });
    }
  }

  let screen: React.ReactNode;
  if (status.kind === "loading") {
    screen = <LoadingScreen payload={status.payload} onCancel={reset} />;
  } else if (status.kind === "done") {
    screen = <ResultsScreen result={status.result} onReset={reset} />;
  } else if (status.kind === "failed") {
    screen = (
      <div className="flex w-full max-w-3xl flex-col gap-6">
        <h1 id="screen-title" tabIndex={-1} className="font-heading text-5xl leading-[1.1] font-bold tracking-tight outline-none">
          La recherche n&apos;a pas pu se faire
        </h1>
        <p className="text-lg">
          Aucune source n&apos;a répondu, ce n&apos;est pas un résultat. Réessaie dans un moment ou appelle un élève du
          stand.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button size="lg" className="h-12 px-6 text-base" onClick={() => search(entries)}>
            Réessayer
          </Button>
          <Button size="lg" variant="outline" className="h-12 px-6 text-base" onClick={reset}>
            Effacer et terminer
          </Button>
        </div>
      </div>
    );
  } else {
    screen = (
      <SearchScreen
        entries={entries}
        onEntriesChange={setEntries}
        text={text}
        onTextChange={setText}
        consent={consent}
        onConsentChange={setConsent}
        error={status.error}
        onSubmit={search}
        onAnnounce={setAnnouncement}
      />
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence mode="wait">
        <motion.div
          // A new key remounts the screen: after a reset, nothing typed survives.
          key={`${status.kind}-${resetKey}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.2, 0, 0, 1] } }}
          exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
          className="flex w-full justify-center"
        >
          {screen}
        </motion.div>
      </AnimatePresence>

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      <InactivityDialog
        open={warning !== null}
        secondsLeft={warning ?? 0}
        onStay={() => {
          lastActivity.current = Date.now();
          setWarning(null);
        }}
        onEraseNow={reset}
      />
    </MotionConfig>
  );
}
