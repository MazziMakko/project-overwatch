import { describe, expect, it } from "vitest";
import {
  calculateGasResonance,
  digitalRoot,
} from "@/lib/aegis/gasResonance";

describe("Gas resonance (369)", () => {
  it("digitalRoot maps integers to 1–9", () => {
    expect(digitalRoot(0)).toBe(9);
    expect(digitalRoot(9)).toBe(9);
    expect(digitalRoot(10)).toBe(1);
    expect(digitalRoot(45)).toBe(9);
  });

  it("calculateGasResonance classifies roots per spec", () => {
    const r9 = calculateGasResonance(9);
    expect(r9.root).toBe(9);
    expect(r9.status).toBe("SOURCE");
    expect(r9.strategy).toBe("SETTLE NOW");

    const r6 = calculateGasResonance(6);
    expect(r6.root).toBe(6);
    expect(r6.status).toBe("HARMONIC");
    expect(r6.strategy).toBe("PREPARE");

    const r7 = calculateGasResonance(7);
    expect(r7.root).toBe(7);
    expect(r7.status).toBe("MATERIAL");
    expect(r7.strategy).toBe("HOLD");
  });
});
