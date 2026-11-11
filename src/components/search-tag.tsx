"use client";

import { cva } from "class-variance-authority";
import { cn } from "cn";
import { ArrowLeftRight, AtSign, Calendar, ChevronsUpDown, Mail, MapPin, Phone, Scissors, User, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type EntryType, type NameSplit, splitName } from "@/lib/detect";
import { maskEmail, maskPhone } from "@/server/domain/masking";
import { normalizePhone } from "@/server/domain/phone";

export type Entry = {
  id: number;
  type: EntryType;
  value: string;
  alternatives: EntryType[];
  split?: NameSplit; // only for names
};

export const TYPE_INFO: Record<EntryType, { label: string; Icon: typeof Mail }> = {
  email: { label: "Email", Icon: Mail },
  phone: { label: "Téléphone", Icon: Phone },
  name: { label: "Prénom et nom", Icon: User },
  username: { label: "Pseudo", Icon: AtSign },
  city: { label: "Localité", Icon: MapPin },
  birthYear: { label: "Année de naissance", Icon: Calendar },
};

const isContext = (type: EntryType) => type === "city" || type === "birthYear";

// Search values on the highlighter; context values (city, year) in dashed outline:
// they only help to tell the visitor apart from homonyms.
const tagVariants = cva("flex min-h-10 items-center gap-1 rounded-lg py-1 pr-1 pl-1 text-base text-highlight-foreground", {
  variants: {
    kind: {
      search: "bg-highlight",
      context: "border-2 border-dashed border-primary/60 bg-accent",
    },
    armed: { true: "ring-3 ring-destructive ring-offset-2", false: "" },
    muted: { true: "opacity-60", false: "" },
  },
});

// Email and phone are masked once validated (CLAUDE.md invariant: displayed values are masked).
export function displayValue(entry: Entry): string {
  if (entry.type === "email") return maskEmail(entry.value);
  if (entry.type === "phone") {
    const e164 = normalizePhone(entry.value);
    return e164 ? maskPhone(e164) : entry.value;
  }
  return entry.value;
}

function TagButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" variant="tag" size="icon-sm" onClick={onClick} disabled={disabled} aria-label={label}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function SearchTag({
  entry,
  armed,
  contextIgnored,
  disabled,
  onSwitchType,
  onSwapName,
  onResplitName,
  onRemove,
}: {
  entry: Entry;
  armed: boolean;
  contextIgnored: boolean;
  disabled?: boolean;
  onSwitchType: () => void;
  onSwapName: () => void;
  onResplitName: () => void;
  onRemove: () => void;
}) {
  const { label, Icon } = TYPE_INFO[entry.type];
  const next = entry.alternatives[(entry.alternatives.indexOf(entry.type) + 1) % entry.alternatives.length];
  const canSwitch = entry.alternatives.length > 1 && next !== undefined;
  const name = entry.type === "name" ? splitName(entry.value, entry.split) : null;
  const words = entry.value.split(" ").length;

  return (
    <motion.span
      layout
      initial={{ opacity: 0, scale: 0.92, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ duration: 0.18, ease: [0.2, 0, 0, 1], layout: { duration: 0.2 } }}
      className={cn(tagVariants({ kind: isContext(entry.type) ? "context" : "search", armed, muted: contextIgnored }))}
    >
      {canSwitch ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="tag"
              size="sm"
              onClick={onSwitchType}
              disabled={disabled}
              aria-label={`Type : ${label}. Changer en ${TYPE_INFO[next].label}`}
              className="text-sm"
            >
              <Icon aria-hidden />
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={entry.type}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                >
                  {label}
                </motion.span>
              </AnimatePresence>
              <ChevronsUpDown aria-hidden />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Changer en {TYPE_INFO[next].label}</TooltipContent>
        </Tooltip>
      ) : (
        <span className="flex items-center gap-1.5 px-2 text-sm font-bold">
          <Icon className="size-4" aria-hidden />
          {label}
        </span>
      )}

      <span className="flex flex-col px-1 leading-tight">
        <span>{displayValue(entry)}</span>
        {name && (
          <span className="text-sm">
            Prénom : {name.firstName}, nom : {name.lastName}
          </span>
        )}
        {contextIgnored && <span className="text-sm">Utilisée seulement avec ton prénom et ton nom</span>}
      </span>

      {entry.type === "name" && (
        <TagButton label="Inverser prénom et nom" onClick={onSwapName} disabled={disabled}>
          <ArrowLeftRight aria-hidden />
        </TagButton>
      )}
      {entry.type === "name" && words > 2 && (
        <TagButton label="Changer le découpage du prénom" onClick={onResplitName} disabled={disabled}>
          <Scissors aria-hidden />
        </TagButton>
      )}
      <TagButton label={`Retirer l'étiquette ${label}`} onClick={onRemove} disabled={disabled}>
        <X aria-hidden />
      </TagButton>
    </motion.span>
  );
}
