import { isUsableHandle } from "./handles";
import { emailLocalPart } from "./pivots";
import type { SearchQuery } from "./types";

// Usernames guessed from the visitor's name and birth date (D28). People build their
// username from pieces of their identity: first name, a short form of the last name,
// a piece of the birth date, joined by "." or "_" ("leo.rct14", "jdupont05").
// The same recipe is used the other way round: a username found on the web is
// recognized and explained ("ton prénom + ton nom abrégé + ton jour de naissance").
// An account found this way is only a lead: anyone with the same name and birthday
// can own the same username.

export type UsernameInput = Pick<SearchQuery, "firstName" | "lastName" | "birthYear" | "birthDate" | "username" | "email">;

type Part = { value: string; label: string; weight: number; fromBirthDate?: boolean };

export type Candidate = {
  username: string;
  score: number;
  parts: Part[];
};

// Lower case, without accents, spaces, hyphens or apostrophes: "D'Agostino-Rey" -> "dagostinorey".
function compact(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

// "rochat" -> consonants without "h" ("rct"), all consonants ("rcht"), first three
// letters ("roc"), first and last letter ("rt"), initial ("r"). Only forms shorter
// than the name are kept.
export function lastNameShortForms(last: string): string[] {
  const consonants = last.charAt(0) + last.slice(1).replace(/[aeiouy]/g, "");
  const forms = [
    consonants.charAt(0) + consonants.slice(1).replace(/h/g, ""),
    consonants,
    last.slice(0, 3),
    last.charAt(0) + last.charAt(last.length - 1),
    last.charAt(0),
  ];
  return [...new Set(forms)].filter((f) => f.length > 0 && f.length < last.length);
}

// Pieces of the birth date, the most used first: "06", "14", "2006", "1403", "140306"...
export function numberParts(input: Pick<UsernameInput, "birthDate" | "birthYear">): string[] {
  return datePieces(input).map((p) => p.value);
}

function datePieces(input: Pick<UsernameInput, "birthDate" | "birthYear">): { value: string; label: string }[] {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.birthDate ?? "");
  const year = match?.[1] ?? input.birthYear;
  if (!year) return [];
  const yy = year.slice(2);
  const pieces = [
    { value: yy, label: "ton année de naissance" },
    ...(match ? [{ value: match[3] ?? "", label: "ton jour de naissance" }] : []),
    { value: year, label: "ton année de naissance" },
    ...(match
      ? [
          { value: `${match[3]}${match[2]}`, label: "ton jour et ton mois de naissance" },
          { value: `${match[3]}${match[2]}${yy}`, label: "ta date de naissance" },
          { value: `${match[2]}${match[3]}`, label: "ton mois et ton jour de naissance" },
          { value: match[2] ?? "", label: "ton mois de naissance" },
        ]
      : []),
  ];
  const seen = new Set<string>();
  return pieces.filter((p) => p.value && !seen.has(p.value) && seen.add(p.value));
}

// Each piece has a weight (how often people use it); a username's score is the
// product of its pieces. The weights are estimates, not measures.
const SEPARATORS: [string, number][] = [
  ["", 1],
  [".", 0.8],
  ["_", 0.6],
];

// Every username the recipe can build, best first, with the pieces it is made of.
export function usernameCandidates(input: UsernameInput): Candidate[] {
  const first = compact(input.firstName ?? "");
  const last = compact(input.lastName ?? "");
  if (!first || !last) return [];

  const firstForms: Part[] = [
    { value: first, label: "ton prénom", weight: 1 },
    { value: first.charAt(0), label: "l'initiale de ton prénom", weight: 0.6 },
  ];
  const lastForms: Part[] = [
    { value: last, label: "ton nom", weight: 1 },
    ...lastNameShortForms(last).map((f, i) => ({ value: f, label: "ton nom abrégé", weight: 0.5 - i * 0.05 })),
  ];
  const numbers: (Part | null)[] = [
    null,
    ...datePieces(input).map((p, i) => ({ ...p, weight: 0.7 - i * 0.07, fromBirthDate: true })),
  ];

  const best = new Map<string, Candidate>();
  const add = (username: string, score: number, parts: Part[]) => {
    if (!isUsableHandle(username)) return;
    const existing = best.get(username);
    if (!existing || score > existing.score) best.set(username, { username, score, parts });
  };

  for (const f of firstForms) {
    for (const l of lastForms) {
      // The full first name or the full last name must be there: "dtj" or "l.rt06"
      // say nothing about a person and would match strangers.
      if (f.value !== first && l.value !== last) continue;
      for (const [sep, sw] of SEPARATORS) {
        // An initial is glued to the name ("lrochat"), rarely "l.rochat".
        const s = f.value.length === 1 && sep !== "" ? sw * 0.5 : sw;
        for (const n of numbers) {
          const nw = n?.weight ?? 1;
          const nv = n?.value ?? "";
          const parts = n ? [f, l, n] : [f, l];
          add(`${f.value}${sep}${l.value}${nv}`, f.weight * l.weight * s * nw, parts);
          // The number after its own separator: "leo_rochat_2006".
          if (n && sep) add(`${f.value}${sep}${l.value}${sep}${nv}`, f.weight * l.weight * s * nw * 0.5, parts);
          // Last name first: "rochat.leo", "rochatleo06".
          add(`${l.value}${sep}${f.value}${nv}`, f.weight * l.weight * s * nw * 0.4, n ? [l, f, n] : [l, f]);
        }
      }
    }
  }
  return [...best.values()].sort((a, b) => b.score - a.score);
}

// The best guesses, without the username and email part the visitor already gave.
export function generateUsernames(input: UsernameInput, limit = 6): string[] {
  const known = new Set(
    [input.username, emailLocalPart(input.email)].filter((u): u is string => Boolean(u)).map((u) => u.toLowerCase()),
  );
  return usernameCandidates(input)
    .filter((c) => !known.has(c.username))
    .slice(0, limit)
    .map((c) => c.username);
}

export type HandleMatch = {
  handle: string;
  // "ton prénom (leo) + ton nom abrégé (rct) + ton jour de naissance (14)"
  explanation: string;
  // The username also contains a piece of the birth date: much less likely to be a homonym.
  usesBirthDate: boolean;
  // A piece of the birth date, or the full first AND last name: worth showing as
  // "probable". "leor" alone (first name + one letter) is not.
  strong: boolean;
};

// Is this username built from the visitor's identity? Returns how, or null.
export function recognizeHandle(handle: string, input: UsernameInput): HandleMatch | null {
  const wanted = handle.toLowerCase();
  const found = usernameCandidates(input).find((c) => c.username === wanted);
  if (!found) return null;
  const usesBirthDate = found.parts.some((p) => p.fromBirthDate);
  const labels = found.parts.map((p) => p.label);
  return {
    handle,
    explanation: found.parts.map((p) => `${p.label} (${p.value})`).join(" + "),
    usesBirthDate,
    strong: usesBirthDate || (labels.includes("ton prénom") && labels.includes("ton nom")),
  };
}
