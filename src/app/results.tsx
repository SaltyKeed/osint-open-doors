"use client";

import { type ReactNode, useState } from "react";
// Type-only imports: erased at build time, no server code reaches the browser.
import type {
  ArchiveCard,
  BreachCard,
  InfectionCard,
  InvestigationView,
  PageCard,
  ProfileCard,
  SourceReport,
  ViewValue,
} from "@/server/investigation/view";

// Result screen, laid out like the first prototype (sandbox-v1, results-screen.tsx):
// a headline with the number of findings, one tab per kind, the action plan on the side.

const VISIBLE = 6;

// ---------- icons (inline: no icon library) ----------

const icon = (path: ReactNode) =>
  function Icon({ className = "size-4" }: { className?: string }) {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        {path}
      </svg>
    );
  };
const ShieldIcon = icon(<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />);
const KeyIcon = icon(<><circle cx="8" cy="15" r="4" /><path d="M11 12l9-9M17 6l3 3" /></>);
const CheckIcon = icon(<path d="M5 12l5 5 9-10" />);
const HelpIcon = icon(<><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 015 .5c0 2-2.5 2-2.5 4M12 17h.01" /></>);
const ArchiveIcon = icon(<><rect x="3" y="4" width="18" height="5" rx="1" /><path d="M5 9v10h14V9M10 13h4" /></>);
const BugIcon = icon(<><rect x="7" y="7" width="10" height="13" rx="5" /><path d="M12 7V4M3 13h4M17 13h4M5 7l3 2M19 7l-3 2" /></>);

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      {!open && <path d="M3 3l18 18" />}
    </svg>
  );
}

// ---------- small building blocks ----------

const BADGE = {
  danger: "bg-red-100 text-red-900",
  neutral: "bg-zinc-100 text-zinc-800",
  verified: "bg-green-100 text-green-900",
  probable: "bg-amber-100 text-amber-900",
  archived: "bg-sky-100 text-sky-900",
};

