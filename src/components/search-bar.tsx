"use client";

import { ArrowLeftRight, AtSign, Calendar, Mail, MapPin, Phone, User, X } from "lucide-react";
import { useRef, useState } from "react";
import { type Detected, detect, type EntryType, splitEntries, splitName } from "@/lib/detect";

export type Entry = Detected & { id: number };

const TYPE_INFO: Record<EntryType, { label: string; Icon: typeof Mail }> = {
  email: { label: "Email", Icon: Mail },
  phone: { label: "Téléphone", Icon: Phone },
  name: { label: "Prénom et nom", Icon: User },
  username: { label: "Pseudo", Icon: AtSign },
  city: { label: "Localité", Icon: MapPin },
  birthYear: { label: "Année de naissance", Icon: Calendar },
};

let nextId = 1;

// Adds entries to the list. One entry per type: a new email replaces the previous one.
export function addEntries(current: Entry[], text: string): { entries: Entry[]; unknown: string[] } {
  const unknown: string[] = [];
  let entries = current;
  for (const part of splitEntries(text)) {
    const detected = detect(part);
    if (!detected) {
      unknown.push(part);
      continue;
    }
    entries = [...entries.filter((e) => e.type !== detected.type), { ...detected, id: nextId++ }];
  }
  return { entries, unknown };
}

export function SearchBar({
  entries,
  onChange,
  disabled,
}: {
  entries: Entry[];
  onChange: (entries: Entry[]) => void;
  disabled?: boolean;
}) {
  const [text, setText] = useState("");
  const [unknown, setUnknown] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  function commit(value: string) {
    if (value.trim() === "") return;
    const result = addEntries(entries, value);
    onChange(result.entries);
    setUnknown(result.unknown);
    setText("");
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if ((event.key === "Enter" || event.key === "Tab" || event.key === ",") && text.trim() !== "") {
      event.preventDefault();
      commit(text);
    } else if (event.key === "Backspace" && text === "" && entries.length > 0) {
      onChange(entries.slice(0, -1));
    }
  }

  function onPaste(event: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData("text");
    if (/[,;\n]/.test(pasted)) {
      event.preventDefault();
      commit(pasted);
    }
  }

  function switchType(entry: Entry) {
    const index = entry.alternatives.indexOf(entry.type);
    const type = entry.alternatives[(index + 1) % entry.alternatives.length] ?? entry.type;
    // Keeping one entry per type: switching replaces another entry of the target type.
    onChange(entries.filter((e) => e.id === entry.id || e.type !== type).map((e) => (e.id === entry.id ? { ...e, type } : e)));
  }

  function swapName(entry: Entry) {
    const words = entry.value.split(" ");
    const swapped = [...words.slice(1), words[0]].join(" ");
    onChange(entries.map((e) => (e.id === entry.id ? { ...e, value: swapped } : e)));
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        className="flex min-h-20 w-full cursor-text flex-wrap items-center gap-2 rounded-2xl border-[3px] border-primary bg-card px-4 py-3 shadow-[6px_6px_0_0_var(--highlight)] focus-within:shadow-[8px_8px_0_0_var(--highlight)] transition-shadow"
        onClick={() => inputRef.current?.focus()}
      >
        {entries.map((entry) => {
          const { label, Icon } = TYPE_INFO[entry.type];
          const canSwitch = entry.alternatives.length > 1;
          return (
            <span
              key={entry.id}
              className="flex items-center gap-1 rounded-lg bg-highlight py-1 pr-1 pl-2 text-base text-highlight-foreground"
            >
              <button
                type="button"
                onClick={() => switchType(entry)}
                disabled={!canSwitch || disabled}
                className="flex items-center gap-1.5 rounded-md px-1 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-ring enabled:hover:bg-black/10"
                aria-label={canSwitch ? `${label} : cliquer pour changer le type` : label}
                title={canSwitch ? "Cliquer pour changer le type" : label}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </button>
              <span className="px-1">{entry.value}</span>
              {entry.type === "name" && (
                <button
                  type="button"
                  onClick={() => swapName(entry)}
                  disabled={disabled}
                  className="rounded-md p-1 outline-none focus-visible:ring-2 focus-visible:ring-ring hover:bg-black/10"
                  aria-label="Inverser prénom et nom"
                  title="Inverser prénom et nom"
                >
                  <ArrowLeftRight className="size-3.5" aria-hidden />
                </button>
              )}
              <button
                type="button"
                onClick={() => onChange(entries.filter((e) => e.id !== entry.id))}
                disabled={disabled}
                className="rounded-md p-1 outline-none focus-visible:ring-2 focus-visible:ring-ring hover:bg-black/10"
                aria-label={`Retirer ${entry.value}`}
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </span>
          );
        })}
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onBlur={() => commit(text)}
          disabled={disabled}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Ce que tu veux tester : email, téléphone, prénom et nom, pseudo"
          placeholder={entries.length === 0 ? "Tape ton email, ton numéro, ton nom ou ton pseudo" : "Ajouter autre chose…"}
          className="min-w-48 flex-1 bg-transparent py-2 text-xl outline-none placeholder:text-muted-foreground"
        />
      </div>
      {unknown.length > 0 && (
        <p role="alert" className="text-sm text-destructive">
          Pas reconnu : {unknown.join(", ")}. Essaie un email, un numéro suisse, un prénom et un nom, ou un pseudo
          sans espace.
        </p>
      )}
    </div>
  );
}

// Converts the entries into the fields expected by POST /api/search.
export function entriesToPayload(entries: Entry[]) {
  const value = (type: EntryType) => entries.find((e) => e.type === type)?.value;
  const name = value("name");
  const { firstName, lastName } = name ? splitName(name) : { firstName: undefined, lastName: undefined };
  return {
    email: value("email"),
    phone: value("phone"),
    firstName,
    lastName,
    username: value("username"),
    city: value("city"),
    birthYear: value("birthYear"),
  };
}

export { TYPE_INFO };
