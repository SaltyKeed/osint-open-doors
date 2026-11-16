"use client";

import { motion } from "motion/react";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { GlobeArc } from "@/components/globe-scene";
import type { LatLng } from "@/components/ui/globe";

// The visitor's kiosk (Neuchâtel, Switzerland): every arc starts here.
export const ORIGIN = { lat: 46.99, lng: 6.93 };
// Same value as --highlight in globals.css (three.js needs the value, D28).
const ARC_COLOR = "#00e5ff";
// Camera distance while it looks at a source: a little closer than the whole globe.
const FOCUS_DISTANCE = 250;

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
export const GlobeScene = dynamic(loadScene, { ssr: false, loading: () => null });

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

// "+00:07": time since the start of the search, like the log of a scanner.
function stamp(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `+${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function SearchGlobeLoader({
  steps,
  index,
  percent,
  expectedSeconds,
}: {
  steps: GlobeStep[];
  index: number; // current step
  percent: number; // time-based estimate, 0-100
  expectedSeconds: number;
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
  // The camera turns towards the source of the current step and a ring marks it (D28).
  // Steps without a single place (data breaches, 650 sites) let the globe rotate.
  const focus = useMemo<LatLng | null>(() => {
    const first = current?.destinations[0];
    return first ? { lat: first.lat, lng: first.lng } : null;
  }, [current]);
  const pings = useMemo<LatLng[]>(
    () => current?.destinations.map((d) => ({ lat: d.lat, lng: d.lng })) ?? [],
    [current],
  );
  const places = [...new Set(steps.slice(0, index + 1).flatMap((s) => s.destinations.map((d) => d.place)))];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="grid w-full grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]"
    >
      {/* Decorative: the steps are also given as text. The canvas needs a fixed height
          (it takes the size of its parent); smaller on phones (D25). */}
      <div className="hud-panel hud-corners relative h-[300px] overflow-hidden sm:h-[440px] lg:h-[540px]" aria-hidden>
        <GlobeScene arcs={arcs} pings={pings} focus={focus} distance={FOCUS_DISTANCE} />
        <div className="pointer-events-none absolute top-3 left-4 flex flex-col gap-1">
          <span className="hud-label">Scan en cours</span>
          <span className="font-mono text-3xl font-bold text-primary tabular-nums">{Math.round(percent)} %</span>
          <span className="font-mono text-xs text-muted-foreground uppercase">estimation</span>
        </div>
        <div className="pointer-events-none absolute right-4 bottom-3 font-mono text-xs text-muted-foreground uppercase">
          Origine · Neuchâtel {ORIGIN.lat.toFixed(2)}° N {ORIGIN.lng.toFixed(2)}° E
        </div>
      </div>

      <div className="hud-panel flex flex-col gap-3 p-4">
        <span className="hud-label">Journal</span>
        <ol className="flex flex-col gap-2 font-mono text-sm" aria-hidden>
          {steps.slice(0, index + 1).map((step, i) => (
            <motion.li
              key={step.label}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25 }}
              className={i === index ? "text-foreground" : "text-muted-foreground"}
            >
              <span className="text-gold tabular-nums">{stamp((i / steps.length) * expectedSeconds)}</span>{" "}
              {step.label}
              {step.destinations.length > 0 && (
                <span className="text-primary"> → {step.destinations.map((d) => d.place).join(", ")}</span>
              )}
              {i === index && <span className="ml-1 inline-block animate-pulse text-primary">▮</span>}
            </motion.li>
          ))}
        </ol>
        <div className="mt-auto flex flex-col gap-1 border-t border-border pt-3">
          <p className="text-lg font-bold" aria-live="polite">
            Recherche dans {current?.label ?? "les sources"}…
          </p>
          {places.length > 0 && (
            <p className="text-base text-muted-foreground">Tes données sont parties vers {places.join(", ")}.</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
