import { sanitizeOsmRecord } from "@/lib/sanitizeOsm";
import type { SovereignLeadHarvest } from "@/lib/services/OverpassService";

export type HarvestB2BLead = {
  id: string;
  name: string;
  ceoName: string;
  email: string;
  phone: string;
  cityLabel: string;
  category: string;
  vulnerabilityScore: number;
};

/** Maps harvest rows into the existing vault / analyst wire format. */
export function harvestB2BLeadToSovereign(lead: HarvestB2BLead): SovereignLeadHarvest {
  const meta = sanitizeOsmRecord({
    source: "b2b_harvest",
    cityLabel: lead.cityLabel,
    ceoName: lead.ceoName,
    email: lead.email,
    category: lead.category,
    vulnerabilityScore: lead.vulnerabilityScore,
  });
  return {
    id: lead.id,
    name: lead.name,
    type: lead.category,
    website: null,
    phone: lead.phone === "Unlisted" ? null : lead.phone,
    opening_hours: null,
    lat: 0,
    lng: 0,
    osmMetadata: meta,
  };
}
