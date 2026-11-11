"use client";

import { AnimatePresence } from "motion/react";
import { useRef, useState } from "react";
import { type Entry, SearchTag, TYPE_INFO } from "@/components/search-tag";
import { detect, explainUnknown, splitEntries, splitName } from "@/lib/detect";

export type { Entry } from "@/components/search-tag";

let nextId = 1;

// Adds what was typed or pasted. One entry per type: a new email replaces the previous one.
export function addEntries(current: Entry[], text: string): { entries: Entry[]; unknown: string[] } {
  const unknown: string[] = [];
  let entries = current;
  for (const part of splitEntries(text)) {
    const detected = detect(part);
    if (!detected) {
      unknown.push(explainUnknown(part));
      continue;
    }
    const entry: Entry = { ...detected, id: nextId++ };
    if (entry.type === "name") entry.split = { firstNameWords: 1, lastFirst: false };
    entries = [...entries.filter((e) => e.type !== entry.type), entry];
  }
  return { entries, unknown };
}

// Converts the entries into the fields expected by POST /api/search.
export function entriesToPayload(entries: Entry[]) {
  const find = (type: Entry["type"]) => entries.find((e) => e.type === type);
  const name = find("name");
  const split = name ? splitName(name.value, name.split) : undefined;
  return {
    email: find("email")?.value,
    phone: find("phone")?.value,
    firstName: split?.firstName,
    lastName: split?.lastName,
    username: find("username")?.value,
    city: find("city")?.value,
    birthYear: find("birthYear")?.value,
  };
}

export function SearchBar({
  entries,
  onEntriesChange,
  text,
  onTextChange,
  onUnknown,
  onAnnounce,
  contextIgnored,
  disabled,
}: {
  entries: Entry[];
  onEntriesChange: (entries: Entry[]) => void;
  text: string;
  onTextChange: (text: string) => void;
  onUnknown: (messages: string[]) => void;
  onAnnounce: (message: string) => void;
  contextIgnored: boolean;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  // Backspace on an empty field first marks the last tag, a second press removes it.
  const [armedId, setArmedId] = useState<number | null>(null);

  function commit(value: string) {
    if (value.trim() === "") return;
    const result = addEntries(entries, value);
    const added = result.entries.filter((e) => !entries.includes(e));
    onEntriesChange(result.entries);
    onUnknown(result.unknown);
    // Unrecognized text stays in the field so it can be corrected.
    onTextChange(result.unknown.length > 0 ? splitEntries(value).filter((p) => !detect(p)).join(", ") : "");
    // The type is announced, never the value (public kiosk, screen reader).
    if (added.length > 0) onAnnounce(`Étiquette ajoutée : ${added.map((e) => TYPE_INFO[e.type].label).join(", ")}`);
  }

  function remove(entry: Entry) {
    onEntriesChange(entries.filter((e) => e.id !== entry.id));
    onAnnounce(`Étiquette retirée : ${TYPE_INFO[entry.type].label}`);
    onUnknown([]);
    setArmedId(null);
    inputRef.current?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if ((event.key === "Enter" || event.key === "Tab" || event.key === ",") && text.trim() !== "") {
      event.preventDefault();
      commit(text);
      return;
    }
    if (event.key === "Backspace" && text === "" && entries.length > 0) {
      const last = entries[entries.length - 1];
      if (!last) return;
      if (armedId === last.id) {
        remove(last);
      } else {
        setArmedId(last.id);
        onAnnounce(`Appuie encore une fois pour retirer l'étiquette ${TYPE_INFO[last.type].label}`);
      }
      return;
    }
    setArmedId(null);
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
    const replaced = entries.some((e) => e.id !== entry.id && e.type === type);
    // One entry per type: switching replaces another entry of the target type.
    onEntriesChange(
      entries
        .filter((e) => e.id === entry.id || e.type !== type)
        .map((e) =>
          e.id === entry.id
            ? { ...e, type, split: type === "name" ? { firstNameWords: 1, lastFirst: false } : undefined }
            : e,
        ),
    );
    onAnnounce(`Type changé : ${TYPE_INFO[type].label}${replaced ? " (remplace l'étiquette précédente)" : ""}`);
  }

  function updateSplit(entry: Entry, change: (split: NonNullable<Entry["split"]>) => NonNullable<Entry["split"]>) {
    const split = entry.split ?? { firstNameWords: 1, lastFirst: false };
    onEntriesChange(entries.map((e) => (e.id === entry.id ? { ...e, split: change(split) } : e)));
    const next = splitName(entry.value, change(split));
    onAnnounce(`Prénom : ${next.firstName}, nom : ${next.lastName}`);
  }

  return (
    <div
      className="flex min-h-20 w-full cursor-text flex-wrap items-center gap-2 rounded-2xl border-[3px] border-primary bg-card px-3 py-3 shadow-marker transition-shadow focus-within:shadow-marker-lg"
      onClick={() => inputRef.current?.focus()}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {entries.map((entry) => (
          <SearchTag
            key={entry.id}
            entry={entry}
            armed={armedId === entry.id}
            contextIgnored={contextIgnored && (entry.type === "city" || entry.type === "birthYear")}
            disabled={disabled}
            onSwitchType={() => switchType(entry)}
            onSwapName={() => updateSplit(entry, (s) => ({ ...s, lastFirst: !s.lastFirst }))}
            onResplitName={() =>
              updateSplit(entry, (s) => ({
                ...s,
                firstNameWords: (s.firstNameWords % (entry.value.split(" ").length - 1)) + 1,
              }))
            }
            onRemove={() => remove(entry)}
          />
        ))}
      </AnimatePresence>
      <input
        ref={inputRef}
        value={text}
        onChange={(e) => {
          onTextChange(e.target.value);
          setArmedId(null);
        }}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        disabled={disabled}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        aria-label="Ce que tu veux tester : email, téléphone, prénom et nom, ou pseudo. Entrée pour valider."
        aria-describedby="search-help"
        placeholder={entries.length === 0 ? "Tape ton email, ton numéro, ton prénom et nom ou ton pseudo" : "Ajouter autre chose…"}
        className="min-w-56 flex-1 bg-transparent px-2 py-2 text-xl outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
