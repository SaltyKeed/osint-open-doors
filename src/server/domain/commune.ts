// Commune of a directory listing (D27): from the zip code and the locality of the
// listing to the commune, with the official register of localities. Pure logic: the
// data (src/data/swiss-communes.json) is passed in, the tests use invented data.

// A point is [longitude, latitude], as in GeoJSON.
export type Ring = [number, number][];

// What leaves the server: the commune only, never the street or the number.
export type Commune = {
  name: string;
  canton: string;
  lat: number; // center, used to turn the globe
  lng: number;
  rings: Ring[]; // outline (generalized boundaries of the Federal Statistical Office)
};

// [zip code, locality, commune number (BFS), share of the locality's addresses in %]
export type LocalityRow = [string, string, number, number];

export type CommuneData = {
  localities: LocalityRow[];
  communes: Record<string, Commune>;
};

// "Vallée-Inventée NE" and "vallee inventee" are the same place: no case, no accents,
// no punctuation, no canton at the end, no post office number ("Lausanne 25").
export function normalizePlace(place: string): string {
  return place
    .trim()
    .replace(/\s+[A-Z]{2}$/, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s\d+$/, "")
    .trim();
}

// A zip code can cover several communes: the locality decides; otherwise the commune
// that holds most of the zip code's addresses.
export function findCommune(
  data: CommuneData,
  zip: string | undefined,
  city: string | undefined,
): Commune | undefined {
  if (!zip) return undefined;
  const rows = data.localities.filter(([z]) => z === zip);
  if (rows.length === 0) return undefined;
  const place = city ? normalizePlace(city) : "";
  const named = rows.filter(([, name]) => normalizePlace(name) === place);
  const candidates = named.length > 0 ? named : rows;
  const best = candidates.reduce((a, b) => (b[3] > a[3] ? b : a));
  return data.communes[String(best[2])];
}
