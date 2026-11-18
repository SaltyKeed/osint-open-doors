import "server-only";
import type { Source } from "@/server/domain/source";
import { github } from "./github";
import { gravatar } from "./gravatar";
import { hudsonRock } from "./hudsonrock";
import { leakCheckPublic } from "./leakcheck";
import { leakLookup } from "./leaklookup";
import { platformProfiles } from "./profiles";
import { wayback } from "./wayback";
import { webSearch } from "./websearch";
import { whatsMyName } from "./whatsmyname";
import { xposedOrNot } from "./xposedornot";

/** Every source of the catalogue that has an adapter. A source without its key is skipped (T1). */
export const SOURCES: readonly Source[] = [xposedOrNot, leakCheckPublic, leakLookup, hudsonRock, gravatar, github, platformProfiles, whatsMyName, webSearch, wayback];
