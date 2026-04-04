export type StrategistMessage = { role: "user" | "assistant"; content: string };

export function parseStrategistThread(raw: unknown): StrategistMessage[] {
  if (!raw || !Array.isArray(raw)) return [];
  const out: StrategistMessage[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const role = o.role;
    const content = o.content;
    if (
      (role === "user" || role === "assistant") &&
      typeof content === "string"
    ) {
      out.push({ role, content: content.slice(0, 8000) });
    }
  }
  return out;
}

export function firstAssistantPitch(thread: StrategistMessage[]): string {
  const first = thread.find((m) => m.role === "assistant");
  return first?.content?.trim() ?? "";
}
