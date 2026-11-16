"use client";

import { ArchiveX, BadgeCheck, ChevronDown, CircleHelp, KeyRound, ShieldAlert, UserCheck } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { CommuneReveal } from "@/components/commune-reveal";
import { ExposureByType } from "@/components/exposure-by-type";
import { CATEGORY_LABELS, PROVIDER_LABELS, plural, sourceName } from "@/components/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// Type-only imports: erased at build time, no server code reaches the browser.
import type { Action } from "@/server/domain/actions";
import { sortCategories } from "@/server/domain/categories";
import type { Exposure } from "@/server/domain/exposure";
import type { ProviderStat } from "@/server/domain/stats";
import type {
  AccountFinding,
  BreachFinding,
  CountFinding,
  DataCategory,
  DirectoryFinding,
  Finding,
  ProfileFinding,
  WebFinding,
} from "@/server/domain/types";

export type SearchResponse = {
  mode: "surface" | "deep";
  searched: { email?: string; phone?: string; name?: string; username?: string };
  findings: Finding[];
  actions: Action[];
  exposure: Exposure[];
  queriedProviders: string[];
  failedProviders: string[];
  providerStats: ProviderStat[];
};

const VISIBLE = 6;
const ease = [0.2, 0, 0, 1] as const;

// ---------- small building blocks ----------

function Categories({ categories }: { categories: DataCategory[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Données exposées">
      {sortCategories(categories).map((category) => (
        <li key={category}>
          {category === "password" ? (
            <Badge variant="danger" size="lg">
              <KeyRound aria-hidden />
              Mot de passe exposé
            </Badge>
          ) : (
            <Badge variant="secondary" size="lg">
              {CATEGORY_LABELS[category]}
            </Badge>
          )}
        </li>
      ))}
    </ul>
  );
}

// Which provider found this result, and which others found it too (D26).
function sourceText(item: Pick<Finding, "providerId" | "alsoFoundBy">): string {
  const also = item.alsoFoundBy ?? [];
  return `Source : ${sourceName(item.providerId)}${also.length > 0 ? ` (aussi trouvé par ${also.map(sourceName).join(", ")})` : ""}`;
}

function SourceLine({ item }: { item: Pick<Finding, "providerId" | "alsoFoundBy"> }) {
  return <p className="text-sm text-muted-foreground">{sourceText(item)}</p>;
}

// Shows the first items, the others behind "Voir les N autres" (opens with a height animation).
function MoreList<T>({
  items,
  render,
  label,
  renderRest,
}: {
  items: T[];
  render: (item: T, index: number) => React.ReactNode;
  label: string;
  renderRest?: (items: T[]) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const first = items.slice(0, VISIBLE);
  const rest = items.slice(VISIBLE);
  return (
    <div className="flex flex-col gap-4">
      {first.map(render)}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="rest"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease }}
            className="flex flex-col gap-4 overflow-hidden"
          >
            {renderRest ? renderRest(rest) : rest.map((item, i) => render(item, i + VISIBLE))}
          </motion.div>
        )}
      </AnimatePresence>
      {rest.length > 0 && (
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="group h-11 self-start px-4 text-base"
        >
          {open ? "Réduire" : `Voir ${plural(rest.length, `autre ${label}`, `autres ${label}s`)}`}
          <ChevronDown className="transition-transform group-aria-expanded:rotate-180" aria-hidden />
        </Button>
      )}
    </div>
  );
}

function Appear({ index, children }: { index: number; children: React.ReactNode }) {
  // Only the first cards cascade: a longer cascade would make people wait.
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease, delay: index < 8 ? index * 0.04 : 0 }}
    >
      {children}
    </motion.div>
  );
}

// ---------- one tab per kind of result ----------

function sortBreaches(items: BreachFinding[]): BreachFinding[] {
  const hasPassword = (b: BreachFinding) => (b.categories.includes("password") ? 1 : 0);
  return [...items].sort((a, b) => hasPassword(b) - hasPassword(a) || (b.year ?? "").localeCompare(a.year ?? ""));
}

