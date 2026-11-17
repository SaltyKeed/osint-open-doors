// Shows, source by source, what the free sources answer for one email.
// The email is read from the DIAG_EMAIL environment variable, set by the person
// who runs the script for their own address. Nothing is written to disk.
//
//   PowerShell : $env:DIAG_EMAIL="moi@example.ch"; npm run diagnose:email
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";

const envFile = new URL("../.env.local", import.meta.url);
if (existsSync(envFile)) process.loadEnvFile(envFile);

const email = process.env.DIAG_EMAIL?.trim().toLowerCase();
if (!email) {
  console.log('Définis d\'abord l\'adresse : $env:DIAG_EMAIL="moi@example.ch"');
  process.exit(1);
}

const github = {
  Accept: "application/vnd.github+json",
  "User-Agent": "osint-open-doors",
  ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
};

async function call(name: string, url: string, headers: Record<string, string>, summary: (body: unknown) => string) {
  try {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(15_000) });
    const text = await response.text();
    let body: unknown = null;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
    console.log(`${name.padEnd(28)} HTTP ${response.status}  ${response.ok ? summary(body) : String(text).slice(0, 120)}`);
  } catch (error) {
    console.log(`${name.padEnd(28)} échec réseau : ${error instanceof Error ? error.message : "inconnu"}`);
  }
}

const q = encodeURIComponent(email);
const hash = createHash("sha256").update(email).digest("hex");
type Json = Record<string, unknown>;

await call("XposedOrNot (analyse)", `https://api.xposedornot.com/v1/breach-analytics?email=${q}`, {}, (b) => {
  const details = ((b as Json)?.ExposedBreaches as Json | undefined)?.breaches_details;
  return Array.isArray(details) ? `${details.length} fuite(s) : ${details.map((d) => (d as Json).breach).join(", ")}` : "aucune fuite";
});
await call("XposedOrNot (check-email)", `https://api.xposedornot.com/v1/check-email/${q}`, {}, (b) =>
  JSON.stringify(b).slice(0, 160),
);
await call("Hudson Rock", `https://cavalier.hudsonrock.com/api/json/v2/osint-tools/search-by-email?email=${q}`, {}, (b) => {
  const stealers = (b as Json)?.stealers;
  return Array.isArray(stealers) ? `${stealers.length} ordinateur(s) infecté(s)` : "rien";
});
await call("Gravatar", `https://api.gravatar.com/v3/profiles/${hash}`, {}, (b) => `profil : ${(b as Json)?.display_name ?? "sans nom"}`);
await call("GitHub (commits)", `https://api.github.com/search/commits?q=author-email:${q}&per_page=1`, github, (b) =>
  `${(b as Json)?.total_count ?? 0} commit(s)`,
);
await call("GitHub (email public)", `https://api.github.com/search/users?q=${q}+in:email`, github, (b) =>
  `${(b as Json)?.total_count ?? 0} compte(s)`,
);
