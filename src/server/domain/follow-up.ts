import "server-only";
import { z } from "zod";
import { IDENTIFIER_TYPES, normalizeIdentifier, type Identifier } from "./identifier";

/** Limits of the second round (T9): the browser sends these lists, so their size is bounded. */
export const MAX_CONFIRMED_PROFILES = 60;
export const MAX_SEARCHED = 300;
/** Longest value accepted in either list: an address is the longest thing sent. */
const MAX_VALUE_LENGTH = 2048;

/** What the browser sends back to continue an investigation: the server keeps nothing between two requests. */
export interface FollowUp {
  /** Accounts the visitor confirmed after the first round. */
  confirmedProfiles: Identifier[];
  /** Identifiers the first round already searched. */
  searched: Identifier[];
}

const confirmedProfilesSchema = z
  .array(z.string().max(MAX_VALUE_LENGTH))
  .max(MAX_CONFIRMED_PROFILES)
  .default([])
  .transform((addresses, ctx): Identifier[] => {
    const profiles: Identifier[] = [];
    for (const address of addresses) {
      const profile = normalizeIdentifier("PROFIL", address);
      // No input in the message: it comes from the visitor.
      if (profile === null) ctx.addIssue({ code: "custom", message: "Invalid profile" });
      else profiles.push(profile);
    }
    return profiles;
  });

const searchedSchema = z
  .array(z.object({ type: z.enum(IDENTIFIER_TYPES), value: z.string().max(MAX_VALUE_LENGTH) }))
  .max(MAX_SEARCHED)
  .default([])
  .transform((items, ctx): Identifier[] => {
    const identifiers: Identifier[] = [];
    for (const item of items) {
      const identifier = normalizeIdentifier(item.type, item.value);
      if (identifier === null) ctx.addIssue({ code: "custom", message: "Invalid identifier" });
      else identifiers.push(identifier);
    }
    return identifiers;
  });

export const followUpSchema = z.object({
  confirmedProfiles: confirmedProfilesSchema,
  searched: searchedSchema,
});
