import { createHash } from "node:crypto";

/**
 * AEGIS VORTEX VALIDATOR
 * Stage-gated settlement: 3 (Commit) → 6 (Verify) → 9 (Finality).
 * Each stage derives a deterministic vortex root from `txHash` + stage salt.
 */

export type AegisStage = "COMMIT" | "VERIFY" | "SETTLE";

const STAGE_SALT: Record<AegisStage, string> = {
  COMMIT: "AEGIS::COMMIT::3",
  VERIFY: "AEGIS::VERIFY::6",
  SETTLE: "AEGIS::SETTLE::9",
};

/** Expected roots for asymmetric settlement (Tesla 3-6-9 control path). */
export const EXPECTED_ROOT: Record<AegisStage, 3 | 6 | 9> = {
  COMMIT: 3,
  VERIFY: 6,
  SETTLE: 9,
};

/**
 * Normalize hex string (strip 0x, lowercase).
 */
export function normalizeTxHash(txHash: string): string {
  const h = txHash.trim().replace(/^0x/i, "").toLowerCase();
  if (!/^[0-9a-f]+$/.test(h) || h.length < 8) {
    throw new Error("Aegis: invalid tx hash (expect hex, min 8 chars)");
  }
  return h;
}

/**
 * Vortex root 1–9 from a hex string (bigint mod 9, 0 → 9).
 */
export function vortexRootFromHex(hex: string): number {
  const normalized = normalizeTxHash(hex);
  let n = BigInt("0x" + normalized);
  if (n === BigInt(0)) return 9;
  const r = Number(n % BigInt(9));
  return r === 0 ? 9 : r;
}

/**
 * Digital root of the raw `txHash` (canonical on-chain id).
 */
export function vortexRootFromTxHash(txHash: string): number {
  return vortexRootFromHex(txHash);
}

/**
 * Stage-specific root: SHA-256(txHash + stage salt) → hex → vortex root 1–9.
 * Commit/Verify/Settle each have independent roots so 3→6→9 gates can all be satisfied.
 */
export function vortexRootForStage(txHash: string, stage: AegisStage): number {
  const base = normalizeTxHash(txHash);
  const payload = `${base}:${STAGE_SALT[stage]}`;
  const digestHex = createHash("sha256").update(payload, "utf8").digest("hex");
  return vortexRootFromHex(digestHex);
}

export function expectedRootForStage(stage: AegisStage): 3 | 6 | 9 {
  return EXPECTED_ROOT[stage];
}

/**
 * True if this stage’s derived root matches the 3, 6, or 9 gate.
 */
export function stageGatePasses(txHash: string, stage: AegisStage): boolean {
  const got = vortexRootForStage(txHash, stage);
  const want = EXPECTED_ROOT[stage];
  return got === want;
}

/**
 * Whether a new row may be created as COMMITTED (Commit gate = root 3).
 */
export function canRecordCommitted(txHash: string): boolean {
  return stageGatePasses(txHash, "COMMIT");
}

/**
 * Whether a transaction may advance to the next status based on vortex gates:
 * COMMITTED → VERIFIED requires VERIFY gate (6); VERIFIED → SETTLED requires SETTLE gate (9).
 */
export function canAdvanceStatus(
  txHash: string,
  from: "COMMITTED" | "VERIFIED",
): boolean {
  if (from === "COMMITTED") {
    return stageGatePasses(txHash, "VERIFY");
  }
  return stageGatePasses(txHash, "SETTLE");
}

/**
 * Full path check: Commit gate (3) → Verify gate (6) → Settle gate (9).
 */
export function validateFullSettlementPath(txHash: string): {
  commit: boolean;
  verify: boolean;
  settle: boolean;
  allPass: boolean;
} {
  const commit = stageGatePasses(txHash, "COMMIT");
  const verify = stageGatePasses(txHash, "VERIFY");
  const settle = stageGatePasses(txHash, "SETTLE");
  return {
    commit,
    verify,
    settle,
    allPass: commit && verify && settle,
  };
}

/**
 * Escrow release: requires SETTLE gate (root 9 on SETTLE stage) — finality.
 */
export function canReleaseEscrow(txHash: string): boolean {
  return stageGatePasses(txHash, "SETTLE");
}

/**
 * Snapshot root for persistence on `AegisTransaction.vortexRoot` (uses raw tx hash).
 */
export function snapshotVortexRoot(txHash: string): number {
  return vortexRootFromTxHash(txHash);
}
