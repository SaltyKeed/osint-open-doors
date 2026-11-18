import "server-only";
import type { Source } from "@/server/domain/source";
import { gravatar } from "./gravatar";
import { xposedOrNot } from "./xposedornot";

// A source that needs an API key is added here only when its key is set: without a key it is skipped (T3).
export const SOURCES: readonly Source[] = [xposedOrNot, gravatar];
