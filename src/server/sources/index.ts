import "server-only";
import type { Source } from "@/server/domain/source";
import { emailDomain } from "./emaildomain";
import { github } from "./github";
import { gravatar } from "./gravatar";
import { hudsonRock } from "./hudsonrock";
import { keybase } from "./keybase";
import { leakCheckPublic } from "./leakcheck";
import { leakLookup } from "./leaklookup";
import { orcid } from "./orcid";
import { pgpKeys } from "./pgp";
import { phoneAnalysis } from "./phone";
import { platformProfiles } from "./profiles";
import { ransomwareLive } from "./ransomware";
import { rdap } from "./rdap";
import { searchCh } from "./searchch";
import { shab } from "./shab";
import { wayback } from "./wayback";
import { webSearch } from "./websearch";
import { whatsMyName } from "./whatsmyname";
import { wikidata } from "./wikidata";
import { xposedOrNot } from "./xposedornot";

/** Every source of the catalogue that has an adapter. A source without its key is skipped (T1). */
export const SOURCES: readonly Source[] = [
  // Breaches and infostealers
  xposedOrNot,
  leakCheckPublic,
  leakLookup,
  hudsonRock,
  // Email
  gravatar,
  github,
  pgpKeys,
  emailDomain,
  // Pseudo
  platformProfiles,
  whatsMyName,
  keybase,
  // Phone
  phoneAnalysis,
  searchCh,
  // Name
  orcid,
  wikidata,
  shab,
  // Web, domains and archives
  webSearch,
  rdap,
  ransomwareLive,
  wayback,
];
