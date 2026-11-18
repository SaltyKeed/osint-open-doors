import type { SourceRecord } from "@/server/domain/source";
import type { TavilyResponse } from "./schema";

/** "+41791234567" → the three ways a Swiss number is written on a web page. */
export function phoneFormats(phone: string): string[] {
  const swiss = /^\+41(\d{2})(\d{3})(\d{2})(\d{2})$/.exec(phone);
  if (!swiss) return [phone];
  const [, a, b, c, d] = swiss;
  return [phone, `0${a}${b}${c}${d}`, `0${a} ${b} ${c} ${d}`];
}

/**
 * One record per page that really cites one of `forms` (the search engine may return pages that
 * do not). Second whitelist: only the address and the title are kept, never the page text.
 */
export function toRecords(raw: TavilyResponse, forms: string[]): SourceRecord[] {
  const wanted = forms.map((f) => f.toLowerCase());
  return raw.results
    .filter((r) => {
      const text = `${r.title} ${r.content ?? ""}`.toLowerCase();
      return wanted.some((form) => text.includes(form));
    })
    .map((r) => ({
      about: "subject",
      fields: [{ field: "I1", value: r.url, page: { title: r.title.trim() } }],
      identifiers: [],
    }));
}
