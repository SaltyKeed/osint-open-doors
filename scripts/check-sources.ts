// Checks from the current network (the open-doors PC) that every source host of
// docs/SOURCES.md can be reached. Run with `npm run check:sources`.
//
// Each host is called once, with a plain GET on the API path of the catalogue,
// cut before the first value: no API key and no personal data are sent. Any
// HTTP answer, even 401 or 404, proves the network lets the request through.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export interface Target {
  origin: string;
  /** API path of the first call found for this host, without query string. */
  url: string;
  /** Sources of the catalogue that call this host. */
  names: string[];
}

export type Verdict = "reachable" | "redirected" | "blocked";

export interface Probe {
  status?: number;
  location?: string;
  /** Error code (ENOTFOUND, TimeoutError…) when no HTTP answer came back. */
  error?: string;
}

const URL_PATTERN = /https?:\/\/[^\s`'"<>()[\]{}…]+/;

function cells(row: string): string[] {
  return row.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
}

function plainName(cell: string): string {
  return cell.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[`*]/g, "").trim();
}

/** One target per host, taken from the first URL of each table row (name column excluded). */
export function extractTargets(markdown: string): Target[] {
  const byOrigin = new Map<string, Target>();
  for (const line of markdown.split("\n")) {
    if (!line.trim().startsWith("|") || /^\|\s*-/.test(line.trim())) continue;
    const [nameCell = "", ...rest] = cells(line);
    const match = URL_PATTERN.exec(rest.join(" | "));
    if (!match) continue;
    const url = new URL(match[0]);
    const name = plainName(nameCell);
    const target = byOrigin.get(url.origin);
    if (target) {
      if (!target.names.includes(name)) target.names.push(name);
    } else {
      byOrigin.set(url.origin, { origin: url.origin, url: url.origin + url.pathname, names: [name] });
    }
  }
  return [...byOrigin.values()];
}

const ERROR_REASONS: Record<string, string> = {
  ENOTFOUND: "nom de domaine introuvable (DNS)",
  EAI_AGAIN: "nom de domaine introuvable (DNS)",
  ECONNREFUSED: "connexion refusée",
  ECONNRESET: "connexion coupée",
  ENETUNREACH: "réseau inaccessible",
  EHOSTUNREACH: "serveur inaccessible",
  TimeoutError: "pas de réponse en 10 secondes",
  UND_ERR_CONNECT_TIMEOUT: "pas de réponse en 10 secondes",
};

function errorReason(code: string): string {
  if (code in ERROR_REASONS) return ERROR_REASONS[code] ?? code;
  // A filtering proxy that opens HTTPS shows its own certificate.
  if (/CERT|SSL|TLS/i.test(code)) return `certificat refusé, proxy de filtrage probable (${code})`;
  return `erreur réseau (${code})`;
}

/** "about.gitlab.com" and "gitlab.com" share "gitlab.com". Enough for the hosts of the catalogue. */
function baseDomain(hostname: string): string {
  return hostname.split(".").slice(-2).join(".");
}

export function classify(origin: string, probe: Probe): { verdict: Verdict; detail: string } {
  if (probe.status === undefined) {
    return { verdict: "blocked", detail: errorReason(probe.error ?? "inconnue") };
  }
  if (probe.status >= 300 && probe.status < 400 && probe.location) {
    const target = new URL(probe.location, origin);
    const sameSite = baseDomain(target.hostname) === baseDomain(new URL(origin).hostname);
    if (!sameSite) {
      return { verdict: "redirected", detail: `HTTP ${probe.status} vers ${target.hostname} (page de filtrage ?)` };
    }
  }
  if (probe.status === 429) {
    return { verdict: "reachable", detail: "HTTP 429 : quota déjà atteint depuis cette adresse IP" };
  }
  return { verdict: "reachable", detail: `HTTP ${probe.status}` };
}

function errorCode(error: unknown): string {
  if (error instanceof Error) {
    const cause = error.cause as { code?: unknown } | undefined;
    if (typeof cause?.code === "string") return cause.code;
    return error.name;
  }
  return "inconnue";
}

async function probe(url: string): Promise<Probe> {
  try {
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
      headers: { "User-Agent": "osint-open-doors-network-check" },
    });
    await response.body?.cancel();
    return { status: response.status, location: response.headers.get("location") ?? undefined };
  } catch (error) {
    return { error: errorCode(error) };
  }
}

/** Public IP of this network, from ip-api.com (already in the catalogue). */
async function publicIp(): Promise<string> {
  try {
    const response = await fetch("http://ip-api.com/json/?fields=query,isp", {
      signal: AbortSignal.timeout(10_000),
    });
    const body = (await response.json()) as { query?: string; isp?: string };
    return `${body.query ?? "?"} (${body.isp ?? "fournisseur inconnu"})`;
  } catch {
    return "inconnue (ip-api.com injoignable)";
  }
}

async function main(): Promise<void> {
  const catalogue = readFileSync(new URL("../docs/SOURCES.md", import.meta.url), "utf8");
  const targets = extractTargets(catalogue);
  console.log(`Adresse IP publique : ${await publicIp()}`);
  console.log(`Test de ${targets.length} hôtes de docs/SOURCES.md…\n`);

  // A few requests at a time: fast, without looking like a scan.
  const results: { target: Target; verdict: Verdict; detail: string }[] = [];
  const queue = [...targets];
  await Promise.all(
    Array.from({ length: 6 }, async () => {
      for (let target = queue.shift(); target; target = queue.shift()) {
        // One retry: a host that is slow once is not blocked.
        let result = await probe(target.url);
        if (result.status === undefined) result = await probe(target.url);
        results.push({ target, ...classify(target.origin, result) });
      }
    }),
  );
  results.sort((a, b) => a.verdict.localeCompare(b.verdict) || a.target.origin.localeCompare(b.target.origin));

  const label: Record<Verdict, string> = { blocked: "BLOQUÉ", redirected: "À VOIR", reachable: "ok" };
  for (const { target, verdict, detail } of results) {
    const host = new URL(target.origin).host.padEnd(36);
    console.log(`${label[verdict].padEnd(9)} ${host} ${detail.padEnd(48)} ${target.names.join(", ")}`);
  }

  const blocked = results.filter((r) => r.verdict === "blocked").length;
  const redirected = results.filter((r) => r.verdict === "redirected").length;
  console.log(`\n${results.length - blocked - redirected} joignables, ${blocked} bloqués, ${redirected} redirigés.`);
  if (blocked > 0) console.log("Les hôtes bloqués sont à faire ouvrir par le service informatique.");
  // Some APIs redirect elsewhere on their own: compare with a run made at home.
  if (redirected > 0) console.log("Une redirection est normale si elle apparaît aussi depuis la maison.");
  process.exitCode = blocked > 0 ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
