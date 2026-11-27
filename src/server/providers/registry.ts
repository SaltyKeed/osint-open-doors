import "server-only";
import type { Source } from "@/server/domain/source";
import { loadEnv } from "@/server/env";
import { github } from "./github";
import { gravatar } from "./gravatar";
import { hudsonRock } from "./hudsonrock";
import { profilePage } from "./profile-page";
import { searchCh } from "./searchch";
import { tavily } from "./tavily";
import { whatsMyName } from "./whatsmyname";
import { xposedOrNot } from "./xposedornot";

const env = loadEnv();

// A source that needs an API key is added here only when its key is set: without a key it is skipped (T3).
// GitHub works without its token, with a smaller quota.
export const SOURCES: readonly Source[] = [
  xposedOrNot,
  gravatar,
  hudsonRock,
  github(env.GITHUB_TOKEN),
  whatsMyName,
  profilePage,
  ...(env.TAVILY_API_KEY ? [tavily(env.TAVILY_API_KEY)] : []),
  ...(env.SEARCH_CH_API_KEY ? [searchCh(env.SEARCH_CH_API_KEY)] : []),
];
