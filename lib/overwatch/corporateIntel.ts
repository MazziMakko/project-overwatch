import type { SovereignLeadHarvest } from "@/lib/services/OverpassService";
import { leadCityLabel } from "@/lib/overwatch/leadMapDisplay";
import { sanitizeOsmRecord } from "@/lib/sanitizeOsm";

/**
 * Ghost-Ops B2B lead shape (Apollo / enrichment). Kept aligned with Project Overwatch doc.
 */
export type CorporateIntelLead = {
  id: string;
  companyName: string;
  ceoName: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  industry: string | null;
};

/** Persisted under Prisma `osmMetadata` JSON — values are sanitized; no OSM semantics. */
export function buildB2bMetadataPatch(input: {
  apolloPersonId: string;
  title: string | null;
  location: string | null;
  industry: string | null;
  ceoName: string | null;
  email: string | null;
  organizationName: string | null;
}): Record<string, unknown> {
  return sanitizeOsmRecord({
    source: "b2b",
    apolloPersonId: input.apolloPersonId,
    title: input.title,
    location: input.location,
    industry: input.industry,
    ceoName: input.ceoName,
    email: input.email,
    organizationName: input.organizationName,
  });
}

/** Maps a B2B row into the existing harvest/vault wire type (lat/lng unused; anchored at 0). */
export function corporateToSovereignLead(
  c: CorporateIntelLead,
  meta: Record<string, unknown>,
): SovereignLeadHarvest {
  return {
    id: c.id,
    name: c.companyName,
    type: c.industry?.trim() || "business",
    website: null,
    phone: c.phone,
    opening_hours: null,
    lat: 0,
    lng: 0,
    osmMetadata: meta,
  };
}

export function b2bLocationLabel(lead: SovereignLeadHarvest): string | null {
  const m = lead.osmMetadata as Record<string, unknown>;
  if (typeof m.cityLabel === "string" && m.cityLabel.trim()) {
    return m.cityLabel.trim();
  }
  if (typeof m.location === "string" && m.location.trim()) {
    return m.location.trim();
  }
  if (typeof m.organizationName === "string" && m.organizationName.trim()) {
    return m.organizationName.trim();
  }
  return null;
}

export function b2bCeoName(lead: SovereignLeadHarvest): string | null {
  const m = lead.osmMetadata as Record<string, unknown>;
  if (typeof m.ceoName === "string" && m.ceoName.trim()) return m.ceoName.trim();
  if (typeof m.title === "string" && m.title.trim()) return m.title.trim();
  return null;
}

export function b2bEmail(lead: SovereignLeadHarvest): string | null {
  const m = lead.osmMetadata as Record<string, unknown>;
  if (typeof m.email === "string" && m.email.trim()) return m.email.trim();
  return null;
}

/** Sidebar grouping: B2B location first, then legacy vault labels if present. */
export function terminalLeadGroupLabel(lead: SovereignLeadHarvest): string {
  return b2bLocationLabel(lead) ?? leadCityLabel(lead) ?? "Unspecified";
}
