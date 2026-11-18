import "server-only";
import { type Commune, type CommuneData, findCommune } from "@/server/domain/commune";
import data from "@/data/swiss-communes.json";

// Official register of localities (swisstopo) and generalized commune boundaries
// (Federal Statistical Office), bundled with the app: no request leaves the school
// PC to place the visitor (D27). Regenerated with scripts/build-swiss-geo.mjs.
const communeData = data as unknown as CommuneData;

export function resolveCommune(zip: string | undefined, city: string | undefined): Commune | undefined {
  return findCommune(communeData, zip, city);
}
