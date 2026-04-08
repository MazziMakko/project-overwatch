"use server";

import { randomUUID } from "crypto";
import { z } from "zod";
import type { HarvestB2BLead } from "@/lib/overwatch/harvestB2BBridge";

const PLACEHOLDER_KEYS = new Set(["", "your_apollo_api_key_here", "placeholder"]);

function hasApolloKey(): boolean {
  const v = process.env.APOLLO_API_KEY?.trim();
  if (!v) return false;
  if (PLACEHOLDER_KEYS.has(v.toLowerCase())) return false;
  return true;
}

const ApolloPersonLoose = z
  .object({
    id: z.string().optional(),
    first_name: z.string().nullable().optional(),
    last_name: z.string().nullable().optional(),
    last_name_obfuscated: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    organization: z
      .object({
        name: z.string().nullable().optional(),
        primary_phone: z
          .object({ number: z.string().nullable().optional() })
          .nullable()
          .optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
  })
  .passthrough();

function generateSimulatedLeads(query: string, location: string): HarvestB2BLead[] {
  const token = query.split(/\s+/)[0] || "Holdings";
  return Array.from({ length: 6 }).map((_, i) => ({
    id: randomUUID(),
    name: `Apex ${token} ${i + 1}`,
    ceoName: `Target Alpha ${i + 1}`,
    email: `alpha${i}@apex${token.toLowerCase().replace(/[^a-z0-9]/g, "") || "holdings"}.com`,
    phone: `(555) 010-${String(1000 + i).slice(-4)}`,
    cityLabel: location,
    category: query.trim().toUpperCase() || "B2B",
    vulnerabilityScore: Math.floor(Math.random() * 5) + 1,
  }));
}

function mapPersonToLead(
  person: unknown,
  query: string,
  fallbackLocation: string,
): HarvestB2BLead | null {
  const p = ApolloPersonLoose.safeParse(person);
  if (!p.success || !p.data.id) return null;
  const raw = p.data;
  const org = raw.organization;
  const name =
    (typeof org?.name === "string" && org.name.trim()) || "UNIDENTIFIED ENTITY";
  const first = (raw.first_name ?? "").trim();
  const last = (raw.last_name_obfuscated ?? raw.last_name ?? "").trim();
  const ceoName = [first, last].filter(Boolean).join(" ").trim() || "—";
  const email =
    typeof raw.email === "string" && raw.email.trim()
      ? raw.email.trim()
      : "Encrypted";
  const phoneNum = org?.primary_phone?.number;
  const phone =
    typeof phoneNum === "string" && phoneNum.trim() ? phoneNum.trim() : "Unlisted";
  const cityLabel =
    (typeof raw.city === "string" && raw.city.trim()) || fallbackLocation;

  return {
    id: `apollo:${raw.id}`,
    name,
    ceoName,
    email,
    phone,
    cityLabel,
    category: query.trim().toUpperCase() || "B2B",
    vulnerabilityScore: Math.floor(Math.random() * 5) + 1,
  };
}

/**
 * Ghost-Ops B2B harvest: Apollo People API Search when `APOLLO_API_KEY` is set,
 * otherwise simulated grid data for UI development.
 */
export async function harvestB2BData(
  query: string,
  location: string,
): Promise<HarvestB2BLead[]> {
  const q = query.trim().slice(0, 200);
  const loc = location.trim().slice(0, 120) || "New Jersey";
  if (!q) return [];

  if (!hasApolloKey()) {
    console.log("[SYSTEM] Using Simulated B2B Data. Missing APOLLO_API_KEY.");
    return generateSimulatedLeads(q, loc);
  }

  try {
    const apiKey = process.env.APOLLO_API_KEY!.trim();
    const url = new URL("https://api.apollo.io/api/v1/mixed_people/api_search");
    url.searchParams.set("page", "1");
    url.searchParams.set("per_page", "15");
    url.searchParams.set("q_keywords", q);
    url.searchParams.set("person_locations[]", loc);

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Cache-Control": "no-cache",
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
      },
      body: "{}",
    });

    if (!response.ok) {
      throw new Error(`Apollo API rejected the uplink (${response.status}).`);
    }

    const data = (await response.json()) as { people?: unknown[] };
    const people = Array.isArray(data.people) ? data.people : [];

    const out: HarvestB2BLead[] = [];
    for (const person of people) {
      const row = mapPersonToLead(person, q, loc);
      if (row) out.push(row);
    }
    return out;
  } catch (error) {
    console.error("[ERROR] B2B Harvest Failed:", error);
    return [];
  }
}
