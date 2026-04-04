/**
 * Canonical audit material for SHA-256 integrity (browser + Node).
 * Excludes local-only fields and the hash itself.
 */
export type AuditHashMaterial = {
  businessId: string;
  technicianName: string | null;
  payload: Record<string, unknown>;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  photoUrl: string | null;
  capturedAt: string;
};

function canonicalStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalStringify(v)).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${canonicalStringify(obj[k])}`)
    .join(",")}}`;
}

export function buildAuditCanonical(material: AuditHashMaterial): string {
  return canonicalStringify(material);
}

function bufferToHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Client-only: uses Web Crypto so this module stays bundler-safe for the browser. */
export async function computeAuditCryptoHash(
  material: AuditHashMaterial,
): Promise<string> {
  const canonical = buildAuditCanonical(material);
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    throw new Error("computeAuditCryptoHash requires Web Crypto (run on the client)");
  }
  const enc = new TextEncoder().encode(canonical);
  const digest = await crypto.subtle.digest("SHA-256", enc);
  return bufferToHex(digest);
}
