import "server-only";
import type { Source } from "@/server/domain/source";
import { github } from "./github";
import { gravatar } from "./gravatar";
import { hudsonRock } from "./hudsonrock";
import { leakCheckPublic } from "./leakcheck";
import { leakLookup } from "./leaklookup";
import { wayback } from "./wayback";
import { webSearch } from "./websearch";
import { xposedOrNot } from "./xposedornot";

/** Every source of the catalogue that has an adapter. A source without its key is skipped (T1). */
export const SOURCES: readonly Source[] = [xposedOrNot, leakCheckPublic, leakLookup, hudsonRock, gravatar, github, webSearch, wayback];
