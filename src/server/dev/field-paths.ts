import "server-only";

/** Leaf field paths of a JSON value, sorted and without duplicates: "a.b[].c". */
export function fieldPaths(value: unknown): string[] {
  const paths = new Set<string>();
  const walk = (node: unknown, path: string) => {
    if (Array.isArray(node)) {
      if (node.length === 0 && path) paths.add(path);
      node.forEach((item) => walk(item, `${path}[]`));
    } else if (node !== null && typeof node === "object") {
      const entries = Object.entries(node);
      if (entries.length === 0 && path) paths.add(path);
      entries.forEach(([key, child]) => walk(child, path ? `${path}.${key}` : key));
    } else if (path) {
      paths.add(path);
    }
  };
  walk(value, "");
  return [...paths].sort();
}

/** Fields present in the raw response that the zod schema did not keep. */
export function ignoredFields(raw: unknown, parsed: unknown): string[] {
  const kept = new Set(fieldPaths(parsed));
  return fieldPaths(raw).filter((path) => !kept.has(path));
}
