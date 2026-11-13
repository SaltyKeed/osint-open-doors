"use client";

import { motion } from "motion/react";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { GlobeArc } from "@/components/globe-scene";

// The visitor's kiosk (Neuchâtel, Switzerland): every arc starts here.
const ORIGIN = { lat: 46.99, lng: 6.93 };
const ARC_COLOR = "#ffe45c";

export type Destination = { lat: number; lng: number; place: string };

// Where the visitor's data really goes for each step. Only confirmed places (seat of
// the service): no arc for XposedOrNot and LeakCheck (country not found) nor for the
// ~650 WhatsMyName sites (spread all over the world). See DECISIONS.md, D23 and D25.
export const DESTINATIONS = {
  zurich: { lat: 47.37, lng: 8.54, place: "Zurich" },
  bern: { lat: 46.95, lng: 7.45, place: "Berne" },
  newYork: { lat: 40.71, lng: -74.01, place: "New York" },
  sanFrancisco: { lat: 37.77, lng: -122.42, place: "San Francisco" },
  bethesda: { lat: 38.98, lng: -77.1, place: "Bethesda" },
  // Public profiles (D24): Mojang (Minecraft), Codeberg, Valve (Steam).
  stockholm: { lat: 59.33, lng: 18.07, place: "Stockholm" },
  berlin: { lat: 52.52, lng: 13.4, place: "Berlin" },
  bellevue: { lat: 47.61, lng: -122.2, place: "Bellevue (Seattle)" },
} satisfies Record<string, Destination>;

export type GlobeStep = { label: string; destinations: Destination[] };

// Great-circle distance (haversine formula), in kilometres.
function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = Math.PI / 180;
  const h =
    Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(((b.lng - a.lng) * rad) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

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
          // The farther the data goes, the higher the arc (Zurich stays low, San Francisco rises).
          arcAlt: Math.min(0.45, 0.06 + distanceKm(ORIGIN, d) / 25000),
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
      {/* Decorative: the steps are also given as text below. The canvas needs a fixed
          height (it takes the size of its parent); smaller on phones (D25). */}
      <div className="h-[280px] w-full max-w-[600px] sm:h-[400px] lg:h-[500px]" aria-hidden>
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
