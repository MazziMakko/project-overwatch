"use server";

import { auth } from "@clerk/nextjs/server";
import { Prisma } from "@prisma/client";
import Groq from "groq-sdk";
import { z } from "zod";
import { consumeStrategistRateSlot } from "@/app/actions/overwatch";
import { getPrisma } from "@/lib/db";
import { leadCityLabel } from "@/lib/overwatch/leadMapDisplay";
import type { SovereignLeadHarvest } from "@/lib/services/OverpassService";
import { sanitizeOsmRecord } from "@/lib/sanitizeOsm";

const BriefingJsonSchema = z.object({
  root3_problem: z.string(),
  root6_logic: z.string(),
  root9_source: z.string(),
  seo_title: z.string(),
  seo_description: z.string(),
  outreach_copy: z.string(),
});

export type DigitalFragilityReport = {
  root3Problem: string;
  root6Logic: string;
  root9Source: string;
  seoTitle: string;
  seoDescription: string;
  outreachCopy: string;
};

export type GenerateDigitalFragilityReportResult =
  | { ok: true; report: DigitalFragilityReport }
  | { ok: false; error: string };

const BriefingSnapshotSchema = z.object({
  root3Problem: z.string(),
  root6Logic: z.string(),
  root9Source: z.string(),
  seoTitle: z.string(),
  seoDescription: z.string(),
  outreachCopy: z.string(),
});

export function parseStoredBriefing(raw: unknown): DigitalFragilityReport | null {
  const parsed = BriefingSnapshotSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/** Persist briefing for hosted `/vault/landing/[leadId]` (no Groq on each page view). */
export async function persistSovereignBriefingSnapshot(
  leadId: string,
  report: DigitalFragilityReport,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: "Sign in to save briefing." };
  }
  const id = String(leadId ?? "").trim();
  if (!id) return { ok: false, error: "Missing lead id." };

  const prisma = getPrisma();
  const result = await prisma.sovereignLead.updateMany({
    where: { id, userId },
    data: {
      sovereignBriefing: report as unknown as Prisma.InputJsonValue,
    },
  });
  if (result.count === 0) {
    return { ok: false, error: "Lead not found or access denied." };
  }
  return { ok: true };
}

export async function getSovereignBriefingForLead(
  leadId: string,
): Promise<DigitalFragilityReport | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const row = await getPrisma().sovereignLead.findFirst({
    where: { id: leadId, userId },
    select: { sovereignBriefing: true },
  });
  return parseStoredBriefing(row?.sovereignBriefing ?? null);
}

function rowToHarvest(row: {
  name: string;
  type: string;
  website: string | null;
  phone: string | null;
  lat: number;
  lng: number;
  osmMetadata: unknown;
}): SovereignLeadHarvest {
  const meta = (row.osmMetadata ?? {}) as Record<string, unknown>;
  const opening_hours =
    typeof meta.opening_hours === "string" ? meta.opening_hours : null;
  return {
    id: "vault",
    name: row.name,
    type: row.type,
    website: row.website,
    phone: row.phone,
    opening_hours,
    lat: row.lat,
    lng: row.lng,
    osmMetadata: meta,
  };
}

function toReport(parsed: z.infer<typeof BriefingJsonSchema>): DigitalFragilityReport {
  return {
    root3Problem: parsed.root3_problem.trim(),
    root6Logic: parsed.root6_logic.trim(),
    root9Source: parsed.root9_source.trim(),
    seoTitle: parsed.seo_title.trim(),
    seoDescription: parsed.seo_description.trim(),
    outreachCopy: parsed.outreach_copy.trim(),
  };
}

/**
 * AI-driven Digital Fragility Report using 3–6–9 (problem / logic / source) + SEO payload.
 * Scoped by Clerk userId; lead must belong to the caller.
 */
export async function generateDigitalFragilityReport(
  leadId: string,
): Promise<GenerateDigitalFragilityReportResult> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: "Sign in to generate briefings." };
  }

  const id = String(leadId ?? "").trim();
  if (!id) {
    return { ok: false, error: "Missing lead id." };
  }

  const prisma = getPrisma();
  const row = await prisma.sovereignLead.findFirst({
    where: { id, userId },
  });
  if (!row) {
    return { ok: false, error: "Lead not found or access denied." };
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "Groq uplink offline (missing GROQ_API_KEY)." };
  }

  try {
    await consumeStrategistRateSlot(userId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Rate limit.";
    return { ok: false, error: msg };
  }

  const safeMeta = sanitizeOsmRecord(row.osmMetadata as Record<string, unknown>);
  const harvest = rowToHarvest({ ...row, osmMetadata: safeMeta });
  const city = leadCityLabel(harvest);
  const openingHours =
    typeof safeMeta.opening_hours === "string" ? safeMeta.opening_hours : null;

  const client = new Groq({ apiKey });

  const system = `You are the Sovereign Architect copy engine for AuraMesh (sovereign SMB web, local discovery, resilient edge presence).

Output ONLY valid JSON (no markdown, no prose outside JSON) with exactly these keys:
{"root3_problem":"...","root6_logic":"...","root9_source":"...","seo_title":"...","seo_description":"...","outreach_copy":"..."}

3–6–9 framework (Vortex Math / 369 narrative for AuraMesh):
- root3_problem: Root 3 — Physical/digital "dead zones" and Digital Fragility tied to THIS business: their address area, industry/category, and OSM signals (missing web, hours, phone, findability). Be specific to location and vertical; 2–4 short paragraphs max.
- root6_logic: Root 6 — How AuraMesh "Sovereign Sync" and mesh edge delivery bypass those failures; reference 369 / vortex math as metaphor for triadic resonance, redundant paths, and sovereign routing (not literal math homework). 2–4 short paragraphs.
- root9_source: Root 9 — "Final transition" pitch: move from fragile, rent-seeking stacks to resilient infrastructure they control; clear CTA tone for a business owner. 2–3 short paragraphs.
- seo_title: Meta title ≤60 chars, intent-led (e.g. "Resilient [industry] in [City]" when city known).
- seo_description: Meta description ≤155 chars, benefit + geo when possible.
- outreach_copy: One cohesive outreach block (email/DM): hook + 3–6–9 distilled + soft CTA; ready to paste.

Tone: confident, non-cringe, B2B owner. No fabricated statistics.`;

  const userPayload = JSON.stringify({
    businessName: row.name,
    category: row.type,
    city,
    coords: { lat: row.lat, lng: row.lng },
    vulnerabilityScore: row.vulnerabilityScore,
    website: row.website,
    phone: row.phone,
    opening_hours: openingHours,
    osmMetadata: safeMeta,
  });

  try {
    const completion = await client.chat.completions.create({
      model: "llama3-70b-8192",
      messages: [
        { role: "system", content: system },
        { role: "user", content: userPayload },
      ],
      temperature: 0.45,
      max_tokens: 2048,
    });

    const text = completion.choices[0]?.message?.content?.trim() ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { ok: false, error: "Briefing parse failed (no JSON)." };
    }

    const raw = JSON.parse(jsonMatch[0]) as unknown;
    const parsed = BriefingJsonSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, error: "Briefing schema mismatch." };
    }

    return { ok: true, report: toReport(parsed.data) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Groq request failed.";
    return { ok: false, error: msg };
  }
}
