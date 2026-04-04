const MAX_STRING = 4000;

export function sanitizeString(input: string): string {
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "")
    .slice(0, MAX_STRING);
}

export function sanitizeOsmValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return sanitizeString(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map(sanitizeOsmValue);
  if (typeof value === "object") return sanitizeOsmRecord(value as Record<string, unknown>);
  return undefined;
}

export function sanitizeOsmRecord(
  record: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(record)) {
    const key = sanitizeString(String(k)).slice(0, 256);
    if (!key) continue;
    out[key] = sanitizeOsmValue(v);
  }
  return out;
}
