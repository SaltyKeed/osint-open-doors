"use client";

import { type GlobeConfig, World } from "@/components/ui/globe";

// three.js scene, loaded only in the browser (next/dynamic with ssr: false in
// search-globe-loader.tsx). Kept in its own module so it can be preloaded.

export type GlobeArc = {
  order: number;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  arcAlt: number;
  color: string;
};

// Colors of the project palette (D21, D22): marine ink globe, white countries,
// highlighter yellow for the arcs and the atmosphere.
const globeConfig: GlobeConfig = {
  pointSize: 4,
  globeColor: "#1b2a4a",
  showAtmosphere: true,
  atmosphereColor: "#ffe45c",
  atmosphereAltitude: 0.12,
  emissive: "#1b2a4a",
  emissiveIntensity: 0.15,
  shininess: 0.9,
  polygonColor: "rgba(255, 255, 255, 0.75)",
  ambientLight: "#ffffff",
  directionalLeftLight: "#ffffff",
  directionalTopLight: "#ffffff",
  pointLight: "#ffffff",
  arcTime: 1200,
  arcLength: 0.9,
  rings: 1,
  maxRings: 3,
  // Starts between Switzerland and the Atlantic: the first arcs (Bern, Zurich, Berlin,
  // Stockholm) and the departure towards America are visible; a slow rotation keeps
  // the arcs on screen during the ~25 seconds of the search (D25).
  initialPosition: { lat: 40, lng: -10 },
  autoRotate: true,
  autoRotateSpeed: 0.3,
};

export default function GlobeScene({ arcs }: { arcs: GlobeArc[] }) {
  return <World globeConfig={globeConfig} data={arcs} />;
}
