"use server";

import { sanitizeString } from "@/lib/sanitizeOsm";

export type NominatimSearchHit = {
  displayName: string;
  lat: number;
  lng: number;
  className: string | null;
  typeName: string | null;
  suggestedZoom: number;
};

function zoomFromOsmClass(cls: string | undefined, type: string | undefined): number {
  const c = cls ?? "";
  const t = type ?? "";
  if (c === "place") {
    if (t === "city" || t === "town" || t === "village") return 12;
    if (t === "state" || t === "country") return 6;
    if (t === "suburb" || t === "neighbourhood") return 13.5;
    return 11;
  }
  if (c === "boundary") return 11;
  if (c === "highway") return 14;
  if (c === "amenity" || c === "shop" || c === "tourism" || c === "office")
    return 16.5;
  if (c === "building") return 17.5;
  if (c === "leisure" || c === "landuse") return 13;
  return 13;
}

/**
 * Server-side Nominatim search (respects browser CORS and OSM usage policy).
 * Set NOMINATIM_CONTACT_EMAIL in env for a proper User-Agent contact per
 * https://operations.osmfoundation.org/policies/nominatim/
 */
export async function searchNominatim(
  query: string,
): Promise<NominatimSearchHit[]> {
  const q = sanitizeString(query).trim().slice(0, 240);
  if (q.length < 2) return [];

  const contact = process.env.NOMINATIM_CONTACT_EMAIL?.trim();
  const userAgent = contact
    ? `Overwatch/1.0 (contact: ${contact})`
    : "Overwatch/1.0 (internal geocoder; set NOMINATIM_CONTACT_EMAIL)";

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "8");
  url.searchParams.set("addressdetails", "0");

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": userAgent,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Search failed (${res.status})`);
  }

  const raw = (await res.json()) as Array<{
    lat?: string;
    lon?: string;
    display_name?: string;
    class?: string;
    type?: string;
  }>;

  if (!Array.isArray(raw)) return [];

  const out: NominatimSearchHit[] = [];
  for (const row of raw) {
    const lat = row.lat != null ? Number(row.lat) : NaN;
    const lng = row.lon != null ? Number(row.lon) : NaN;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const displayName =
      typeof row.display_name === "string"
        ? sanitizeString(row.display_name).slice(0, 500)
        : q;
    const cls = typeof row.class === "string" ? row.class : undefined;
    const typ = typeof row.type === "string" ? row.type : undefined;
    out.push({
      displayName,
      lat,
      lng,
      className: cls ?? null,
      typeName: typ ?? null,
      suggestedZoom: zoomFromOsmClass(cls, typ),
    });
  }
  return out;
}
