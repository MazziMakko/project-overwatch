import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  EXPECTED_ROOT,
  stageGatePasses,
  vortexRootForStage,
  vortexRootFromHex,
} from "@/lib/aegis/vortexValidator";

function randomTxHash(): string {
  return randomBytes(32).toString("hex");
}

describe("Sovereign vortex geometry (Aegis)", () => {
  it("1000 random txHashes: stage roots are always 1–9 and gates match EXPECTED_ROOT", () => {
    const stages = ["COMMIT", "VERIFY", "SETTLE"] as const;
    for (let i = 0; i < 1000; i++) {
      const h = randomTxHash();
      for (const stage of stages) {
        const got = vortexRootForStage(h, stage);
        expect(got).toBeGreaterThanOrEqual(1);
        expect(got).toBeLessThanOrEqual(9);
        const want = EXPECTED_ROOT[stage];
        expect(stageGatePasses(h, stage)).toBe(got === want);
      }
    }
  });

  it("SHA-256 digest hex always yields valid vortex root via vortexRootFromHex", () => {
    const digest = randomBytes(32).toString("hex");
    const r = vortexRootFromHex(digest);
    expect(r).toBeGreaterThanOrEqual(1);
    expect(r).toBeLessThanOrEqual(9);
  });
});
