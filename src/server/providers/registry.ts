import "server-only";
import { type AppMode, type Env, getEnv } from "@/server/env";
import { createDeHashedProvider } from "./dehashed";
import { createGitHubProvider } from "./github";
import { gravatar } from "./gravatar";
import { hudsonRock } from "./hudsonrock";
import { createLeakCheckProvider } from "./leakcheck";
import { orcid } from "./orcid";
import { pgpKeyserver } from "./pgp";
import { publicProfiles } from "./profiles";
import { ransomwareLive } from "./ransomware";
import { rdap } from "./rdap";
import { createSearchChProvider } from "./searchch";
import { shab } from "./shab";
import { createTavilyProvider } from "./tavily";
import type { BreachProvider } from "./types";
import { whatsMyName } from "./whatsmyname";
import { wikidata } from "./wikidata";
import { xposedOrNot } from "./xposedornot";

// Adding a provider = one folder in providers/ and one line here.
function allProviders(env: Env, mode: AppMode): BreachProvider[] {
  return [
    // XposedOrNot first: when both report a breach, its version (with data types) is kept.
    xposedOrNot,
    // In deep mode, LeakCheck is also asked with the phone number (D29).
    createLeakCheckProvider(mode === "deep"),
    createTavilyProvider(env.TAVILY_API_KEY, env.USERNAME_GUESSES),
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
    // Deep mode only (D29): free sources about stolen data, no key.
    hudsonRock,
    ransomwareLive,
    // Paid (D31): registered only when its key is set. Still deep only (filter below).
    ...(env.DEHASHED_API_KEY ? [createDeHashedProvider(env.DEHASHED_API_KEY)] : []),
  ];
}

// The mode decides, not the presence of a key (D10, rule 2).
export function getActiveProviders(mode: AppMode, env: Env = getEnv()): BreachProvider[] {
  return allProviders(env, mode).filter((p) => mode === "deep" || p.tier === "surface");
}
