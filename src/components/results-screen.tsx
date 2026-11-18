"use client";

import { ArchiveX, BadgeCheck, Bug, ChevronDown, CircleHelp, Eye, EyeOff, KeyRound, ShieldAlert, UserCheck } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { CommuneReveal } from "@/components/commune-reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// Type-only imports: erased at build time, no server code reaches the browser.
import type { Confidence } from "@/server/domain/confidence";
import type {
  ArchiveCard,
  BreachCard,
  InfectionCard,
  InvestigationView,
  LeadProfile,
  PageCard,
  ProfileCard,
  SourceReport,
  ViewValue,
} from "@/server/investigation/view";

// Result screen of the first prototype (sandbox-v1), plugged into the investigation
// engine: headline, one tab per kind of result, leads apart, action plan on the side.

const VISIBLE = 6;
const ease = [0.2, 0, 0, 1] as const;

export function plural(n: number, singular: string, pluralForm = `${singular}s`): string {
  return `${n.toLocaleString("fr-CH")} ${n > 1 ? pluralForm : singular}`;
}

// ---------- small building blocks ----------

function DataBadges({ data }: { data: string[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Données exposées">
      {data.map((d) => (
        <li key={d}>
          {d.startsWith("mot") ? (
            <Badge variant="danger" size="lg">
              <KeyRound aria-hidden />
              Mot de passe exposé
            </Badge>
          ) : (
            <Badge variant="secondary" size="lg">
              {d}
            </Badge>
          )}
        </li>
      ))}
    </ul>
  );
}

function SourceLine({ item }: { item: { sources: string[]; path: string[] } }) {
  return (
    <p className="text-sm text-muted-foreground">
      Source : {item.sources.join(", ")} · trouvé grâce à : {item.path.join(" → ")}
    </p>
  );
}

function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  if (confidence === "confirme")
    return (
      <Badge variant="verified" size="lg">
        <BadgeCheck aria-hidden />
        Vérifié : relié à toi
      </Badge>
    );
  if (confidence === "probable")
    return (
      <Badge variant="probable" size="lg">
        <UserCheck aria-hidden />
        Probablement toi
      </Badge>
    );
  return (
    <Badge variant="unverified" size="lg">
      <CircleHelp aria-hidden />
      {confidence === "possible" ? "Non vérifié" : "Peut-être un homonyme"}
    </Badge>
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
  const rest = items.slice(VISIBLE);
  return (
    <div className="flex flex-col gap-4">
      {items.slice(0, VISIBLE).map(render)}
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

// Logo of the breached service (public HIBP asset). Hidden if it fails to load.
function BreachLogo({ logo }: { logo: string | null }) {
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

function BreachItem({ item }: { item: BreachCard }) {
  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex items-start gap-3">
          <BreachLogo logo={item.logo} />
          <div className="flex min-w-0 flex-col gap-1">
            <CardTitle>{item.name}</CardTitle>
            <CardDescription className="text-base">
              {[item.date, item.accounts && `${item.accounts} comptes`].filter(Boolean).join(" · ")}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {item.description && <p className="text-base text-muted-foreground">{item.description}</p>}
        {item.data.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-bold">Données exposées dans cette fuite :</p>
            <DataBadges data={item.data} />
          </div>
        )}
        <SourceLine item={item} />
      </CardContent>
    </Card>
  );
}

function InfectionItem({ item }: { item: InfectionCard }) {
  return (
    <Card size="sm" className="border-destructive">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <Bug className="size-5" aria-hidden />
          {item.label}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          {item.attributes.map((a) => (
            <div key={a.label} className="contents">
              <dt className="text-muted-foreground">{a.label}</dt>
              <dd>{a.value}</dd>
            </div>
          ))}
        </dl>
        <SourceLine item={item} />
      </CardContent>
    </Card>
  );
}

function BreachTab({ view }: { view: InvestigationView }) {
  const withPassword = view.summary.passwordBreaches;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-lg">
        Ces services ont été piratés et leurs données publiées.
        {withPassword > 0 && <strong> Ton mot de passe apparaît dans {plural(withPassword, "fuite")}.</strong>}
      </p>
      {view.infections.map((item, i) => (
        <Appear key={item.label} index={i}>
          <InfectionItem item={item} />
        </Appear>
      ))}
      {view.breaches.length > 0 && (
        // Licence CC BY 4.0 of the HIBP catalogue: the attribution must stay visible.
        <p className="text-sm text-muted-foreground">
          Descriptions des fuites complétées avec le catalogue public de Have I Been Pwned (licence CC BY 4.0).
        </p>
      )}
      <MoreList
        items={view.breaches}
        label="fuite"
        render={(item, i) => (
          <Appear key={item.name} index={i}>
            <BreachItem item={item} />
          </Appear>
        )}
        renderRest={(rest) => (
          // Beyond the first ones: a compact list reads faster than hundreds of cards.
          <ul className="flex flex-col" aria-label={`Autres fuites, ${rest.length} éléments`}>
            {rest.map((item) => (
              <li key={item.name} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b py-2">
                <span className="font-bold">{item.name}</span>
                {item.date && <span className="text-muted-foreground">{item.date}</span>}
                {item.passwordExposed && (
                  <Badge variant="danger">
                    <KeyRound aria-hidden />
                    Mot de passe
                  </Badge>
                )}
                <span className="text-sm text-muted-foreground">{item.data.filter((d) => !d.startsWith("mot")).join(", ")}</span>
                <span className="text-sm text-muted-foreground">Source : {item.sources.join(", ")}</span>
              </li>
            ))}
          </ul>
        )}
      />
    </div>
  );
}

function WebPageItem({ item }: { item: PageCard }) {
  return (
    <article className="flex flex-col gap-1.5">
      <div className="flex flex-wrap gap-1.5">
        <ConfidenceBadge confidence={item.confidence} />
      </div>
      <h4 className="text-lg font-bold">{item.title}</h4>
      {/* Addresses stay as text, never links: on the kiosk a link would leave the results. */}
      <p className="truncate text-sm text-muted-foreground">
        <span className="font-bold text-foreground">{item.site}</span> {item.url}
      </p>
      {item.excerpt && <p className="text-base">{item.excerpt}</p>}
      <SourceLine item={item} />
    </article>
  );
}

function WebList({ items, label }: { items: PageCard[]; label: string }) {
  return (
    <MoreList
      items={items}
      label={label}
      render={(item, i) => (
        <div key={`${item.url}-${i}`} className="flex flex-col gap-4">
          {i > 0 && <Separator />}
          <WebPageItem item={item} />
        </div>
      )}
    />
  );
}

function AccountTab({ items }: { items: ProfileCard[] }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {items.map((item, i) => (
        <Appear key={item.url} index={i}>
          <Card size="sm" className="h-full">
            <CardHeader>
              <CardTitle>{item.platform}</CardTitle>
              <CardDescription className="truncate text-base">{item.url}</CardDescription>
              <CardAction>
                <ConfidenceBadge confidence={item.confidence} />
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {item.attributes.length > 0 && (
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                  {item.attributes.map((a) => (
                    <div key={`${a.label}:${a.value}`} className="contents">
                      <dt className="text-muted-foreground">{a.label}</dt>
                      <dd className="break-words">{a.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              <SourceLine item={item} />
            </CardContent>
          </Card>
        </Appear>
      ))}
    </div>
  );
}

function ArchiveTab({ items }: { items: ArchiveCard[] }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-lg">Une page supprimée reste lisible dans les archives d&apos;Internet.</p>
      {items.map((item, i) => (
        <Appear key={item.target} index={i}>
          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArchiveX className="size-5" aria-hidden />
                {item.target}
              </CardTitle>
              <CardDescription className="text-base">
                Archivé {item.first === item.last ? `le ${item.first}` : `du ${item.first} au ${item.last}`}
              </CardDescription>
              <CardAction>
                <Badge variant="archived" size="lg">
                  {item.count ?? "?"} captures
                </Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-1.5">
              {item.link && <p className="truncate text-sm text-muted-foreground">{item.link}</p>}
              {item.pages && <p className="text-sm text-muted-foreground">Pages archivées : {item.pages}</p>}
              <SourceLine item={item} />
            </CardContent>
          </Card>
        </Appear>
      ))}
    </div>
  );
}

// Leads: accounts with the same pseudo. The same pseudo can belong to someone else.
function ProfileTab({ items }: { items: LeadProfile[] }) {
  const groups = new Map<string, LeadProfile[]>();
  for (const item of items) groups.set(item.pseudo, [...(groups.get(item.pseudo) ?? []), item]);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-lg">
        Un compte existe avec ce pseudo sur ces sites. Le même pseudo peut appartenir à quelqu&apos;un d&apos;autre :
        vérifie toi-même. Liste des sites : WhatsMyName (CC BY-SA 4.0) et API publiques des sites.
      </p>
      {[...groups.entries()].map(([pseudo, group]) => (
        <Card key={pseudo} size="sm">
          <CardHeader>
            <CardTitle>@{pseudo}</CardTitle>
            <CardDescription className="text-base">Trouvé grâce à : {group[0]?.path.join(" → ")}</CardDescription>
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
                  <span className="font-bold">{item.platform}</span>
                  {item.details.length > 0 && <span>{item.details.join(" · ")}</span>}
                  <span className="truncate text-sm text-muted-foreground">{item.url}</span>
                  <span className="text-sm text-muted-foreground">Source : {item.sources.join(", ")}</span>
                </p>
              )}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function NameTab({ pages }: { pages: PageCard[] }) {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-lg">
        Ce que n&apos;importe qui trouve en cherchant ton nom ou un pseudo courant. Ces résultats ne contiennent ni ton
        email ni ton numéro : certains parlent peut-être d&apos;un homonyme.
      </p>
      <WebList items={pages} label="page" />
    </div>
  );
}

// "Fiche de vie": every field, personal values masked behind the eye (T1).
function Value({ item, shown }: { item: ViewValue; shown: boolean }) {
  const [visible, setVisible] = useState(shown);
  return (
    <li className="rounded-lg border p-3">
      <div className="flex items-center gap-2">
        <span className="font-mono text-base break-all">{visible ? item.value : item.masked}</span>
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="text-muted-foreground hover:text-foreground"
          aria-label={visible ? "Masquer la valeur" : "Afficher la valeur"}
        >
          {visible ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
        </button>
        <span className="ml-auto">
          <ConfidenceBadge confidence={item.confidence} />
        </span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Source : {item.sources.join(", ")} · trouvé grâce à : {item.path.join(" → ")}
        {item.thirdParty && " · proche"}
      </p>
      {visible && item.attributes.length > 0 && (
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 text-sm">
          {item.attributes.map((a) => (
            <div key={`${a.label}:${a.value}`} className="contents">
              <dt className="text-muted-foreground">{a.label}</dt>
              <dd className="break-all">{a.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </li>
  );
}

function FicheTab({ view, shown }: { view: InvestigationView; shown: boolean }) {
  return (
    <div className="grid gap-4">
      {view.categories.map((category) => (
        <Card key={category.code} size="sm">
          <CardHeader>
            <CardTitle>
              {category.code}. {category.label}
            </CardTitle>
            <CardAction>
              <span className="text-sm text-muted-foreground">
                {category.filled} / {category.total} champs
              </span>
            </CardAction>
          </CardHeader>
          <CardContent>
            {category.fields.length === 0 ? (
              <p className="text-sm text-muted-foreground">Rien trouvé.</p>
            ) : (
              category.fields.map((field) => (
                <div key={field.code} className="mt-2 first:mt-0">
                  <h4 className="text-sm font-bold">
                    {field.code} · {field.label}
                  </h4>
                  <ul className="mt-1 grid gap-2">
                    {field.values.map((item) => (
                      // Changing "show all" remounts each value, so its eye starts from the new state.
                      <Value key={`${item.value}:${shown}`} item={item} shown={shown} />
                    ))}
                  </ul>
                  {field.hiddenCount > 0 && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      + {plural(field.hiddenCount, "résultat non confirmé", "résultats non confirmés")} (onglets « Pseudos » et « Avec ton nom »).
                    </p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// What each source answered: helps spot the useless ones.
const STATUS_LABELS: Record<SourceReport["status"], string> = {
  found: "A trouvé quelque chose",
  not_found: "Rien trouvé",
  unknown: "Réponse pas claire",
  quota: "Quota atteint",
  error: "N'a pas répondu",
  no_key: "Pas de clé",
  not_asked: "Pas interrogée",
};

function SourcesPanel({ report }: { report: SourceReport[] }) {
  const useless = report.filter((s) => s.records === 0).length;
  return (
    <details className="rounded-xl border bg-card p-4">
      <summary className="cursor-pointer text-lg font-bold">
        Détail par source ({plural(report.length, "source")}
        {useless > 0 ? `, dont ${useless} sans résultat` : ""})
      </summary>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-base">
          <thead className="text-sm text-muted-foreground">
            <tr className="border-b">
              <th className="py-2 pr-4 font-bold">Source</th>
              <th className="py-2 pr-4 font-bold">Résultats</th>
              <th className="py-2 font-bold">État</th>
            </tr>
          </thead>
          <tbody>
            {report.map((s) => (
              <tr key={s.label} className={s.records === 0 ? "border-b text-muted-foreground" : "border-b"}>
                <td className="py-2 pr-4 font-bold">{s.label}</td>
                <td className="py-2 pr-4">{s.records.toLocaleString("fr-CH")}</td>
                <td className="py-2">
                  {STATUS_LABELS[s.status]}
                  {s.status === "found" && s.problems > 0 ? ` (${plural(s.problems, "erreur")})` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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

export function ResultsScreen({
  view,
  searched,
  onReset,
}: {
  view: InvestigationView;
  searched: string[];
  onReset: () => void;
}) {
  const [shown, setShown] = useState(false);
  const s = view.summary;
  const leads = view.leads.profiles.length + view.leads.pages.length + view.leads.breaches.length;
  const failed = view.sourceReport.filter((r) => r.status === "error" || r.status === "quota").map((r) => r.label);

  const tabs: Tab[] = [
    { id: "breaches", label: "Fuites", count: s.breaches + s.infections, lead: false, content: <BreachTab view={view} /> },
    { id: "web", label: "Web vérifié", count: s.pages, lead: false, content: <WebList items={view.pages} label="page" /> },
    { id: "accounts", label: "Comptes", count: s.profiles, lead: false, content: <AccountTab items={view.profiles} /> },
    { id: "archives", label: "Archives", count: s.archives, lead: false, content: <ArchiveTab items={view.archives} /> },
    // The fiche always stays, even when the other tabs are empty.
    {
      id: "fiche",
      label: "Fiche de vie",
      count: view.categories.reduce((n, c) => n + c.filled, 0),
      lead: false,
      content: <FicheTab view={view} shown={shown} />,
    },
    { id: "profiles", label: "Pseudos", count: view.leads.profiles.length, lead: true, content: <ProfileTab items={view.leads.profiles} /> },
    { id: "name", label: "Avec ton nom", count: view.leads.pages.length, lead: true, content: <NameTab pages={view.leads.pages} /> },
    {
      id: "lead-breaches",
      label: "Fuites à vérifier",
      count: view.leads.breaches.length,
      lead: true,
      content: (
        <div className="flex flex-col gap-4">
          <p className="text-lg">
            Ces fuites contiennent ton pseudo (ou un nom identique au tien), mais ni ton email ni ton numéro : elles
            concernent peut-être quelqu&apos;un d&apos;autre.
          </p>
          <MoreList
            items={view.leads.breaches}
            label="fuite"
            render={(item, i) => (
              <Appear key={item.name} index={i}>
                <BreachItem item={item} />
              </Appear>
            )}
          />
        </div>
      ),
    },
  ].filter((t) => t.count > 0 || t.id === "fiche");
  const [tab, setTab] = useState(tabs[0]?.id ?? "fiche");

  const summary = [
    s.breaches > 0 && `${plural(s.breaches, "fuite")}${s.passwordBreaches > 0 ? ` (dont ${s.passwordBreaches} avec mot de passe)` : ""}`,
    s.infections > 0 && plural(s.infections, "ordinateur infecté", "ordinateurs infectés"),
    s.pages > 0 && plural(s.pages, "page vérifiée", "pages vérifiées"),
    s.profiles > 0 && plural(s.profiles, "compte"),
    s.archives > 0 && plural(s.archives, "archive"),
  ].filter(Boolean);
  const leadSummary = [
    view.leads.profiles.length > 0 && plural(view.leads.profiles.length, "compte avec ton pseudo", "comptes avec ton pseudo"),
    view.leads.pages.length > 0 && plural(view.leads.pages.length, "page avec ton nom", "pages avec ton nom"),
    view.leads.breaches.length > 0 && plural(view.leads.breaches.length, "fuite avec ton pseudo", "fuites avec ton pseudo"),
  ].filter(Boolean);

  return (
    <div className="grid w-full max-w-7xl grid-cols-1 gap-10 lg:grid-cols-12">
      <div className="flex flex-col gap-3 lg:col-span-12">
        <h1 id="screen-title" tabIndex={-1} className="font-heading text-5xl leading-[1.1] font-bold tracking-tight outline-none">
          {s.linked > 0 ? (
            <>
              <Highlighted>{s.linked.toLocaleString("fr-CH")}</Highlighted> élément{s.linked > 1 ? "s" : ""} public
              {s.linked > 1 ? "s" : ""} relié{s.linked > 1 ? "s" : ""} à toi
            </>
          ) : leads > 0 ? (
            "Rien de vérifié, mais il y a des pistes"
          ) : (
            "Rien de public n'a été trouvé avec ces informations"
          )}
        </h1>
        <p className="text-lg text-muted-foreground">Recherche pour {searched.join(", ")}</p>
        {summary.length > 0 && <p className="text-lg">{summary.join(", ")}.</p>}
        {leadSummary.length > 0 && <p className="text-lg">À vérifier : {leadSummary.join(", ")}.</p>}
        {s.linked === 0 && leads === 0 && (
          <p className="text-lg">Ça ne veut pas dire que rien n&apos;existe : nos sources ne voient pas tout.</p>
        )}
        {failed.length > 0 && (
          <p className="text-base text-muted-foreground">
            Le résultat peut être incomplet : {failed.join(", ")} {failed.length > 1 ? "n'ont" : "n'a"} pas répondu.
          </p>
        )}
      </div>

      {view.commune && (
        <div className="lg:col-span-12">
          <CommuneReveal commune={view.commune} hasAddress={true} />
        </div>
      )}

      <div className="flex min-w-0 flex-col gap-6 lg:col-span-8">
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
        <SourcesPanel report={view.sourceReport} />
      </div>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-8 lg:col-span-4 lg:self-start" aria-label="Plan d'action">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Ton plan d&apos;action</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="flex list-decimal flex-col gap-4 pl-5">
              {view.actions.map((action) => (
                <li key={action.id}>
                  <p className="text-lg font-bold">{action.title}</p>
                  <p className="text-base">{action.detail}</p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
        <Button variant="outline" size="lg" className="h-12 text-base" onClick={() => setShown((v) => !v)}>
          {shown ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
          {shown ? "Masquer les valeurs de la fiche" : "Afficher les valeurs de la fiche"}
        </Button>
        <Button onClick={onReset} size="lg" className="h-14 text-lg shadow-marker">
          Effacer et terminer
        </Button>
        <p className="text-sm text-muted-foreground">
          Tout est effacé avec ce bouton, ou après 2 minutes sans activité. Services qui ont reçu tes données :{" "}
          {view.services.join(", ") || "aucun"}.
        </p>
      </aside>
    </div>
  );
}
