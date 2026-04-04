import type { SovereignLeadHarvest } from "@/lib/services/OverpassService";

export type LeadMapCategory = "shop" | "amenity" | "office" | "other";

export const LEAD_CATEGORY_LEGEND: {
  category: LeadMapCategory;
  label: string;
  dotClass: string;
}[] = [
  {
    category: "shop",
    label: "Retail / shop",
    dotClass: "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.55)]",
  },
  {
    category: "amenity",
    label: "Amenity / service",
    dotClass: "bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.5)]",
  },
  {
    category: "office",
    label: "Office",
    dotClass: "bg-violet-400 shadow-[0_0_10px_rgba(167,139,250,0.5)]",
  },
  {
    category: "other",
    label: "Other",
    dotClass: "bg-lime-400 shadow-[0_0_10px_rgba(163,230,53,0.55)]",
  },
];

export function leadMapCategory(lead: SovereignLeadHarvest): LeadMapCategory {
  const t = lead.type;
  if (t.startsWith("shop:")) return "shop";
  if (t.startsWith("amenity:")) return "amenity";
  if (t.startsWith("office:")) return "office";
  return "other";
}

export function leadCityLabel(lead: SovereignLeadHarvest): string | null {
  const m = lead.osmMetadata;
  const v =
    (typeof m["addr:city"] === "string" && m["addr:city"]) ||
    (typeof m["addr:place"] === "string" && m["addr:place"]) ||
    (typeof m["addr:suburb"] === "string" && m["addr:suburb"]) ||
    null;
  return v ? String(v) : null;
}

export function formatLeadAddress(lead: SovereignLeadHarvest): string | null {
  const m = lead.osmMetadata;
  const parts = [
    typeof m["addr:housenumber"] === "string" ? m["addr:housenumber"] : null,
    typeof m["addr:street"] === "string" ? m["addr:street"] : null,
    typeof m["addr:city"] === "string" ? m["addr:city"] : null,
    typeof m["addr:state"] === "string" ? m["addr:state"] : null,
    typeof m["addr:postcode"] === "string" ? m["addr:postcode"] : null,
  ].filter(Boolean) as string[];
  if (parts.length === 0) return null;
  return parts.join(", ");
}

export function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

/** OSM rarely mirrors Google star averages; surface hotel stars / tagged ratings when present. */
export function formatOsmRatingLine(meta: Record<string, unknown>): string | null {
  const stars = meta.stars;
  if (typeof stars === "string" || typeof stars === "number") {
    const n = Number(stars);
    if (Number.isFinite(n) && n >= 1 && n <= 5) {
      return `OSM hotel class: ${n} star${n === 1 ? "" : "s"}`;
    }
    return `OSM stars tag: ${String(stars)}`;
  }
  const r = meta.rating;
  if (typeof r === "string" || typeof r === "number") {
    return `OSM rating: ${String(r)}`;
  }
  return null;
}

export function googleMapsSearchUrl(lat: number, lng: number): string {
  const q = `${lat},${lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export function safeHttpUrl(raw: string | null): string | null {
  if (!raw || typeof raw !== "string") return null;
  const t = raw.trim();
  if (/^https:\/\//i.test(t)) return t;
  if (/^http:\/\//i.test(t)) return t;
  return null;
}

export function centroidOfLeads(leads: SovereignLeadHarvest[]): {
  lat: number;
  lng: number;
} | null {
  if (leads.length === 0) return null;
  let slat = 0;
  let slng = 0;
  for (const l of leads) {
    slat += l.lat;
    slng += l.lng;
  }
  return { lat: slat / leads.length, lng: slng / leads.length };
}
