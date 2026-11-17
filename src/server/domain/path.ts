import "server-only";
import type { Identifier } from "./identifier";

export interface PathStep {
  identifier: Identifier;
  /** "saisie" for the first step, else the id of the source that found it. */
  sourceId: string;
}

/** Read-only: one identifier gives several pivots, each keeps its own path. */
export type Path = readonly PathStep[];

export function startPath(identifier: Identifier): Path {
  return [{ identifier, sourceId: "saisie" }];
}

export function extendPath(path: Path, sourceId: string, identifier: Identifier): Path {
  return [...path, { identifier, sourceId }];
}
