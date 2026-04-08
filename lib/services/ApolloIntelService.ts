import { z } from "zod";
import type { SovereignLeadHarvest } from "@/lib/services/OverpassService";
import {
  buildB2bMetadataPatch,
  corporateToSovereignLead,
  type CorporateIntelLead,
} from "@/lib/overwatch/corporateIntel";

const APOLLO_SEARCH_URL =
  "https://api.apollo.io/api/v1/mixed_people/api_search";

const PersonRowSchema = z
  .object({
    id: z.string(),
    first_name: z.string().nullable().optional(),
    last_name_obfuscated: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    organization: z
      .object({
        name: z.string().nullable().optional(),
        industry: z.string().nullable().optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
  })
  .passthrough();

const SearchResponseSchema = z.object({
  people: z.array(z.unknown()).optional(),
  total_entries: z.number().optional(),
});

function locationFromPerson(p: z.infer<typeof PersonRowSchema>): string | null {
  const parts = [p.city, p.state, p.country].filter(
    (x): x is string => typeof x === "string" && x.trim().length > 0,
  );
  if (parts.length === 0) return null;
  return parts.join(", ");
}

function personToCorporate(row: unknown): CorporateIntelLead | null {
  const parsed = PersonRowSchema.safeParse(row);
  if (!parsed.success) return null;
  const p = parsed.data;
  const org = p.organization;
  const orgName =
    (typeof org?.name === "string" && org.name.trim()) || "Unknown company";
  const title = (p.title ?? "").trim();
  const first = (p.first_name ?? "").trim();
  const last = (p.last_name_obfuscated ?? "").trim();
  const execLabel = [first, last].filter(Boolean).join(" ").trim() || title || null;
  const industry =
    typeof org?.industry === "string" && org.industry.trim()
      ? org.industry.trim()
      : null;

  return {
    id: `apollo:${p.id}`,
    companyName: orgName,
    ceoName: execLabel,
    email: null,
    phone: null,
    location: locationFromPerson(p),
    industry,
  };
}

function toHarvest(corporate: CorporateIntelLead, apolloPerson: unknown): SovereignLeadHarvest {
  const p = PersonRowSchema.safeParse(apolloPerson);
  const apolloPersonId =
    p.success && p.data.id
      ? p.data.id
      : corporate.id.replace(/^apollo:/, "");
  const title =
    p.success && typeof p.data.title === "string" ? p.data.title : null;
  const meta = buildB2bMetadataPatch({
    apolloPersonId,
    title,
    location: corporate.location,
    industry: corporate.industry,
    ceoName: corporate.ceoName,
    email: corporate.email,
    organizationName: corporate.companyName,
  });
  return corporateToSovereignLead(corporate, meta);
}

/**
 * Server-only: People API Search (net-new). Requires `APOLLO_API_KEY` (master key for this endpoint).
 * Does not return emails/phones — enrichment endpoints are separate.
 */
export async function fetchCorporateLeadsFromApollo(query: string): Promise<SovereignLeadHarvest[]> {
  const apiKey = process.env.APOLLO_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("APOLLO_API_KEY is not configured.");
  }

  const q = query.trim().slice(0, 200);
  if (!q) {
    throw new Error("Search directive cannot be empty.");
  }

  const url = new URL(APOLLO_SEARCH_URL);
  url.searchParams.set("page", "1");
  url.searchParams.set("per_page", "25");
  url.searchParams.set("q_keywords", q);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      "X-Api-Key": apiKey,
    },
    body: "{}",
  });

  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text) as unknown;
  } catch {
    throw new Error("Apollo returned non-JSON response.");
  }

  if (!res.ok) {
    const msg =
      typeof json === "object" &&
      json !== null &&
      "error" in json &&
      typeof (json as { error?: string }).error === "string"
        ? (json as { error: string }).error
        : `Apollo error ${res.status}`;
    throw new Error(msg);
  }

  const parsed = SearchResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error("Unexpected Apollo response shape.");
  }

  const people = parsed.data.people ?? [];
  const out: SovereignLeadHarvest[] = [];

  for (const row of people) {
    const corp = personToCorporate(row);
    if (!corp) continue;
    out.push(toHarvest(corp, row));
  }

  return out;
}
