"use client";

import {
  AtSign,
  Briefcase,
  Cake,
  ChevronDown,
  CircleHelp,
  CreditCard,
  EyeOff,
  HeartPulse,
  House,
  IdCard,
  Image,
  KeyRound,
  type LucideIcon,
  Mail,
  MapPin,
  MessagesSquare,
  MonitorSmartphone,
  Network,
  Phone,
  Share2,
  ShoppingBag,
  User,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRef, useState } from "react";
import { CATEGORY_ADVICE, CATEGORY_LABELS, CATEGORY_RISKS, plural, sourceName } from "@/components/labels";
import { Button } from "@/components/ui/button";
// Type-only imports: erased at build time, no server code reaches the browser.
import type { Exposure, ExposureSource } from "@/server/domain/exposure";
import type { DataCategory } from "@/server/domain/types";

const ICONS: Record<DataCategory, LucideIcon> = {
  password: KeyRound,
  financial: CreditCard,
  governmentId: IdCard,
  health: HeartPulse,
  privateLife: EyeOff,
  messages: MessagesSquare,
  address: House,
  phone: Phone,
  birthDate: Cake,
  ipAddress: Network,
  device: MonitorSmartphone,
  location: MapPin,
  photo: Image,
  work: Briefcase,
  social: Share2,
  activity: ShoppingBag,
  name: User,
  username: AtSign,
  email: Mail,
  other: CircleHelp,
};

// The data that hurts the most: marked "Grave" (a word, never the color alone, D22).
const SERIOUS = new Set<DataCategory>(["password", "financial", "governmentId", "health", "privateLife", "messages"]);

const VISIBLE_ROWS = 8;
const ease = [0.2, 0, 0, 1] as const;

function howFound(source: ExposureSource): string {
  if (source.kind === "directory") return "annuaire public";
  if (source.kind === "account") return "compte en ligne";
  return source.matchedOn === "phone" ? "trouvée avec ton numéro" : "trouvée avec ton email";
}

function TypeTile({
  exposure,
  selected,
  onSelect,
}: {
  exposure: Exposure;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = ICONS[exposure.category];
  const serious = SERIOUS.has(exposure.category);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={[
        "flex min-h-24 flex-col items-start justify-between gap-2 rounded-xl border p-3 text-left transition-colors",
        "focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none",
        selected
          ? "border-highlight bg-highlight text-highlight-foreground"
          : serious
            ? "border-destructive bg-card hover:bg-muted"
            : "bg-card hover:bg-muted",
      ].join(" ")}
    >
      <span className="flex w-full items-center gap-2">
        <Icon className="size-5 shrink-0" aria-hidden />
        <span className="text-base leading-tight font-bold">{CATEGORY_LABELS[exposure.category]}</span>
      </span>
      <span className="flex w-full items-end justify-between gap-2">
        <span className="font-heading text-3xl leading-none font-bold">{exposure.sources.length.toLocaleString("fr-CH")}</span>
        {serious && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold ${selected ? "bg-highlight-foreground text-highlight" : "bg-destructive text-white"}`}
          >
            Grave
          </span>
        )}
      </span>
    </button>
  );
}

function SourceList({ sources }: { sources: ExposureSource[] }) {
  const [all, setAll] = useState(false);
  const shown = all ? sources : sources.slice(0, VISIBLE_ROWS);
  return (
    <div className="flex flex-col gap-3">
      <ol className="flex flex-col divide-y rounded-xl border bg-card">
        {shown.map((source, i) => (
          <li key={`${source.providerId}-${source.label}-${i}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-4 py-3">
            <span className="min-w-0 flex-1 truncate text-lg font-bold">{source.label}</span>
            <span className="font-heading text-lg tabular-nums">{source.year ?? "date inconnue"}</span>
            <span className="w-full text-sm text-muted-foreground">
              {howFound(source)} · source : {sourceName(source.providerId)}
            </span>
          </li>
        ))}
      </ol>
      {sources.length > VISIBLE_ROWS && (
        <Button type="button" variant="outline" onClick={() => setAll((a) => !a)} aria-expanded={all} className="group h-11 self-start px-4 text-base">
          {all ? "Afficher moins" : `Afficher les ${sources.length - VISIBLE_ROWS} autres`}
          <ChevronDown className="transition-transform group-aria-expanded:rotate-180" aria-hidden />
        </Button>
      )}
    </div>
  );
}

function TypeDetail({ exposure }: { exposure: Exposure }) {
  const Icon = ICONS[exposure.category];
  const label = CATEGORY_LABELS[exposure.category];
  const breaches = exposure.sources.filter((s) => s.kind === "breach").length;
  const others = exposure.sources.length - breaches;
  const where = [
    breaches > 0 && plural(breaches, "fuite"),
    others > 0 && plural(others, "autre source", "autres sources"),
  ].filter(Boolean);
  return (
    <section className="flex flex-col gap-4" aria-live="polite" aria-labelledby="type-detail-title">
      <div className="flex items-start gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-highlight text-highlight-foreground" aria-hidden>
          <Icon className="size-6" />
        </span>
        <div className="flex flex-col gap-1">
          <h3 id="type-detail-title" className="font-heading text-2xl leading-tight font-bold">
            {label}
          </h3>
          <p className="text-lg font-bold">
            Dans {where.join(" et ")}
            {exposure.latestYear ? `, la plus récente en ${exposure.latestYear}` : ""}.
          </p>
          <p className="text-lg">{CATEGORY_RISKS[exposure.category]}</p>
        </div>
      </div>
      <p className="rounded-xl border-l-4 border-highlight bg-card px-4 py-3 text-lg">
        <strong>À faire : </strong>
        {CATEGORY_ADVICE[exposure.category]}
      </p>
      <SourceList key={exposure.category} sources={exposure.sources} />
    </section>
  );
}

// The results seen by kind of data (D30): one tile per kind, the list of the breaches
// and sources for the selected one.
export function ExposureByType({ exposure }: { exposure: Exposure[] }) {
  const [selected, setSelected] = useState<DataCategory | undefined>(exposure[0]?.category);
  const reduced = useReducedMotion();
  const detailRef = useRef<HTMLDivElement>(null);
  // The list changes below the tiles: bring it into view, without jumping if it is visible.
  const choose = (category: DataCategory) => {
    setSelected(category);
    requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "nearest" }));
  };
  const current = exposure.find((e) => e.category === selected) ?? exposure[0];
  if (!current) {
    return (
      <p className="rounded-xl border bg-card px-4 py-3 text-lg">
        Aucune donnée qui a fuité n&apos;est reliée à toi avec ces informations. Les fuites se trouvent surtout avec{" "}
        <strong>ton email</strong> et <strong>ton numéro de téléphone</strong> : ajoute-les à la recherche pour voir quels
        types de données (mot de passe, adresse, téléphone…) ont fuité.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-lg">
        Voici les types de données qui ont fuité, les plus graves en premier. Le chiffre indique dans combien de fuites ou
        de sources chacun apparaît. <strong>Choisis un type</strong> pour voir où il a fuité. Seul le type est connu, jamais
        la valeur.
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4" role="group" aria-label="Types de données">
        {exposure.map((item) => (
          <TypeTile
            key={item.category}
            exposure={item}
            selected={item.category === current.category}
            onSelect={() => choose(item.category)}
          />
        ))}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          ref={detailRef}
          className="scroll-mt-20"
          key={current.category}
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? undefined : { opacity: 0, y: -4 }}
          transition={{ duration: 0.18, ease }}
        >
          <TypeDetail exposure={current} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
