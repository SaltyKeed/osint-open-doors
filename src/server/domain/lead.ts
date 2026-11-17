import "server-only";
import type { Confidence } from "./confidence";
import type { Identifier } from "./identifier";
import { extendPath, startPath, type Path } from "./path";

/** An identifier waiting in the investigation queue. */
export interface Lead {
  identifier: Identifier;
  confidence: Confidence;
  path: Path;
  /** Found from a "probable" lead or one of its descendants (D25: one level only). */
  viaProbable: boolean;
  /** A relative of the volunteer: never investigated (T1). */
  thirdParty: boolean;
}

/** What the volunteer typed: confirmed by definition (CADRAGE.md, section 4). */
export function inputLead(identifier: Identifier): Lead {
  return { identifier, confidence: "confirme", path: startPath(identifier), viaProbable: false, thirdParty: false };
}

export function childLead(
  parent: Lead,
  sourceId: string,
  identifier: Identifier,
  confidence: Confidence,
  thirdParty: boolean,
): Lead {
  return {
    identifier,
    confidence,
    path: extendPath(parent.path, sourceId, identifier),
    // A confirmed value starts a new chain; anything else inherits the probable link.
    viaProbable: confidence !== "confirme" && (parent.confidence === "probable" || parent.viaProbable),
    thirdParty,
  };
}

/** Rules of CADRAGE.md, section 7, D25 and T1. A name relaunches only when confirmed (T2, to validate). */
export function canPivot(lead: Lead): boolean {
  if (lead.thirdParty) return false;
  if (lead.confidence === "confirme") return true;
  if (lead.confidence !== "probable") return false;
  if (lead.identifier.type === "NOM") return false;
  return !lead.viaProbable;
}
