"use client";

import { motion } from "motion/react";
import { useMemo } from "react";
import switzerland from "@/data/switzerland.json";
// Type-only import: erased at build time, no server code reaches the browser.
import type { Commune, Ring } from "@/server/domain/commune";

// 2D map of the commune (D27), drawn in SVG from the outlines bundled with the app:
// no map tiles, so no request tells a map server where the visitor lives.
// Loaded with next/dynamic: the Switzerland outline (89 KB) is only downloaded when
// a commune is shown.

// Simple projection: longitude shrunk by cos(latitude) so that Switzerland keeps its
// shape at this latitude, latitude flipped because SVG y goes down.
const K = Math.cos((46.8 * Math.PI) / 180);
const project = ([lng, lat]: [number, number]): [number, number] => [lng * K, -lat];

function toPath(rings: Ring[]): string {
  return rings
    .map((ring) => `M${ring.map((p) => project(p).map((n) => n.toFixed(4)).join(",")).join("L")}Z`)
    .join("");
}

type Box = { x: number; y: number; w: number; h: number };

function bounds(rings: Ring[]): Box {
  let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const ring of rings) {
    for (const point of ring) {
      const [x, y] = project(point);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

// Box around `box` with a margin, at the aspect ratio of the frame (width / height).
function frame(box: Box, margin: number, ratio: number, minWidth = 0): string {
  let w = Math.max(box.w * (1 + margin), minWidth);
  let h = box.h * (1 + margin);
  if (w / h < ratio) w = h * ratio;
  else h = w / ratio;
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  return `${cx - w / 2} ${cy - h / 2} ${w} ${h}`;
}

const RATIO = 16 / 10;
const COUNTRY = switzerland.country as Ring[];
const LAKES = switzerland.lakes as Ring[];
const COUNTRY_PATH = toPath(COUNTRY);
const LAKES_PATH = toPath(LAKES);
const COUNTRY_VIEW = frame(bounds(COUNTRY), 0.08, RATIO);

export default function CommuneMap({ commune, animate }: { commune: Commune; animate: boolean }) {
  const communePath = useMemo(() => toPath(commune.rings), [commune]);
  // Close on the commune, but at least ~25 km wide: the neighbours give the context.
  const communeView = useMemo(() => frame(bounds(commune.rings), 1.6, RATIO, 0.35 * K), [commune]);
  const [cx, cy] = project([commune.lng, commune.lat]);

  return (
    <motion.svg
      className="size-full"
      initial={{ viewBox: animate ? COUNTRY_VIEW : communeView }}
      animate={{ viewBox: communeView }}
      transition={{ duration: animate ? 2.4 : 0, delay: animate ? 0.5 : 0, ease: [0.65, 0, 0.35, 1] }}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Carte : commune de ${commune.name}`}
    >
      {/* non-scaling-stroke: the lines keep the same thickness during the zoom. */}
      <path d={COUNTRY_PATH} fill="rgba(0, 229, 255, 0.04)" stroke="#00e5ff" strokeOpacity={0.6} strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
      <path d={LAKES_PATH} fill="rgba(0, 229, 255, 0.14)" stroke="#00e5ff" strokeOpacity={0.3} strokeWidth={1} vectorEffect="non-scaling-stroke" />
      <motion.path
        d={communePath}
        fillRule="evenodd"
        fill="#d4af37"
        stroke="#d4af37"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
        initial={{ fillOpacity: 0.1 }}
        animate={{ fillOpacity: [0.15, 0.35, 0.15] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Crosshair on the center of the commune, across the whole map. */}
      <g stroke="#d4af37" strokeOpacity={0.6} strokeWidth={1} strokeDasharray="4 6" vectorEffect="non-scaling-stroke">
        <line x1={cx - 20} y1={cy} x2={cx + 20} y2={cy} vectorEffect="non-scaling-stroke" />
        <line x1={cx} y1={cy - 20} x2={cx} y2={cy + 20} vectorEffect="non-scaling-stroke" />
      </g>
    </motion.svg>
  );
}
