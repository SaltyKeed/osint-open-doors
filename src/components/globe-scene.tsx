"use client";

import { type GlobeConfig, type LatLng, World } from "@/components/ui/globe";

// three.js scene, loaded only in the browser (next/dynamic with ssr: false in
// search-globe-loader.tsx and commune-reveal.tsx). Kept in its own module so it can be
// preloaded while the visitor types.

export type GlobeArc = {
  order: number;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  arcAlt: number;
  color: string;
};

// Colors of the HUD palette (D28, same values as globals.css): night globe, cyan
// countries and atmosphere, gold pings. three.js needs the values, not CSS variables.
// Nothing but types is imported from this module elsewhere: a value import would put
// three.js in the main bundle instead of loading it on demand.
const globeConfig: GlobeConfig = {
  pointSize: 4,
  globeColor: "#0c0e1a",
  showAtmosphere: true,
  atmosphereColor: "#00e5ff",
  atmosphereAltitude: 0.14,
  emissive: "#04040a",
  emissiveIntensity: 0.2,
  shininess: 0.9,
  polygonColor: "rgba(0, 229, 255, 0.55)",
  ringColor: "#d4af37",
  backgroundColor: "#06060c",
  ambientLight: "#ffffff",
  directionalLeftLight: "#ffffff",
  directionalTopLight: "#ffffff",
  pointLight: "#ffffff",
  arcTime: 1200,
  arcLength: 0.9,
  rings: 1,
  maxRings: 4,
  // Starts between Switzerland and the Atlantic: the first arcs (Bern, Zurich, Berlin,
  // Stockholm) and the departure towards America are visible (D25).
  initialPosition: { lat: 40, lng: -10 },
  autoRotate: true,
  autoRotateSpeed: 0.3,
};

export default function GlobeScene({
  arcs,
  pings,
  focus,
  distance,
}: {
  arcs: GlobeArc[];
  pings?: LatLng[];
  focus?: LatLng | null;
  distance?: number;
}) {
  return <World globeConfig={globeConfig} data={arcs} pings={pings} focus={focus} distance={distance} />;
}
