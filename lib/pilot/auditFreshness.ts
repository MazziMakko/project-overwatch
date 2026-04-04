/** Freshness 0 = stale (24h+), 1 = hot (≤1h), linear decay between. */
export function auditTemporalFreshness(capturedAtIso: string): number {
  const t = new Date(capturedAtIso).getTime();
  if (Number.isNaN(t)) return 0;
  const age = Date.now() - t;
  const h1 = 3_600_000;
  const h24 = 24 * h1;
  if (age <= h1) return 1;
  if (age >= h24) return 0;
  return 1 - (age - h1) / (h24 - h1);
}
