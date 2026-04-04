import {
  assertHarvestableBounds,
  type MapBounds,
} from "@/lib/overwatch/harvestBounds";
import { sanitizeOsmRecord, sanitizeString } from "@/lib/sanitizeOsm";

export type { MapBounds } from "@/lib/overwatch/harvestBounds";

export type SovereignLeadHarvest = {
  id: string;
  name: string;
  type: string;
  website: string | null;
  phone: string | null;
  opening_hours: string | null;
  lat: number;
  lng: number;
  osmMetadata: Record<string, unknown>;
};

/** Public mirrors; first healthy response wins. Override with OVERPASS_ENDPOINTS (comma-separated URLs). */
const DEFAULT_OVERPASS_ENDPOINTS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://overpass.nchc.org.tw/api/interpreter",
] as const;

const FETCH_MS = 48_000;
/** Overpass server-side query budget (seconds); keep below gateway limits. */
const OVERPASS_QL_TIMEOUT_SEC = 18;
function parseEndpoints(): string[] {
  const raw = process.env.OVERPASS_ENDPOINTS?.trim();
  if (!raw) return [...DEFAULT_OVERPASS_ENDPOINTS];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function buildOverpassQl(bounds: MapBounds): string {
  const { south, west, north, east } = bounds;
  return `
[out:json][timeout:${OVERPASS_QL_TIMEOUT_SEC}];
(
  node["amenity"](${south},${west},${north},${east});
  node["shop"](${south},${west},${north},${east});
  node["office"](${south},${west},${north},${east});
);
out body;
`;
}

function pickName(tags: Record<string, string>): string {
  const raw =
    tags.name ||
    tags.brand ||
    tags.operator ||
    tags["name:en"] ||
    tags.amenity ||
    tags.shop ||
    tags.office ||
    "Unknown";
  return sanitizeString(raw);
}

function pickType(tags: Record<string, string>): string {
  if (tags.shop) return sanitizeString(`shop:${tags.shop}`);
  if (tags.amenity) return sanitizeString(`amenity:${tags.amenity}`);
  if (tags.office) return sanitizeString(`office:${tags.office}`);
  return "business";
}

function elementsToLeads(elements: Array<{
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
}>): SovereignLeadHarvest[] {
  const leads: SovereignLeadHarvest[] = [];
  for (const el of elements) {
    if (el.type !== "node" || el.lat == null || el.lon == null) continue;
    const tags = el.tags ?? {};
    const rawMeta = { ...tags, osmId: el.id } as Record<string, unknown>;
    const osmMetadata = sanitizeOsmRecord(rawMeta);

    const website =
      typeof osmMetadata.website === "string"
        ? osmMetadata.website
        : typeof osmMetadata["contact:website"] === "string"
          ? (osmMetadata["contact:website"] as string)
          : null;
    const phone =
      typeof osmMetadata.phone === "string"
        ? osmMetadata.phone
        : typeof osmMetadata["contact:phone"] === "string"
          ? (osmMetadata["contact:phone"] as string)
          : null;
    const opening_hours =
      typeof osmMetadata.opening_hours === "string"
        ? osmMetadata.opening_hours
        : null;

    leads.push({
      id: `n${el.id}`,
      name: pickName(tags),
      type: pickType(tags),
      website,
      phone,
      opening_hours,
      lat: el.lat,
      lng: el.lon,
      osmMetadata,
    });
  }
  return leads;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function postInterpreter(
  url: string,
  formBody: string,
  signal: AbortSignal,
): Promise<Response> {
  const contact = process.env.NOMINATIM_CONTACT_EMAIL?.trim();
  const ua = contact
    ? `Overwatch/1.0 (OSM harvest; contact: ${contact})`
    : "Overwatch/1.0 (OSM harvest)";
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": ua,
    },
    body: formBody,
    next: { revalidate: 0 },
    signal,
  });
}

export async function fetchSovereignLeads(
  bounds: MapBounds,
): Promise<SovereignLeadHarvest[]> {
  assertHarvestableBounds(bounds);
  const ql = buildOverpassQl(bounds);
  const formBody = `data=${encodeURIComponent(ql)}`;
  const endpoints = parseEndpoints();
  const errors: string[] = [];

  for (let i = 0; i < endpoints.length; i++) {
    const url = endpoints[i];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_MS);
    try {
      const res = await postInterpreter(url, formBody, controller.signal);
      clearTimeout(timer);
      if (res.ok) {
        const json = (await res.json()) as {
          elements?: Array<{
            type: string;
            id: number;
            lat?: number;
            lon?: number;
            tags?: Record<string, string>;
          }>;
        };
        return elementsToLeads(json.elements ?? []);
      }
      const snippet = `${res.status} ${res.statusText}`;
      errors.push(snippet);
      if (res.status === 502 || res.status === 503 || res.status === 504) {
        await sleep(400 * (i + 1));
        continue;
      }
      throw new Error(`Overpass error: ${snippet}`);
    } catch (e) {
      clearTimeout(timer);
      if (e instanceof Error && e.name === "AbortError") {
        errors.push("timeout");
        await sleep(500 * (i + 1));
        continue;
      }
      if (
        e instanceof Error &&
        e.message.startsWith("Overpass error:") &&
        !e.message.includes("502") &&
        !e.message.includes("503") &&
        !e.message.includes("504")
      ) {
        throw e;
      }
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(msg);
      await sleep(350 * (i + 1));
    }
  }

  throw new Error(
    `Overpass unavailable (${errors.join(" → ")}). Zoom in, wait, or set OVERPASS_ENDPOINTS to a private instance.`,
  );
}
