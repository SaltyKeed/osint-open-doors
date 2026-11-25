/**
 * Splits streamed text into JSON events (one per line). The last line may be cut in the middle:
 * it is returned as `rest` and must be put in front of the next chunk.
 * An invalid line throws the error of JSON.parse: this runs in the dev console only.
 */
export function splitNdjson(buffer: string): { events: unknown[]; rest: string } {
  const lines = buffer.split("\n");
  const rest = lines.pop() ?? "";
  const events = lines.filter((line) => line.trim() !== "").map((line): unknown => JSON.parse(line));
  return { events, rest };
}