function Badge({ tone, children }: { tone: keyof typeof BADGE; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-medium ${BADGE[tone]}`}>
      {children}
    </span>
  );
}

function ConfidenceBadge({ confidence }: { confidence: ViewValue["confidence"] }) {
  return confidence === "confirme" ? (
    <Badge tone="verified">
      <CheckIcon /> Vérifié : relié à toi
    </Badge>
  ) : (
    <Badge tone="probable">
      <HelpIcon /> Probablement toi
    </Badge>
  );
}

function SourceLine({ item }: { item: { sources: string[]; path: string[] } }) {
  return (
    <p className="text-sm text-zinc-500">
      Source : {item.sources.join(", ")} · trouvé grâce à : {item.path.join(" → ")}
    </p>
  );
}

function Card({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "danger" }) {
  const border = tone === "danger" ? "border-red-300 bg-red-50" : "border-zinc-200 bg-white";
  return <article className={`flex flex-col gap-3 rounded-xl border p-4 ${border}`}>{children}</article>;
}

/** The first items, the others behind "Voir les N autres" (a compact list when given). */
function MoreList<T>({
  items,
  label,
  render,
  renderRest,
}: {
  items: T[];
  label: string;
  render: (item: T, index: number) => ReactNode;
  renderRest?: (items: T[]) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rest = items.slice(VISIBLE);
  return (
    <div className="flex flex-col gap-4">
      {items.slice(0, VISIBLE).map(render)}
      {open && (renderRest ? renderRest(rest) : rest.map((item, i) => render(item, i + VISIBLE)))}
      {rest.length > 0 && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="self-start rounded-lg border border-zinc-300 px-4 py-2"
        >
          {open ? "Réduire" : `Voir ${rest.length === 1 ? `l'autre ${label}` : `les ${rest.length} autres ${label}s`}`}
        </button>
      )}
    </div>
  );
}

// ---------- one tab per kind of result ----------

function BreachLogo({ logo }: { logo: string | null }) {
  const [ok, setOk] = useState(true);
  if (!logo || !ok) {
    return (
      <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600" aria-hidden>
        <ShieldIcon className="size-6" />
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

function DataBadges({ data }: { data: string[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Données exposées">
      {data.map((d) => (
        <li key={d}>
          {d.startsWith("mot") ? (
            <Badge tone="danger">
              <KeyIcon /> Mot de passe exposé
            </Badge>
          ) : (
            <Badge tone="neutral">{d}</Badge>
          )}
        </li>
      ))}
    </ul>
  );
}

function BreachItem({ item }: { item: BreachCard }) {
  return (
    <Card>
      <div className="flex items-start gap-3">
        <BreachLogo logo={item.logo} />
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="text-lg font-bold">{item.name}</h3>
          <p className="text-zinc-600">{[item.date, item.accounts && `${item.accounts} comptes`].filter(Boolean).join(" · ")}</p>
        </div>
      </div>
      {item.description && <p className="text-zinc-700">{item.description}</p>}
      {item.data.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-bold">Données exposées dans cette fuite :</p>
          <DataBadges data={item.data} />
        </div>
      )}
      <SourceLine item={item} />
    </Card>
  );
}

function InfectionItem({ item }: { item: InfectionCard }) {
  return (
    <Card tone="danger">
      <h3 className="flex items-center gap-2 text-lg font-bold text-red-900">
        <BugIcon className="size-5" /> {item.label}
      </h3>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        {item.attributes.map((a) => (
          <div key={a.label} className="contents">
            <dt className="text-zinc-600">{a.label}</dt>
            <dd>{a.value}</dd>
          </div>
        ))}
      </dl>
      <SourceLine item={item} />
    </Card>
  );
}

function BreachTab({ breaches, infections, withPassword }: { breaches: BreachCard[]; infections: InfectionCard[]; withPassword: number }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-lg">
        Ces services ont été piratés et leurs données publiées.
        {withPassword > 0 && <strong> Ton mot de passe apparaît dans {withPassword} fuite{withPassword > 1 ? "s" : ""}.</strong>}
      </p>
      {infections.map((item) => (
        <InfectionItem key={item.label} item={item} />
      ))}
      <p className="text-sm text-zinc-500">
        Descriptions des fuites complétées avec le catalogue public de Have I Been Pwned (licence CC BY 4.0).
      </p>
      <MoreList
        items={breaches}
        label="fuite"
        render={(item) => <BreachItem key={item.name} item={item} />}
        renderRest={(rest) => (
          // Beyond the first ones: a compact list reads faster than hundreds of cards.
          <ul className="flex flex-col">
            {rest.map((item) => (
              <li key={item.name} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-zinc-200 py-2">
                <span className="font-bold">{item.name}</span>
                {item.date && <span className="text-zinc-500">{item.date}</span>}
                {item.passwordExposed && (
                  <Badge tone="danger">
                    <KeyIcon /> Mot de passe
                  </Badge>
                )}
                <span className="text-sm text-zinc-500">{item.data.filter((d) => !d.startsWith("mot")).join(", ")}</span>
                <span className="text-sm text-zinc-500">Source : {item.sources.join(", ")}</span>
              </li>
            ))}
          </ul>
        )}
      />
    </div>
  );
}

function PageItem({ item }: { item: PageCard }) {
  return (
    <article className="flex flex-col gap-1.5 border-b border-zinc-200 pb-4">
      <div>
        <ConfidenceBadge confidence={item.confidence} />
      </div>
      <h3 className="text-lg font-bold">{item.title}</h3>
      {/* Addresses stay as text, never links: on the kiosk a link would leave the results. */}
      <p className="truncate text-sm text-zinc-500">
        <span className="font-bold text-zinc-900">{item.site}</span> {item.url}
      </p>
      {item.excerpt && <p>{item.excerpt}</p>}
      <SourceLine item={item} />
    </article>
  );
}

function ProfileItem({ item }: { item: ProfileCard }) {
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-bold">{item.platform}</h3>
        <ConfidenceBadge confidence={item.confidence} />
      </div>
      <p className="truncate text-sm text-zinc-500">{item.url}</p>
      {item.attributes.length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          {item.attributes.map((a) => (
            <div key={`${a.label}:${a.value}`} className="contents">
              <dt className="text-zinc-600">{a.label}</dt>
              <dd className="break-words">{a.value}</dd>
            </div>
          ))}
        </dl>
      )}
      <SourceLine item={item} />
    </Card>
  );
}

function ArchiveItem({ item }: { item: ArchiveCard }) {
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-lg font-bold">
          <ArchiveIcon className="size-5" /> {item.target}
        </h3>
        <Badge tone="archived">{item.count ?? "?"} captures</Badge>
      </div>
      <p>
        Archivé {item.first === item.last ? `le ${item.first}` : `du ${item.first} au ${item.last}`}. Une page supprimée
        reste lisible dans l&apos;archive.
      </p>
      {item.link && <p className="truncate text-sm text-zinc-500">{item.link}</p>}
      {item.pages && <p className="text-sm text-zinc-500">Pages archivées : {item.pages}</p>}
      <SourceLine item={item} />
    </Card>
  );
}

// "Fiche de vie": every field, personal values masked behind the eye (T1).
function Value({ item, shown }: { item: ViewValue; shown: boolean }) {
  const [visible, setVisible] = useState(shown);
  return (
    <li className="rounded-lg border border-zinc-200 p-3">
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm break-all">{visible ? item.value : item.masked}</span>
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="text-zinc-500 hover:text-zinc-900"
          aria-label={visible ? "Masquer la valeur" : "Afficher la valeur"}
        >
          <EyeIcon open={visible} />
        </button>
        <span className="ml-auto">
          <ConfidenceBadge confidence={item.confidence} />
        </span>
      </div>
      <p className="mt-1 text-xs text-zinc-500">
        Source : {item.sources.join(", ")} · trouvé grâce à : {item.path.join(" → ")}
        {item.thirdParty && " · proche"}
      </p>
      {visible && item.attributes.length > 0 && (
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 text-xs">
          {item.attributes.map((a) => (
            <div key={`${a.label}:${a.value}`} className="contents">
              <dt className="text-zinc-500">{a.label}</dt>
              <dd className="break-all">{a.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </li>
  );
}

function FicheTab({ view, showAll }: { view: InvestigationView; showAll: boolean }) {
  return (
    <div className="grid gap-4">
      {view.categories.map((category) => (
        <section key={category.code} className="rounded-xl border border-zinc-200 p-4">
          <header className="flex items-baseline justify-between">
            <h3 className="font-semibold">
              {category.code}. {category.label}
            </h3>
            <span className="text-sm text-zinc-500">
              {category.filled} / {category.total} champs
            </span>
          </header>
          {category.fields.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-400">Rien trouvé.</p>
          ) : (
            category.fields.map((field) => (
              <div key={field.code} className="mt-3">
                <h4 className="text-sm font-medium">
                  {field.code} · {field.label}
                </h4>
                <ul className="mt-1 grid gap-2">
                  {field.values.map((item) => (
                    // Changing "show all" remounts each value, so its eye starts from the new state.
                    <Value key={`${item.value}:${showAll}`} item={item} shown={showAll} />
                  ))}
                </ul>
                {field.hiddenCount > 0 && (
                  <p className="mt-1 text-xs text-zinc-500">+ {field.hiddenCount} résultat(s) peu fiable(s), non affiché(s).</p>
                )}
              </div>
            ))
          )}
        </section>
      ))}
    </div>
  );
}

const SOURCE_STATUS: Record<SourceReport["status"], string> = {
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
    <details className="rounded-xl border border-zinc-200 p-4">
      <summary className="cursor-pointer text-lg font-bold">
        Détail par source ({report.length} sources{useless > 0 ? `, dont ${useless} sans résultat` : ""})
      </summary>
      <table className="mt-4 w-full text-left">
        <thead className="text-sm text-zinc-500">
          <tr className="border-b border-zinc-200">
            <th className="py-2 pr-4">Source</th>
            <th className="py-2 pr-4">Résultats</th>
            <th className="py-2">État</th>
          </tr>
        </thead>
        <tbody>
          {report.map((s) => (
            <tr key={s.label} className={`border-b border-zinc-200 ${s.records === 0 ? "text-zinc-500" : ""}`}>
              <td className="py-2 pr-4 font-bold">{s.label}</td>
              <td className="py-2 pr-4">{s.records.toLocaleString("fr-CH")}</td>
              <td className="py-2">
                {SOURCE_STATUS[s.status]}
                {s.problems > 0 && s.status === "found" ? ` (${s.problems} erreur(s))` : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

// ---------- layout ----------

type Tab = { id: string; label: string; count: number; content: ReactNode };

export function Results({ view, onReset }: { view: InvestigationView; onReset: () => void }) {
  const [showAll, setShowAll] = useState(false);
  const s = view.summary;
  const tabs: Tab[] = [
    {
      id: "breaches",
      label: "Fuites",
      count: s.breaches + s.infections,
      content: <BreachTab breaches={view.breaches} infections={view.infections} withPassword={s.passwordBreaches} />,
    },
    {
      id: "web",
      label: "Web",
      count: s.pages,
      content: <MoreList items={view.pages} label="page" render={(item) => <PageItem key={item.url} item={item} />} />,
    },
    {
      id: "profiles",
      label: "Comptes",
      count: s.profiles,
      content: <div className="grid gap-4 xl:grid-cols-2">{view.profiles.map((p) => <ProfileItem key={p.url} item={p} />)}</div>,
    },
    {
      id: "archives",
      label: "Archives",
      count: s.archives,
      content: <div className="grid gap-4">{view.archives.map((a) => <ArchiveItem key={a.target} item={a} />)}</div>,
    },
    // The fiche always stays, even when the other tabs are empty.
    { id: "fiche", label: "Fiche de vie", count: view.categories.reduce((n, c) => n + c.filled, 0), content: <FicheTab view={view} showAll={showAll} /> },
  ].filter((t) => t.count > 0 || t.id === "fiche");
  const [tab, setTab] = useState(tabs[0]?.id ?? "fiche");
  const current = tabs.find((t) => t.id === tab) ?? tabs[0];

  const summary = [
    s.breaches > 0 && `${s.breaches} fuite${s.breaches > 1 ? "s" : ""}${s.passwordBreaches > 0 ? ` (dont ${s.passwordBreaches} avec mot de passe)` : ""}`,
    s.infections > 0 && `${s.infections} ordinateur${s.infections > 1 ? "s" : ""} infecté${s.infections > 1 ? "s" : ""}`,
    s.pages > 0 && `${s.pages} page${s.pages > 1 ? "s" : ""} web`,
    s.profiles > 0 && `${s.profiles} compte${s.profiles > 1 ? "s" : ""}`,
    s.archives > 0 && `${s.archives} archive${s.archives > 1 ? "s" : ""}`,
  ].filter(Boolean);

  return (
    <main className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-10 p-6 lg:grid-cols-12">
      <div className="flex flex-col gap-3 lg:col-span-12">
        <h1 className="text-5xl leading-tight font-bold tracking-tight">
          {s.linked > 0 ? (
            <>
              <mark className="bg-yellow-300 px-2">{s.linked.toLocaleString("fr-CH")}</mark> élément{s.linked > 1 ? "s" : ""}{" "}
              public{s.linked > 1 ? "s" : ""} relié{s.linked > 1 ? "s" : ""} à toi
            </>
          ) : (
            "Rien de public n'a été relié à toi"
          )}
        </h1>
        {summary.length > 0 && <p className="text-lg">{summary.join(", ")}.</p>}
        {s.unconfirmed > 0 && (
          <p className="text-lg text-zinc-600">
            À vérifier : {s.unconfirmed} résultat{s.unconfirmed > 1 ? "s" : ""} trouvé{s.unconfirmed > 1 ? "s" : ""} seulement par ton
            nom ou un pseudo courant, peut-être un homonyme : non affiché{s.unconfirmed > 1 ? "s" : ""}.
          </p>
        )}
        {s.linked === 0 && <p className="text-lg">Ça ne veut pas dire que rien n&apos;existe : nos sources ne voient pas tout.</p>}
      </div>

      <div className="flex min-w-0 flex-col gap-6 lg:col-span-8">
        <div className="flex flex-wrap gap-1" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={t.id === current?.id}
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-4 py-2 text-base ${t.id === current?.id ? "bg-yellow-300 font-bold" : "hover:bg-zinc-100"}`}
            >
              {t.label} ({t.count.toLocaleString("fr-CH")})
            </button>
          ))}
        </div>
        <div role="tabpanel">{current?.content}</div>
        <SourcesPanel report={view.sourceReport} />
      </div>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-8 lg:col-span-4 lg:self-start" aria-label="Plan d'action">
        <section className="rounded-xl border border-zinc-200 p-5">
          <h2 className="text-2xl font-bold">Ton plan d&apos;action</h2>
          <ol className="mt-4 flex list-decimal flex-col gap-4 pl-5">
            {view.actions.map((action) => (
              <li key={action.id}>
                <p className="text-lg font-bold">{action.title}</p>
                <p>{action.detail}</p>
              </li>
            ))}
          </ol>
        </section>
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="flex items-center justify-center gap-2 rounded-lg border border-zinc-300 px-4 py-3"
        >
          <EyeIcon open={!showAll} />
          {showAll ? "Masquer les valeurs de la fiche" : "Afficher les valeurs de la fiche"}
        </button>
        <button type="button" onClick={onReset} className="rounded-lg bg-zinc-900 px-4 py-4 text-lg text-white">
          Effacer et terminer
        </button>
        <p className="text-sm text-zinc-500">
          Services qui ont reçu tes données : {view.services.join(", ") || "aucun"}. Rien n&apos;est enregistré.
        </p>
      </aside>
    </main>
  );
}
