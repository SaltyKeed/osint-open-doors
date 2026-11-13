"use client";

import { motion } from "motion/react";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { GlobeArc } from "@/components/globe-scene";

// The visitor's kiosk (Neuchâtel, Switzerland): every arc starts here.
const ORIGIN = { lat: 46.99, lng: 6.93 };
const ARC_COLOR = "#ffe45c";

export type Destination = { lat: number; lng: number; place: string };

// Where the visitor's data really goes for each step. Only confirmed places:
// no arc for XposedOrNot (country not found) nor for the ~650 username sites
// (spread all over the world). See DECISIONS.md, D23.
export const DESTINATIONS = {
  zurich: { lat: 47.37, lng: 8.54, place: "Zurich" },
  bern: { lat: 46.95, lng: 7.45, place: "Berne" },
  newYork: { lat: 40.71, lng: -74.01, place: "New York" },
  sanFrancisco: { lat: 37.77, lng: -122.42, place: "San Francisco" },
  bethesda: { lat: 38.98, lng: -77.1, place: "Bethesda" },
} satisfies Record<string, Destination>;

export type GlobeStep = { label: string; destinations: Destination[] };

// three.js only runs in the browser; the module is also preloaded while typing.
const loadScene = () => import("@/components/globe-scene");
const GlobeScene = dynamic(loadScene, { ssr: false, loading: () => null });

export function preloadGlobe() {
  void loadScene();
}

// True when the browser can draw WebGL (otherwise the old progress bar is shown).
export function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export function SearchGlobeLoader({
  steps,
  index,
  percent,
}: {
  steps: GlobeStep[];
  index: number; // current step
  percent: number; // time-based estimate, 0-100
}) {
  // One arc per destination of the steps already reached: a new arc appears at each step.
  const arcs = useMemo<GlobeArc[]>(() => {
    const seen = new Set<string>();
    const list: GlobeArc[] = [];
    steps.slice(0, index + 1).forEach((step, order) => {
      for (const d of step.destinations) {
        if (seen.has(d.place)) continue;
        seen.add(d.place);
        list.push({
          order,
          startLat: ORIGIN.lat,
          startLng: ORIGIN.lng,
          endLat: d.lat,
          endLng: d.lng,
          // Short hops stay low, transatlantic arcs rise higher.
          arcAlt: Math.abs(d.lng - ORIGIN.lng) > 30 ? 0.35 : 0.08,
          color: ARC_COLOR,
        });
      }
    });
    return list;
  }, [steps, index]);

  const current = steps[index];
  const places = [...new Set(steps.slice(0, index + 1).flatMap((s) => s.destinations.map((d) => d.place)))];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="flex w-full flex-col items-center gap-4"
    >
      {/* Decorative: the steps are also given as text below. The 6:5 frame matches the
          camera aspect of the globe component (1.2), otherwise the sphere looks squashed. */}
      <div className="aspect-[6/5] w-full max-w-[min(34rem,90vw)]" aria-hidden>
        <GlobeScene arcs={arcs} />
      </div>
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-xl font-bold" aria-live="polite">
          Recherche dans {current?.label ?? "les sources"}…
        </p>
        <p className="text-base text-muted-foreground">
          Environ {Math.round(percent)} % (estimation).
          {places.length > 0 && <> Tes données sont parties vers {places.join(", ")}.</>}
        </p>
      </div>
    </motion.div>
  );
}
