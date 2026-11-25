import { describe, expect, it } from "vitest";
import type { Source } from "@/server/domain/source";
import { inspectSources } from "./inspect-sources";

// Answers after `delayMs`, or rejects when the signal is aborted first.
function slowSource(delayMs: number, callTimeoutMs?: number): Source {
  return {
    id: "slow",
    accepts: ["PSEUDO"],
    ...(callTimeoutMs !== undefined && { callTimeoutMs }),
    investigate: async () => [],
    inspect: (_input, signal) =>
      new Promise((resolve, reject) => {
        const timer = setTimeout(() => resolve({ raw: {}, parsed: {}, records: [] }), delayMs);
        signal.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(signal.reason);
        });
      }),
  };
}

const pseudo = { type: "PSEUDO" as const, value: "lmartin_06" };

describe("inspectSources", () => {
  it("stops a source after the default timeout", async () => {
    const [report] = await inspectSources([pseudo], [slowSource(200)], 20);
    expect(report?.status).toBe("error");
  });

  it("waits for the source's own timeout when it declares one (T7)", async () => {
    const [report] = await inspectSources([pseudo], [slowSource(50, 500)], 20);
    expect(report?.status).toBe("ok");
  });
});
