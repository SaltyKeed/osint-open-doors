"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { DESTINATIONS, type GlobeStep, SearchGlobeLoader, supportsWebGL } from "@/components/search-globe-loader";
import type { Payload } from "@/components/search-screen";
import { Button } from "@/components/ui/button";

const EXPECTED_SECONDS = 25;

// Steps really run for this input (not a fixed list), with where the data goes.
export function stepsFor(payload: Payload): GlobeStep[] {
  const { zurich, bern, newYork, sanFrancisco, bethesda } = DESTINATIONS;
  const steps: GlobeStep[] = [];
  if (payload.email) {
    steps.push(
      { label: "les fuites de données", destinations: [] },
      { label: "GitHub et Gravatar", destinations: [sanFrancisco] },
    );
  }
  if (payload.phone) {
    steps.push(
      { label: "l'annuaire téléphonique", destinations: [zurich] },
      { label: "les sites de signalement d'appels", destinations: [newYork] },
    );
  }
  if (payload.firstName && payload.lastName) {
    steps.push(
      { label: "le web, la presse et les réseaux sociaux", destinations: [newYork] },
      { label: "Wikidata et ORCID", destinations: [sanFrancisco, bethesda] },
      { label: "le registre du commerce (FOSC)", destinations: [bern] },
    );
  }
  if (payload.username || payload.email) {
    steps.push(
      { label: "environ 650 sites pour les pseudos", destinations: [] },
      { label: "les profils de jeux, réseaux et développeurs", destinations: [] },
    );
  }
  steps.push({ label: "les archives d'Internet", destinations: [sanFrancisco] });
  return steps;
}

export function LoadingScreen({ payload, onCancel }: { payload: Payload; onCancel: () => void }) {
  const steps = stepsFor(payload);
  const reducedMotion = useReducedMotion();
  // The globe needs WebGL and animations: otherwise, the former list and progress bar.
  const [webgl] = useState(supportsWebGL);
  const showGlobe = webgl && !reducedMotion;
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const clock = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(clock);
  }, []);

  const remaining = Math.max(EXPECTED_SECONDS - elapsed, 0);
  const progress = Math.min(elapsed / EXPECTED_SECONDS, 1);
  // The steps follow the time (the server answers once, there is no real per-source progress).
  const index = Math.min(Math.floor(progress * steps.length), steps.length - 1);
  const remainingText = remaining > 0 ? `Environ ${remaining} secondes restantes` : "Encore un instant…";

  return (
    <div className="flex w-full max-w-3xl flex-col gap-8">
      <div className="flex flex-col gap-4">
        <h1 id="screen-title" tabIndex={-1} className="font-heading text-5xl leading-[1.05] font-bold tracking-tight outline-none sm:text-6xl">
          Recherche en cours…
        </h1>
        <p className="text-lg">Toutes les sources sont interrogées en même temps. Ça prend entre 10 et 25 secondes.</p>
      </div>

      {showGlobe ? (
        <SearchGlobeLoader steps={steps} index={index} percent={progress * 100} />
      ) : (
        // Fallback (reduced motion or no WebGL): the list with the highlighter marker.
        <ul className="flex flex-col gap-2 text-2xl" aria-hidden>
          {steps.map((step, i) => (
            <li key={step.label} className="relative w-fit px-2 py-0.5">
              {i === index && (
                <motion.span
                  layoutId="marker"
                  className="absolute inset-0 -z-10 rounded-sm bg-highlight"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <span className={i === index ? "" : "text-muted-foreground"}>{step.label}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2">
        <div
          role="progressbar"
          aria-label="Avancement de la recherche"
          aria-valuemin={0}
          aria-valuemax={EXPECTED_SECONDS}
          aria-valuenow={Math.min(elapsed, EXPECTED_SECONDS)}
          aria-valuetext={remaining > 0 ? `Environ ${remaining} secondes restantes` : "Encore un instant"}
          // With the globe, the bar is replaced visually but stays for screen readers.
          className={showGlobe ? "sr-only" : "h-3 w-full overflow-hidden rounded-full bg-muted"}
        >
          {!showGlobe && (
            <motion.div
              className="h-full origin-left rounded-full bg-primary"
              animate={{ scaleX: progress }}
              transition={{ duration: 1, ease: "linear" }}
            />
          )}
        </div>
        {!showGlobe && <p className="text-base text-muted-foreground">{remainingText}</p>}
      </div>

      <Button type="button" variant="outline" size="lg" onClick={onCancel} className="h-12 self-start px-6 text-base">
        Annuler et effacer
      </Button>
    </div>
  );
}
