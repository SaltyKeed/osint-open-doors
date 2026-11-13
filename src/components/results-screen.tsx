"use client";

import { ArchiveX, BadgeCheck, ChevronDown, CircleHelp, KeyRound, UserCheck } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { CATEGORY_LABELS, PROVIDER_LABELS, plural } from "@/components/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// Type-only imports: erased at build time, no server code reaches the browser.
import type { Action } from "@/server/domain/actions";
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
  queriedProviders: string[];
  failedProviders: string[];
};

const VISIBLE = 6;
const ease = [0.2, 0, 0, 1] as const;

// ---------- small building blocks ----------

function Categories({ categories }: { categories: DataCategory[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Données exposées">
      {categories.map((category) => (
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

function BreachCard({ item }: { item: BreachFinding }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{item.source}</CardTitle>
        <CardDescription className="text-base">
          {[item.year, item.records && plural(item.records, "compte")].filter(Boolean).join(", ")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Categories categories={item.categories} />
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
                <span className="font-bold">{item.source}</span>
                {item.year && <span className="text-muted-foreground">{item.year}</span>}
                <span className="text-sm text-muted-foreground">
                  {item.categories.map((c) => (c === "password" ? "Mot de passe exposé" : CATEGORY_LABELS[c])).join(", ")}
                </span>
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
      {item.archive && (
        <p className="text-sm text-muted-foreground">
          Archivée{" "}
          {item.archive.firstYear === item.archive.lastYear
            ? `en ${item.archive.firstYear}`
            : `de ${item.archive.firstYear} à ${item.archive.lastYear}`}
          {item.live === "gone" ? ", toujours lisible dans l'archive" : ""} : {item.archive.snapshotUrl}
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
                {first.origin === "pseudo" ? "Le pseudo que tu as saisi" : `Rebond : pseudo trouvé grâce à ${first.origin}`}
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
          {count.label}, sans détail. Source : {count.source}.
        </p>
      ))}
      {sorted.length > 0 && <WebList items={sorted} label="page" />}
    </div>
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
  const accounts = byKind("account");
  const profiles = byKind("profile");
  const counts = byKind("count");

  // "Linked to you" counts only proofs; username and name results are leads (D17, D19).
  const linked = breaches.length + verifiedPages.length + directory.length + accounts.length;
  const leads = profiles.length + namePages.length + counts.length;
  const breachSourceFailed = result.failedProviders.includes("xposedornot");
  const deletedButArchived = webAll.filter((f) => f.live === "gone" && f.archive).length;
  const searched = [result.searched.email, result.searched.phone, result.searched.name, result.searched.username].filter(Boolean);

  const tabs: Tab[] = [
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
  ].filter((t) => t.count > 0);
  const [tab, setTab] = useState(tabs[0]?.id ?? "");

  const summary = [
    breaches.length > 0 && plural(breaches.length, "fuite"),
    verifiedPages.length > 0 && plural(verifiedPages.length, "page vérifiée", "pages vérifiées"),
    directory.length > 0 && plural(directory.length, "inscription à l'annuaire", "inscriptions à l'annuaire"),
    accounts.length > 0 && plural(accounts.length, "compte ou trace", "comptes ou traces"),
  ].filter(Boolean);
  const leadSummary = [
    profiles.length > 0 && plural(profiles.length, "compte avec ton pseudo", "comptes avec ton pseudo"),
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

      <div className="flex min-w-0 flex-col gap-6 lg:col-span-8">
        {tabs.length > 0 && (
          <Tabs value={tab} onValueChange={setTab} className="gap-6">
            <TabsList className="h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
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
