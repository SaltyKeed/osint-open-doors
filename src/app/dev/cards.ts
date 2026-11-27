import type { Confidence } from "@/server/domain/confidence";
import type { Finding } from "@/server/domain/finding";

// Type import only: this file runs in the browser (nothing from src/server/ at runtime).

/** One thing the visitor confirms with one tick: an account (F2) or a directory entry (A1, B3, C1), T13. */
export interface Card {
  key: string;
  findings: Finding[];
}

/**
 * Identifies a finding on the screen. Two homonyms can share a name and a city, so the findings of a
 * directory card are told apart by the card key (the engine does the same). An account (F2) is told apart
 * by its address only, so that the same account found twice is one line.
 */
export function findingId(finding: Finding): string {
  const id = `${finding.field}
${finding.value}`;
  return finding.card && finding.field !== "F2" ? `${finding.card}|${id}` : id;
}

/** From the surest to the least sure, as in the domain (not imported: that file is server-only). */
const CONFIDENCE_ORDER: readonly Confidence[] = ["confirmed", "probable", "to_confirm", "possible", "namesake"];

/**
 * Two versions of the same finding become one: the sources of both, the surer level and the shorter path.
 * Used when a card the visitor confirms meets a finding already on the screen. The newer version gives the
 * details (breach, page, profile, card).
 */
export function mergeFinding(existing: Finding, incoming: Finding): Finding {
  const surer =
    CONFIDENCE_ORDER.indexOf(existing.confidence) <= CONFIDENCE_ORDER.indexOf(incoming.confidence)
      ? existing.confidence
      : incoming.confidence;
  return {
    ...existing,
    ...incoming,
    sources: [...new Set([...existing.sources, ...incoming.sources])],
    confidence: surer,
    path: incoming.path.length < existing.path.length ? incoming.path : existing.path,
  };
}

/** The findings to confirm, grouped by card, in the order they arrived. */
export function cardsToConfirm(findings: Iterable<Finding>): Card[] {
  const cards = new Map<string, Card>();
  for (const finding of findings) {
    if (finding.confidence !== "to_confirm" || !finding.card) continue;
    const card = cards.get(finding.card) ?? { key: finding.card, findings: [] };
    card.findings.push(finding);
    cards.set(finding.card, card);
  }
  return [...cards.values()];
}

/**
 * Ticked cards become confirmed. The card key is dropped, so that a finding the next round sends again
 * for the same value is the same line. The cards that were not ticked leave the list unless `dropOthers`
 * is false (the summary counts the ticked ones only).
 */
export function confirmCards(
  findings: readonly Finding[],
  ticked: ReadonlySet<string>,
  { dropOthers = true }: { dropOthers?: boolean } = {},
): Finding[] {
  return findings.flatMap((finding) => {
    if (finding.confidence !== "to_confirm" || !finding.card) return [finding];
    if (!ticked.has(finding.card)) return dropOthers ? [] : [finding];
    const confirmed: Finding = { ...finding, confidence: "confirmed" };
    delete confirmed.card;
    return [confirmed];
  });
}

/** Addresses of the ticked accounts: the only cards the engine searches again (T9). */
export function accountAddresses(cards: readonly Card[], ticked: ReadonlySet<string>): string[] {
  return cards
    .filter((card) => ticked.has(card.key))
    .flatMap((card) => card.findings.filter((f) => f.field === "F2").map((f) => f.value));
}
