"use client";

import { RotateCcw } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { GlobeScene, supportsWebGL } from "@/components/search-globe-loader";
import { Button } from "@/components/ui/button";
import type { LatLng } from "@/components/ui/globe";
import type { Commune } from "@/server/domain/commune";

// "We found where you live" (D27): from the phone number alone, the directory gives
// the visitor's commune. The globe turns to Switzerland and zooms in, then the 2D map
// zooms from the whole country to the commune. Only the commune is shown: the street
// and the number never leave the server.

const CommuneMap = dynamic(() => import("@/components/commune-map"), { ssr: false, loading: () => null });

// Duration of the globe phase, then the 2D map takes over.
const GLOBE_MS = 3200;
// Close enough to see Switzerland fill a good part of the globe (radius 100).
const ZOOM_DISTANCE = 112;

export function CommuneReveal({ commune, hasAddress }: { commune: Commune; hasAddress: boolean }) {
  const reducedMotion = useReducedMotion();
  const [webgl] = useState(supportsWebGL);
  const animated = webgl && !reducedMotion;
  // Increased by the "Revoir" button: replays the whole sequence.
  const [run, setRun] = useState(0);
  const [phase, setPhase] = useState<"globe" | "map">(animated ? "globe" : "map");

  useEffect(() => {
    if (!animated) return;
    const toMap = setTimeout(() => setPhase("map"), GLOBE_MS);
    return () => clearTimeout(toMap);
  }, [animated, run]);

  const focus = useMemo<LatLng>(() => ({ lat: commune.lat, lng: commune.lng }), [commune]);
  const pings = useMemo(() => [focus], [focus]);

  return (
    <section aria-labelledby="commune-title" className="hud-panel flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="hud-label">Localisation · à partir de ton numéro</span>
        {animated && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setPhase("globe");
              setRun((r) => r + 1);
            }}
          >
            <RotateCcw aria-hidden />
            Revoir
          </Button>
        )}
      </div>

      <div className="hud-corners relative h-[260px] overflow-hidden rounded-md sm:h-[360px]" aria-hidden>
        <AnimatePresence mode="sync">
          {phase === "globe" ? (
            <motion.div key={`globe-${run}`} className="absolute inset-0" exit={{ opacity: 0 }} transition={{ duration: 0.6 }}>
              <GlobeScene arcs={[]} pings={pings} focus={focus} distance={ZOOM_DISTANCE} />
            </motion.div>
          ) : (
            <motion.div
              key={`map-${run}`}
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
            >
              <CommuneMap commune={commune} animate={animated} />
            </motion.div>
          )}
        </AnimatePresence>
        <div className="pointer-events-none absolute right-3 bottom-2 font-mono text-xs text-muted-foreground uppercase">
          {commune.lat.toFixed(2)}° N {commune.lng.toFixed(2)}° E · centre de la commune
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <p id="commune-title" className="font-heading text-2xl font-bold">
          Ta commune : <span className="text-gold">{commune.name}</span> ({commune.canton})
        </p>
        <p className="text-lg">
          Ton seul numéro de téléphone a suffi pour la trouver dans l&apos;annuaire.
          {hasAddress && (
            <> L&apos;annuaire publie aussi ta rue et ton numéro : nous ne les affichons pas, mais n&apos;importe qui peut les lire.</>
          )}
        </p>
      </div>
    </section>
  );
}
