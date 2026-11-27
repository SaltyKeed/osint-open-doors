// Invented values only. The shape is the one of the search.ch Atom answer (checked once with a real call).

export interface FakeEntry {
  type?: string;
  name?: string;
  firstname?: string;
  street?: string;
  streetno?: string;
  zip?: string;
  city?: string;
  phone?: string;
}

const DEFAULT_ENTRY: Required<FakeEntry> = {
  type: "Person",
  name: "Martin",
  firstname: "Léa",
  street: "Rue du Lac",
  streetno: "1",
  zip: "2000",
  city: "Neuchâtel",
  phone: "+41791234567",
};

/** One <entry>; an empty string leaves the element out, as the API does for an unknown value. */
export function entry(overrides: FakeEntry = {}): string {
  const values = { ...DEFAULT_ENTRY, ...overrides };
  const element = (tag: string, value: string) => (value === "" ? "" : `<tel:${tag}>${value}</tel:${tag}>`);
  return [
    "<entry>",
    "<id>https://tel.search.ch/exemple</id>",
    "<title>Titre inventé</title>",
    element("type", values.type),
    element("name", values.name),
    element("firstname", values.firstname),
    element("street", values.street),
    element("streetno", values.streetno),
    element("zip", values.zip),
    element("city", values.city),
    element("canton", "NE"),
    element("country", "ch"),
    element("phone", values.phone),
    element("copyright", "Données : Swisscom Directories AG"),
    "</entry>",
  ].join("\n");
}

export function feed(total: number, entries: string[] = []): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<feed xmlns="http://www.w3.org/2005/Atom" xmlns:tel="http://tel.search.ch/api/spec/result/1.0/" xmlns:openSearch="http://a9.com/-/spec/opensearch/1.1/">',
    "<title>Résultats inventés</title>",
    `<openSearch:totalResults>${total}</openSearch:totalResults>`,
    ...entries,
    "</feed>",
  ].join("\n");
}
