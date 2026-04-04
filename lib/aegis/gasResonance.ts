/**
 * Aegis 369 Gas Resonance — digital root of congestion price (gwei) → strategy.
 */

export type GasResonanceStatus = "MATERIAL" | "HARMONIC" | "SOURCE";

export type GasStrategy = "HOLD" | "PREPARE" | "SETTLE NOW";

export type GasResonanceResult = {
  /** Gwei value used for root (rounded). */
  gweiRounded: number;
  /** Digital root 1–9. */
  root: number;
  status: GasResonanceStatus;
  strategy: GasStrategy;
};

/**
 * Digital root 1–9 for a non-negative integer (0 → 9).
 */
export function digitalRoot(n: number): number {
  const x = Math.floor(Math.max(0, Math.abs(n)));
  if (x === 0) return 9;
  const r = x % 9;
  return r === 0 ? 9 : r;
}

/**
 * Maps gwei congestion/price to 369 resonance and settlement strategy.
 */
export function calculateGasResonance(gwei: number): GasResonanceResult {
  const gweiRounded = Math.round(Math.max(0, gwei));
  const root = digitalRoot(gweiRounded);

  if (root === 9) {
    return {
      gweiRounded,
      root,
      status: "SOURCE",
      strategy: "SETTLE NOW",
    };
  }
  if (root === 3 || root === 6) {
    return {
      gweiRounded,
      root,
      status: "HARMONIC",
      strategy: "PREPARE",
    };
  }
  return {
    gweiRounded,
    root,
    status: "MATERIAL",
    strategy: "HOLD",
  };
}