// Logo of the breached service (public HIBP asset). Hidden if it fails to load, so a
// missing logo never leaves a broken image on the kiosk.
function BreachLogo({ logo }: { logo?: string }) {
  const [ok, setOk] = useState(true);
  if (!logo || !ok) {
    return (
      <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground" aria-hidden>
        <ShieldAlert className="size-6" />
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logo}
      alt=""
      width={44}
      height={44}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setOk(false)}
      className="size-11 shrink-0 rounded-lg bg-white object-contain p-1"
    />
  );
}

function BreachCard({ item }: { item: BreachFinding }) {
  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex items-start gap-3">
          <BreachLogo logo={item.logo} />
          <div className="flex min-w-0 flex-col gap-1">
            <CardTitle>{item.title ?? item.source}</CardTitle>
            <CardDescription className="text-base">
              {[item.year, item.records && plural(item.records, "compte")].filter(Boolean).join(" · ")}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {item.notes && item.notes.length > 0 && (
          <p className="flex flex-wrap gap-2 text-sm font-bold text-destructive">
            {item.notes.map((note) => (
              <span key={note} className="rounded-full bg-destructive/10 px-2 py-0.5">
                {note}
              </span>
            ))}
          </p>
        )}
        {item.description && <p className="text-base text-muted-foreground">{item.description}</p>}
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-bold">Données exposées dans cette fuite :</p>
          <Categories categories={item.categories} />
        </div>
        <SourceLine item={item} />
      </CardContent>
    </Card>
  );
}

