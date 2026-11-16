// Builds the offline Swiss geodata used to show the visitor's commune (D27).
//
// Usage (the two source files are downloaded by hand, see DECISIONS.md, D27):
//   node scripts/build-swiss-geo.mjs <AMTOVZ_CSV_WGS84.csv> <swiss-maps/2026/ch-combined.json>
//
// Outputs (committed, regenerated once a year when communes merge):
//   src/data/swiss-communes.json   server only: localities (zip -> commune) and commune outlines
//   src/data/switzerland.json      browser: country border and lakes, backdrop of the map
//
// No dependency: the CSV is split by hand and the TopoJSON is decoded below.

import { readFileSync, writeFileSync } from "node:fs";

const [csvPath, topoPath] = process.argv.slice(2);
if (!csvPath || !topoPath) {
  console.error("Usage: node scripts/build-swiss-geo.mjs <localities.csv> <ch-combined.json>");
  process.exit(1);
}

// About 10 metres: enough for an outline, and the file stays small.
const round = (n) => Math.round(n * 10000) / 10000;

// ---------- Official register of localities (swisstopo) ----------
// Columns: Ortschaftsname;PLZ4;Zusatzziffer;ZIP_ID;Gemeindename;BFS-Nr;Kantonskürzel;Adressenanteil;E;N;Sprache;Validity
const lines = readFileSync(csvPath, "utf-8").replace(/^﻿/, "").trim().split(/\r?\n/);
const header = lines[0].split(";");
const col = (name) => {
  const i = header.indexOf(name);
  if (i < 0) throw new Error(`Missing column ${name}`);
  return i;
};
const [cPlace, cZip, cCommune, cBfs, cCanton, cShare] = [
  "Ortschaftsname",
  "PLZ4",
  "Gemeindename",
  "BFS-Nr",
  "Kantonskürzel",
  "Adressenanteil",
].map(col);

const localities = []; // [zip, place name, commune number, share of the addresses in %]
const communeInfo = new Map(); // commune number -> { name, canton }
for (const line of lines.slice(1)) {
  const c = line.split(";");
  const bfs = Number(c[cBfs]);
  const share = Number.parseFloat(c[cShare].replace(",", ".")) || 0;
  localities.push([c[cZip], c[cPlace], bfs, share]);
  communeInfo.set(bfs, { name: c[cCommune], canton: c[cCanton] });
}

// ---------- Generalized boundaries (Federal Statistical Office, via swiss-maps) ----------
const topo = JSON.parse(readFileSync(topoPath, "utf-8"));
const { scale, translate } = topo.transform;

// TopoJSON stores each border once ("arc"), quantized and delta-encoded.
const arcs = topo.arcs.map((arc) => {
  let x = 0;
  let y = 0;
  return arc.map(([dx, dy]) => {
    x += dx;
    y += dy;
    return [round(x * scale[0] + translate[0]), round(y * scale[1] + translate[1])];
  });
});

// A ring is a list of arc indexes; a negative index (~i) means the arc reversed.
function ring(indexes) {
  const points = [];
  indexes.forEach((index, k) => {
    const arc = index >= 0 ? arcs[index] : [...arcs[~index]].reverse();
    points.push(...(k === 0 ? arc : arc.slice(1)));
  });
  return points;
}

function rings(geometry) {
  if (geometry.type === "Polygon") return geometry.arcs.map(ring);
  if (geometry.type === "MultiPolygon") return geometry.arcs.flatMap((polygon) => polygon.map(ring));
  return [];
}

// Center used to turn the globe: centroid of the largest ring (shoelace formula).
function center(allRings) {
  let best = { area: 0, x: 0, y: 0 };
  for (const r of allRings) {
    let a = 0;
    let cx = 0;
    let cy = 0;
    for (let i = 0; i < r.length - 1; i++) {
      const [x0, y0] = r[i];
      const [x1, y1] = r[i + 1];
      const f = x0 * y1 - x1 * y0;
      a += f;
      cx += (x0 + x1) * f;
      cy += (y0 + y1) * f;
    }
    if (Math.abs(a) > Math.abs(best.area)) best = { area: a, x: cx / (3 * a), y: cy / (3 * a) };
  }
  return { lat: round(best.y), lng: round(best.x) };
}

const communes = {};
const missing = [];
for (const geometry of topo.objects.municipalities.geometries) {
  const bfs = Number(geometry.id);
  const info = communeInfo.get(bfs);
  if (!info) {
    missing.push(bfs);
    continue;
  }
  const outline = rings(geometry);
  communes[bfs] = { name: info.name, canton: info.canton, ...center(outline), rings: outline };
}

const withoutOutline = [...communeInfo.keys()].filter((bfs) => !communes[bfs]);
writeFileSync("src/data/swiss-communes.json", JSON.stringify({ localities, communes }));
writeFileSync(
  "src/data/switzerland.json",
  JSON.stringify({
    country: topo.objects.country.geometries.flatMap(rings),
    lakes: topo.objects.lakes.geometries.flatMap(rings),
  }),
);

console.log(`${localities.length} localities, ${Object.keys(communes).length} communes with an outline`);
if (missing.length) console.log(`Outlines without a locality (ignored): ${missing.join(", ")}`);
if (withoutOutline.length) console.log(`Communes without an outline (no map): ${withoutOutline.join(", ")}`);
