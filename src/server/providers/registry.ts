import "server-only";
import { type AppMode, type Env, getEnv } from "@/server/env";
import { createGitHubProvider } from "./github";
import { gravatar } from "./gravatar";
import { leakCheck } from "./leakcheck";
import { orcid } from "./orcid";
import { pgpKeyserver } from "./pgp";
import { publicProfiles } from "./profiles";
import { rdap } from "./rdap";
import { createSearchChProvider } from "./searchch";
import { shab } from "./shab";
import { createTavilyProvider } from "./tavily";
import type { BreachProvider } from "./types";
import { whatsMyName } from "./whatsmyname";
import { wikidata } from "./wikidata";
import { xposedOrNot } from "./xposedornot";

// Adding a provider = one folder in providers/ and one line here.
function allProviders(env: Env): BreachProvider[] {
  return [
    // XposedOrNot first: when both report a breach, its version (with data types) is kept.
    xposedOrNot,
    leakCheck,
    createTavilyProvider(env.TAVILY_API_KEY),
    createSearchChProvider(env.SEARCH_CH_API_KEY),
    createGitHubProvider(env.GITHUB_TOKEN),
    gravatar,
    pgpKeyserver,
    rdap,
    whatsMyName,
    publicProfiles,
    orcid,
    wikidata,
    shab,
  ];
}

// The mode decides, not the presence of a key (D10, rule 2).
export function getActiveProviders(mode: AppMode, env: Env = getEnv()): BreachProvider[] {
  return allProviders(env).filter((p) => mode === "deep" || p.tier === "surface");
}