function BreachTab({ items }: { items: BreachFinding[] }) {
  const sorted = sortBreaches(items);
  const withPassword = items.filter((b) => b.categories.includes("password")).length;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-lg">
        Ces services ont été piratés et leurs données publiées. Seuls les types de données sont affichés.
        {withPassword > 0 && <strong> Ton mot de passe apparaît dans {plural(withPassword, "fuite")}.</strong>}
      </p>
      {items.some((b) => b.describedBy === "hibp") && (
        // Licence CC BY 4.0 of the HIBP catalog: the attribution must stay visible (D29).
        <p className="text-sm text-muted-foreground">
          Descriptions des fuites complétées avec le catalogue public de Have I Been Pwned (licence CC BY 4.0).
        </p>
      )}
      <MoreList
        items={sorted}
        label="fuite"
        render={(item, i) => (
          <Appear key={`${item.providerId}-${item.source}`} index={i}>
            <BreachCard item={item} />
          </Appear>
        )}
        renderRest={(rest) => (
          // Beyond the first ones: a compact list reads faster than hundreds of cards.
          <ul className="flex flex-col" aria-label={`Autres fuites, ${rest.length} éléments`}>
            {rest.map((item) => (
              <li key={`${item.providerId}-${item.source}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b py-2">
                <span className="font-bold">{item.title ?? item.source}</span>
                {item.year && <span className="text-muted-foreground">{item.year}</span>}
                <span className="text-sm text-muted-foreground">
                  {sortCategories(item.categories)
                    .map((c) => (c === "password" ? "Mot de passe exposé" : CATEGORY_LABELS[c]))
                    .join(", ")}
                </span>
                <span className="text-sm text-muted-foreground">{sourceText(item)}</span>
              </li>
            ))}
          </ul>
        )}
      />
    </div>
  );
}

function WebPageItem({ item }: { item: WebFinding }) {
  return (
    <article className="flex flex-col gap-1.5">
      <div className="flex flex-wrap gap-1.5">
        {item.verified ? (
          <Badge variant="verified" size="lg">
            <BadgeCheck aria-hidden />
            Vérifié : contient ton {item.matchedOn === "phone" ? "numéro" : "email"}
          </Badge>
        ) : (
          <Badge variant="unverified" size="lg">
            <CircleHelp aria-hidden />
            Non vérifié
          </Badge>
        )}
        {item.probable && (
          <Badge variant="probable" size="lg">
            <UserCheck aria-hidden />
            Probablement toi ({item.probableBecause})
          </Badge>
        )}
        {item.live === "gone" && (
          <Badge variant="archived" size="lg">
            <ArchiveX aria-hidden />
            Supprimée du site
          </Badge>
        )}
      </div>
      <h4 className="text-lg font-bold">{item.title}</h4>
      {/* Addresses stay as text, never links: on the kiosk a link would leave the results. */}
      <p className="truncate text-sm text-muted-foreground">
        <span className="font-bold text-foreground">{item.site}</span> {item.url}
      </p>
      {item.snippet && <p className="text-base">{item.snippet}</p>}
      <SourceLine item={item} />
      {item.archive && (
        <p className="text-sm text-muted-foreground">
          Archivée{" "}
          {item.archive.firstYear === item.archive.lastYear
            ? `en ${item.archive.firstYear}`
            : `de ${item.archive.firstYear} à ${item.archive.lastYear}`}
          {item.live === "gone" ? ", toujours lisible dans l'archive" : ""} : {item.archive.snapshotUrl}. Source :{" "}
          {sourceName("wayback")}
        </p>
      )}
    </article>
  );
}

function WebList({ items, label }: { items: WebFinding[]; label: string }) {
  return (
    <MoreList
      items={items}
      label={label}
      render={(item, i) => (
        <div key={item.url} className="flex flex-col gap-4">
          {i > 0 && <Separator />}
          <WebPageItem item={item} />
        </div>
      )}
    />
  );
}

function DirectoryTab({ items }: { items: DirectoryFinding[] }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-lg">N&apos;importe qui peut retrouver ces informations à partir de ton numéro.</p>
      {items.map((item, i) => (
        <Card key={i} size="sm">
          <CardHeader>
            <CardTitle>{item.source}</CardTitle>
            <CardDescription className="text-base">
              Ton inscription rend publics : {item.categories.map((c) => `${CATEGORY_LABELS[c]} : présente`).join(", ")}.
            </CardDescription>
            <SourceLine item={item} />
            <CardAction>
              {item.noPromo ? (
                <Badge variant="verified" size="lg">
                  <BadgeCheck aria-hidden />
                  Astérisque : pas de pub
                </Badge>
              ) : (
                <Badge variant="archived" size="lg">
                  Sans astérisque
                </Badge>
              )}
            </CardAction>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

function AccountTab({ items }: { items: AccountFinding[] }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {items.map((item, i) => (
        <Appear key={`${item.service}-${i}`} index={i}>
          <Card size="sm" className="h-full">
            <CardHeader>
              <CardTitle>{item.service}</CardTitle>
              <CardDescription className="text-base">{item.summary}</CardDescription>
              <SourceLine item={item} />
            </CardHeader>
            {item.categories.length > 0 && (
              <CardContent>
                <Categories categories={item.categories} />
              </CardContent>
            )}
          </Card>
        </Appear>
      ))}
    </div>
  );
}

function ProfileTab({ items }: { items: ProfileFinding[] }) {
  const groups = new Map<string, ProfileFinding[]>();
  for (const item of items) groups.set(`${item.username}|${item.origin}`, [...(groups.get(`${item.username}|${item.origin}`) ?? []), item]);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-lg">
        Un compte existe avec ce pseudo sur ces sites. Le même pseudo peut appartenir à quelqu&apos;un d&apos;autre :
        vérifie toi-même. Liste des sites : WhatsMyName (CC BY-SA 4.0) et API publiques des sites.
      </p>
      {[...groups.values()].map((group) => {
        const first = group[0];
        if (!first) return null;
        return (
          <Card key={`${first.username}-${first.origin}`} size="sm">
            <CardHeader>
              <CardTitle>@{first.username}</CardTitle>
              <CardDescription className="text-base">
                {first.origin === "pseudo"
                  ? "Le pseudo que tu as saisi"
                  : first.guessed
                    ? "Pseudo deviné à partir de ton nom : beaucoup de gens construisent leur pseudo ainsi, ce compte est peut-être celui d'un homonyme"
                    : `Rebond : pseudo trouvé grâce à ${first.origin}`}
              </CardDescription>
              <CardAction>
                <Badge variant="unverified" size="lg">
                  <CircleHelp aria-hidden />
                  {plural(group.length, "site")}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardContent>
              <MoreList
                items={group}
                label="site"
                render={(item) => (
                  <p key={item.url} className="flex flex-col">
                    <span className="font-bold">
                      {item.site} <span className="font-normal text-muted-foreground">({item.category})</span>
                    </span>
                    {item.details && item.details.length > 0 && <span>{item.details.join(" · ")}</span>}
                    <span className="truncate text-sm text-muted-foreground">{item.url}</span>
                    <span className="text-sm text-muted-foreground">{sourceText(item)}</span>
                  </p>
                )}
              />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function NameTab({ pages, counts }: { pages: WebFinding[]; counts: CountFinding[] }) {
  const sorted = [...pages].sort((a, b) => Number(Boolean(b.probable)) - Number(Boolean(a.probable)));
  return (
    <div className="flex flex-col gap-6">
      <p className="text-lg">
        Ce que n&apos;importe qui trouve en cherchant ton nom. Ces résultats ne contiennent ni ton email ni ton numéro :
        certains parlent peut-être d&apos;un homonyme. Les emails et numéros qu&apos;ils contiennent sont masqués.
      </p>
      {counts.map((count) => (
        // search.ch name results stay a total (condition of our API key).
        <p key={count.providerId} className="flex items-baseline gap-3 text-lg">
          <span className="bg-highlight px-2 font-heading text-4xl font-bold">{count.count.toLocaleString("fr-CH")}</span>
          {count.label}, sans détail. {sourceText(count)}.
        </p>
      ))}
      {sorted.length > 0 && <WebList items={sorted} label="page" />}
    </div>
  );
}

// What each provider brought to this search (D26): helps spot the useless ones.
const STATUS_LABELS: Record<ProviderStat["status"], string> = {
  ok: "A trouvé quelque chose",
  empty: "Rien trouvé",
  failed: "N'a pas répondu",
};

function SourcesPanel({ stats }: { stats: ProviderStat[] }) {
  const useless = stats.filter((s) => s.shown === 0).length;
  return (
    <details className="rounded-xl border bg-card p-4">
      <summary className="cursor-pointer text-lg font-bold">
        Détail par source ({plural(stats.length, "source")}
        {useless > 0 ? `, dont ${useless} sans résultat propre` : ""})
      </summary>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-base">
          <thead className="text-sm text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 pr-4 font-bold">Source</th>
              <th className="py-2 pr-4 font-bold">Résultats affichés</th>
              <th className="py-2 pr-4 font-bold">Aussi trouvés par une autre source</th>
              <th className="py-2 font-bold">État</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((stat) => (
              <tr key={stat.providerId} className={stat.shown === 0 ? "border-b text-muted-foreground" : "border-b"}>
                <td className="py-2 pr-4 font-bold">{sourceName(stat.providerId)}</td>
                <td className="py-2 pr-4">{stat.shown.toLocaleString("fr-CH")}</td>
                <td className="py-2 pr-4">{stat.duplicates.toLocaleString("fr-CH")}</td>
                <td className="py-2">{STATUS_LABELS[stat.status]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-sm text-muted-foreground">
          Un résultat trouvé par deux sources est affiché une seule fois, sous la première ; l&apos;autre est comptée dans
          « aussi trouvés ».
        </p>
      </div>
    </details>
  );
}

// ---------- summary and layout ----------

function Highlighted({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  // The signature moment: the highlighter strokes the number from left to right.
  return (
    <span className="relative inline-block px-2">
      <motion.span
        aria-hidden
        className="absolute inset-0 -z-10 bg-highlight"
        style={{ originX: 0 }}
        initial={reduced ? false : { scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.6, delay: 0.25, ease: [0.65, 0, 0.35, 1] }}
      />
      {children}
    </span>
  );
}

type Tab = { id: string; label: string; count: number; lead: boolean; content: React.ReactNode };

export function ResultsScreen({ result, onReset }: { result: SearchResponse; onReset: () => void }) {
  const byKind = <K extends Finding["kind"]>(kind: K) =>
    result.findings.filter((f): f is Extract<Finding, { kind: K }> => f.kind === kind);

  const breaches = byKind("breach");
  const webAll = byKind("web");
  const verifiedPages = webAll.filter((w) => w.verified);
  const namePages = webAll.filter((w) => !w.verified);
  const directory = byKind("directory");
  // The first listing whose commune was found: shown on the map (D27).
  const located = directory.find((d) => d.commune);
  const accounts = byKind("account");
  const profiles = byKind("profile");
  const ownProfiles = profiles.filter((p) => !p.guessed);
  const guessedProfiles = profiles.filter((p) => p.guessed);
  const counts = byKind("count");

  // "Linked to you" counts only proofs; username and name results are leads (D17, D19).
  const linked = breaches.length + verifiedPages.length + directory.length + accounts.length;
  const leads = profiles.length + namePages.length + counts.length;
  const breachSourceFailed = result.failedProviders.includes("xposedornot");
  const deletedButArchived = webAll.filter((f) => f.live === "gone" && f.archive).length;
  const searched = [result.searched.email, result.searched.phone, result.searched.name, result.searched.username].filter(Boolean);

  const tabs: Tab[] = [
    // First tab: everything found, sorted by kind of data (D30).
    {
      id: "types",
      label: "Par type de donnée",
      count: result.exposure.length,
      lead: false,
      content: <ExposureByType exposure={result.exposure} />,
    },
    { id: "breaches", label: "Fuites", count: breaches.length, lead: false, content: <BreachTab items={breaches} /> },
    { id: "web", label: "Web vérifié", count: verifiedPages.length, lead: false, content: <WebList items={verifiedPages} label="page" /> },
    { id: "directory", label: "Annuaire", count: directory.length, lead: false, content: <DirectoryTab items={directory} /> },
    { id: "accounts", label: "Comptes", count: accounts.length, lead: false, content: <AccountTab items={accounts} /> },
    { id: "profiles", label: "Pseudos", count: profiles.length, lead: true, content: <ProfileTab items={profiles} /> },
    {
      id: "name",
      label: "Avec ton nom",
      count: namePages.length + counts.length,
      lead: true,
      content: <NameTab pages={namePages} counts={counts} />,
    },
    // The "by data type" tab always stays, even empty, so the visitor knows why (D30).
  ].filter((t) => t.count > 0 || t.id === "types");
  const [tab, setTab] = useState(tabs[0]?.id ?? "");

  const summary = [
    breaches.length > 0 && plural(breaches.length, "fuite"),
    verifiedPages.length > 0 && plural(verifiedPages.length, "page vérifiée", "pages vérifiées"),
    directory.length > 0 && plural(directory.length, "inscription à l'annuaire", "inscriptions à l'annuaire"),
    accounts.length > 0 && plural(accounts.length, "compte ou trace", "comptes ou traces"),
  ].filter(Boolean);
  const leadSummary = [
    ownProfiles.length > 0 && plural(ownProfiles.length, "compte avec ton pseudo", "comptes avec ton pseudo"),
    guessedProfiles.length > 0 &&
      plural(guessedProfiles.length, "compte avec un pseudo deviné depuis ton nom", "comptes avec un pseudo deviné depuis ton nom"),
    namePages.length > 0 && plural(namePages.length, "page avec ton nom", "pages avec ton nom"),
  ].filter(Boolean);

  return (
    <div className="grid w-full max-w-7xl grid-cols-1 gap-10 lg:grid-cols-12">
      <div className="flex flex-col gap-3 lg:col-span-12">
        <h1 id="screen-title" tabIndex={-1} className="font-heading text-5xl leading-[1.1] font-bold tracking-tight outline-none">
          {linked > 0 ? (
            <>
              <Highlighted>{linked.toLocaleString("fr-CH")}</Highlighted> élément{linked > 1 ? "s" : ""} public
              {linked > 1 ? "s" : ""} relié{linked > 1 ? "s" : ""} à toi
            </>
          ) : breachSourceFailed ? (
            "Résultat incomplet"
          ) : leads > 0 ? (
            "Rien de vérifié, mais il y a des pistes"
          ) : (
            "Rien de public n'a été trouvé avec ces informations"
          )}
        </h1>
        <p className="text-lg text-muted-foreground">Recherche pour {searched.join(", ")}</p>
        {summary.length > 0 && <p className="text-lg">{summary.join(", ")}.</p>}
        {leadSummary.length > 0 && <p className="text-lg">À vérifier : {leadSummary.join(", ")}.</p>}
        {linked === 0 && breachSourceFailed && (
          <p className="text-lg">La vérification des fuites n&apos;a pas répondu. On ne peut pas dire si tes données ont fuité.</p>
        )}
        {linked === 0 && !breachSourceFailed && leads === 0 && (
          <p className="text-lg">Ça ne veut pas dire que rien n&apos;existe : nos sources ne voient pas tout.</p>
        )}
        {deletedButArchived > 0 && (
          <p className="text-lg font-bold">
            {plural(deletedButArchived, "page supprimée", "pages supprimées")} du web{" "}
            {deletedButArchived > 1 ? "restent lisibles" : "reste lisible"} dans les archives d&apos;Internet.
          </p>
        )}
        {result.failedProviders.length > 0 && (
          <p className="text-base text-muted-foreground">
            Le résultat peut être incomplet : {result.failedProviders.map((id) => PROVIDER_LABELS[id] ?? id).join(", ")}{" "}
            {result.failedProviders.length > 1 ? "n'ont" : "n'a"} pas répondu.
          </p>
        )}
      </div>

      {located?.commune && (
        <div className="lg:col-span-12">
          <CommuneReveal commune={located.commune} hasAddress={located.categories.includes("address")} />
        </div>
      )}

      <div className="flex min-w-0 flex-col gap-6 lg:col-span-8">
        {tabs.length > 0 && (
          <Tabs value={tab} onValueChange={setTab} className="gap-6">
            <TabsList className="h-auto flex-wrap justify-start gap-1 bg-transparent p-0 group-data-horizontal/tabs:h-auto">
              {tabs.map((t, i) => (
                <span key={t.id} className="flex items-center gap-1">
                  {t.lead && !tabs[i - 1]?.lead && i > 0 && <Separator orientation="vertical" className="mx-2 h-8" />}
                  <TabsTrigger
                    value={t.id}
                    className="h-11 flex-none px-4 text-base text-foreground data-active:bg-highlight data-active:text-highlight-foreground"
                  >
                    {t.lead && <CircleHelp aria-hidden />}
                    {t.label} ({t.count.toLocaleString("fr-CH")})
                  </TabsTrigger>
                </span>
              ))}
            </TabsList>
            {tabs.map((t) => (
              <TabsContent key={t.id} value={t.id}>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
                  {t.content}
                </motion.div>
              </TabsContent>
            ))}
          </Tabs>
        )}
        {result.providerStats.length > 0 && <SourcesPanel stats={result.providerStats} />}
      </div>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-8 lg:col-span-4 lg:self-start" aria-label="Plan d'action">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Ton plan d&apos;action</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="flex list-decimal flex-col gap-4 pl-5">
              {result.actions.map((action) => (
                <li key={action.id}>
                  <p className="text-lg font-bold">{action.title}</p>
                  <p className="text-base">{action.detail}</p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
        <Button onClick={onReset} size="lg" className="h-14 text-lg shadow-marker">
          Effacer et terminer
        </Button>
        <p className="text-sm text-muted-foreground">
          Tout est effacé avec ce bouton, ou après 2 minutes sans activité.
          <span aria-hidden> Mode {result.mode}.</span>
        </p>
      </aside>
    </div>
  );
}
