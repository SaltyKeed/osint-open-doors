"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import type { Payload } from "@/components/search-screen";
import { Button } from "@/components/ui/button";

const EXPECTED_SECONDS = 25;

// Sources really queried for this input (not a fixed list).
export function sourcesFor(payload: Payload): string[] {
  const sources: string[] = [];
  if (payload.email) sources.push("les fuites de données", "GitHub et Gravatar");
  if (payload.phone) sources.push("l'annuaire téléphonique", "les sites de signalement d'appels");
  if (payload.firstName && payload.lastName) sources.push("le web, la presse et les réseaux sociaux");
  if (payload.username || payload.email) sources.push("environ 650 sites pour les pseudos");
  sources.push("les archives d'Internet");
  return sources;
}

export function LoadingScreen({ payload, onCancel }: { payload: Payload; onCancel: () => void }) {
  const sources = sourcesFor(payload);
  const [index, setIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const marker = setInterval(() => setIndex((i) => (i + 1) % sources.length), 1100);
    const clock = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => {
      clearInterval(marker);
      clearInterval(clock);
    };
  }, [sources.length]);

  const remaining = Math.max(EXPECTED_SECONDS - elapsed, 0);
  const progress = Math.min(elapsed / EXPECTED_SECONDS, 1);

  return (
    <div className="flex w-full max-w-3xl flex-col gap-8">
      <div className="flex flex-col gap-4">
        <h1 id="screen-title" tabIndex={-1} className="font-heading text-6xl leading-[1.05] font-bold tracking-tight outline-none">
          Recherche en cours…
        </h1>
        <p className="text-lg">Toutes les sources sont interrogées en même temps. Ça prend entre 10 et 25 secondes.</p>
      </div>

      {/* The moving highlighter is decorative: a screen reader would repeat the list endlessly. */}
      <ul className="flex flex-col gap-2 text-2xl" aria-hidden>
        {sources.map((source, i) => (
          <li key={source} className="relative w-fit px-2 py-0.5">
            {i === index && (
              <motion.span
                layoutId="marker"
                className="absolute inset-0 -z-10 rounded-sm bg-highlight"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            <span className={i === index ? "" : "text-muted-foreground"}>{source}</span>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2">
        <div
          role="progressbar"
          aria-label="Avancement de la recherche"
          aria-valuemin={0}
          aria-valuemax={EXPECTED_SECONDS}
          aria-valuenow={Math.min(elapsed, EXPECTED_SECONDS)}
          aria-valuetext={remaining > 0 ? `Environ ${remaining} secondes restantes` : "Encore un instant"}
          className="h-3 w-full overflow-hidden rounded-full bg-muted"
        >
          <motion.div
            className="h-full origin-left rounded-full bg-primary"
            animate={{ scaleX: progress }}
            transition={{ duration: 1, ease: "linear" }}
          />
        </div>
        <p className="text-base text-muted-foreground">
          {remaining > 0 ? `Environ ${remaining} secondes restantes` : "Encore un instant…"}
        </p>
      </div>

      <Button type="button" variant="outline" size="lg" onClick={onCancel} className="h-12 self-start px-6 text-base">
        Annuler et effacer
      </Button>
    </div>
  );
}
