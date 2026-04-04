/**
 * Turn thrown/rejected values into a readable string for UI and logs.
 * Avoids useless "[object Event]" when the runtime passes a DOM Event or similar.
 */
export function messageFromUnknown(reason: unknown): string {
  if (reason instanceof Error) return reason.message;
  if (typeof reason === "string") return reason;
  if (reason == null) return "Unknown error";

  if (typeof reason === "object") {
    const o = reason as Record<string, unknown>;
    if (typeof o.message === "string" && o.message.length > 0) return o.message;
    if (typeof o.digest === "string") return `Request failed (${o.digest})`;
    if (o.error instanceof Error) return o.error.message;
    if (typeof o.error === "string") return o.error;
    const nested = o.error;
    if (nested && typeof nested === "object") {
      const e = nested as { message?: unknown };
      if (typeof e.message === "string") return e.message;
    }
  }

  if (typeof Event !== "undefined" && reason instanceof Event) {
    const err = (reason as ErrorEvent).error;
    if (err instanceof Error) return err.message;
    return `Event: ${reason.type}`;
  }

  try {
    const s = JSON.stringify(reason);
    if (s !== "{}") return s;
  } catch {
    /* fall through */
  }
  return String(reason);
}
