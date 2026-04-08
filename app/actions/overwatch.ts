"use server";

import { auth } from "@clerk/nextjs/server";
import { Prisma } from "@prisma/client";
import Groq from "groq-sdk";
import { getPrisma } from "@/lib/db";
import {
  firstAssistantPitch,
  parseStrategistThread,
  type StrategistMessage,
} from "@/lib/strategistThread";
import type { SovereignLeadHarvest } from "@/lib/services/OverpassService";
import { sanitizeOsmRecord } from "@/lib/sanitizeOsm";

export type { StrategistMessage } from "@/lib/strategistThread";

export type LeadAnalysisPayload = {
  name: string;
  type: string;
  city?: string | null;
  website: string | null;
  phone: string | null;
  opening_hours: string | null;
  lat: number;
  lng: number;
  osmMetadata: Record<string, unknown>;
};

export type AnalyzeVulnerabilityResult = {
  vulnerabilityScore: number;
  pitch: string;
  rationale: string;
};

export type VaultLeadBundle = {
  vaultId: string;
  lead: SovereignLeadHarvest;
  vulnerabilityScore: number;
  strategistThread: StrategistMessage[];
};

function strategistHourWindowKeyUtc(): string {
  return new Date().toISOString().slice(0, 13);
}

function strategistHourlyLimit(): number {
  const n = Number(process.env.STRATEGIST_MAX_PER_HOUR);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 500) : 40;
}

/** Shared hourly Groq quota (strategist follow-ups + sovereign metadata briefings). */
export async function consumeStrategistRateSlot(userId: string): Promise<void> {
  const windowKey = strategistHourWindowKeyUtc();
  const limit = strategistHourlyLimit();
  const prisma = getPrisma();

  await prisma.$transaction(
    async (tx) => {
      const existing = await tx.strategistRateBucket.findUnique({
        where: {
          userId_windowKey: { userId, windowKey },
        },
      });
      if (existing && existing.count >= limit) {
        throw new Error(
          `Strategist rate limit: ${limit} Groq calls per hour (rolling UTC hour). Try again soon.`,
        );
      }
      if (!existing) {
        await tx.strategistRateBucket.create({
          data: { userId, windowKey, count: 1 },
        });
      } else {
        await tx.strategistRateBucket.update({
          where: { userId_windowKey: { userId, windowKey } },
          data: { count: { increment: 1 } },
        });
      }
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

function sovereignRowToHarvest(row: {
  id: string;
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
    id: `vault:${row.id}`,
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

function hardcodedBaseScore(lead: LeadAnalysisPayload): number {
  if (lead.website == null && lead.phone != null) return 5;
  if (lead.opening_hours == null) return 4;
  if (lead.phone == null) return 3;
  return 2;
}

export async function analyzeVulnerability(
  leadData: LeadAnalysisPayload,
): Promise<AnalyzeVulnerabilityResult> {
  const base = hardcodedBaseScore(leadData);
  const safeMeta = sanitizeOsmRecord(leadData.osmMetadata);

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return {
      vulnerabilityScore: base,
      pitch: buildFallbackPitch(leadData, base),
      rationale: "Groq unavailable; used Wolf Hunter rules only.",
    };
  }

  const client = new Groq({ apiKey });

  const missingWebsite = leadData.website == null;
  const missingHours = leadData.opening_hours == null;
  const missingPhone = leadData.phone == null;

  const system = `You are a Master B2B Closer and Wolf Hunter analyst for AuraMesh (sovereign SMB web + local discovery stack).
Respond with ONLY valid JSON (no markdown) matching exactly:
{"vulnerabilityScore": number 1-5, "pitch": string, "rationale": string}

Scoring: refine 1–5 from Digital Fragility — missing website, hours, phone, and weak discoverability from the lead metadata (not map data).

Pitch ("pitch" field): exactly three sentences forming a cold-email style hook that:
- Names their category and city/area when known
- Highlights Digital Fragility using Missing Website / Missing Hours / Missing Phone as concrete pain (boolean flags below)
- Positions AuraMesh as the bridge from invisible local business to discoverable, trusted presence

Rationale: one short line on why that score (for the operator HUD).`;

  const user = JSON.stringify({
    baseScoreSuggestion: base,
    digitalFragility: {
      missingWebsite,
      missingHours,
      missingPhone,
    },
    lead: {
      name: leadData.name,
      type: leadData.type,
      city: leadData.city ?? null,
      website: leadData.website,
      phone: leadData.phone,
      opening_hours: leadData.opening_hours,
      lat: leadData.lat,
      lng: leadData.lng,
      osmMetadata: safeMeta,
    },
  });

  try {
    const completion = await client.chat.completions.create({
      model: "llama3-70b-8192",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.4,
      max_tokens: 512,
    });

    const text = completion.choices[0]?.message?.content?.trim() ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch
      ? (JSON.parse(jsonMatch[0]) as {
          vulnerabilityScore?: number;
          pitch?: string;
          rationale?: string;
        })
      : null;

    if (
      parsed &&
      typeof parsed.vulnerabilityScore === "number" &&
      typeof parsed.pitch === "string"
    ) {
      const score = Math.min(5, Math.max(1, Math.round(parsed.vulnerabilityScore)));
      return {
        vulnerabilityScore: score,
        pitch: parsed.pitch,
        rationale: typeof parsed.rationale === "string" ? parsed.rationale : "",
      };
    }
  } catch {
    // fall through
  }

  return {
    vulnerabilityScore: base,
    pitch: buildFallbackPitch(leadData, base),
    rationale: "Model parse failed; used Wolf Hunter rules.",
  };
}

function buildFallbackPitch(lead: LeadAnalysisPayload, score: number): string {
  const city = lead.city?.trim() || "your area";
  const category = lead.type.replace(/^[^:]+:/, "").replace(/_/g, " ") || "local";
  const w = lead.website == null;
  const h = lead.opening_hours == null;
  const frag =
    [
      w ? "no public website" : null,
      h ? "no published hours" : null,
      lead.phone == null ? "thin contact surface" : null,
    ]
      .filter(Boolean)
      .join("; ") || "limited digital footprint";
  return `Noticed your ${category} in ${city} — ${frag}, which reads as high Digital Fragility: you are effectively off the map for most intent-driven local traffic. AuraMesh closes that gap with a credible web front, accurate hours, and frictionless contact so prospects can find and trust you. Worth a 12-minute teardown of your discovery funnel — reply yes and I will send two concrete fixes.`;
}

export async function saveLeadToVault(input: {
  name: string;
  type: string;
  website: string | null;
  phone: string | null;
  vulnerabilityScore: number;
  lat: number;
  lng: number;
  osmMetadata: Record<string, unknown>;
  strategistThread?: StrategistMessage[] | null;
}) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized: sign in to save leads to the vault.");
  }

  const osmMetadata = sanitizeOsmRecord(input.osmMetadata);
  const threadPayload =
    input.strategistThread && input.strategistThread.length > 0
      ? (input.strategistThread as unknown as Prisma.InputJsonValue)
      : undefined;

  return getPrisma().sovereignLead.create({
    data: {
      userId,
      name: input.name,
      type: input.type,
      website: input.website,
      phone: input.phone,
      vulnerabilityScore: input.vulnerabilityScore,
      lat: input.lat,
      lng: input.lng,
      osmMetadata: osmMetadata as Prisma.InputJsonValue,
      ...(threadPayload !== undefined ? { strategistThread: threadPayload } : {}),
    },
  });
}

export async function listVaultLeadsForUser() {
  const { userId } = await auth();
  if (!userId) {
    return [];
  }

  return getPrisma().sovereignLead.findMany({
    where: { userId },
    orderBy: [{ vulnerabilityScore: "desc" }, { createdAt: "desc" }],
    take: 100,
  });
}

export async function getVaultLeadForOverwatch(
  vaultLeadId: string,
): Promise<VaultLeadBundle | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const row = await getPrisma().sovereignLead.findFirst({
    where: { id: vaultLeadId, userId },
  });
  if (!row) return null;

  return {
    vaultId: row.id,
    lead: sovereignRowToHarvest(row),
    vulnerabilityScore: row.vulnerabilityScore,
    strategistThread: parseStrategistThread(row.strategistThread),
  };
}

export async function persistVaultStrategistThread(input: {
  vaultLeadId: string;
  thread: StrategistMessage[];
}) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const prisma = getPrisma();
  const result = await prisma.sovereignLead.updateMany({
    where: { id: input.vaultLeadId, userId },
    data: {
      strategistThread: input.thread as unknown as Prisma.InputJsonValue,
    },
  });
  return result.count;
}

export async function strategistFollowUp(input: {
  lead: LeadAnalysisPayload;
  messages: StrategistMessage[];
  vaultLeadId?: string | null;
}): Promise<{ reply: string }> {
  const { lead, messages, vaultLeadId } = input;
  if (!messages.length) {
    return { reply: "" };
  }

  const { userId } = await auth();
  if (!userId) {
    throw new Error(
      "Sign in to use Strategist follow-ups (vault sync + hourly limits).",
    );
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("Strategist uplink offline (missing GROQ_API_KEY).");
  }

  await consumeStrategistRateSlot(userId);

  const safeMeta = sanitizeOsmRecord(lead.osmMetadata);
  const missingWebsite = lead.website == null;
  const missingHours = lead.opening_hours == null;
  const missingPhone = lead.phone == null;

  const trimmed: StrategistMessage[] = messages.map((m) => ({
    role: m.role,
    content: String(m.content).slice(0, 4000),
  }));

  const client = new Groq({ apiKey });

  const system = `You are the Wolf Hunter Strategist: a Master B2B Closer helping sell AuraMesh — digital presence, local discovery, hours, and click-to-call for SMBs.
Rules:
- Be concise, confident, no markdown unless asked.
- Tie recommendations to "Digital Fragility" (missing web, hours, phone, findability).
- When drafting outreach, prefer 2–4 tight sentences unless the user asks for a different format.
- Mention AuraMesh as the bridge from invisible to discoverable when it fits naturally.

Lead context (JSON): ${JSON.stringify({
    name: lead.name,
    type: lead.type,
    city: lead.city ?? null,
    missingWebsite,
    missingHours,
    missingPhone,
    leadMetadata: safeMeta,
  })}`;

  let reply: string;
  try {
    const completion = await client.chat.completions.create({
      model: "llama3-70b-8192",
      messages: [
        { role: "system", content: system },
        ...trimmed.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ],
      temperature: 0.55,
      max_tokens: 512,
    });

    reply =
      completion.choices[0]?.message?.content?.trim() ??
      "No response from strategist.";
    reply = reply.slice(0, 8000);
  } catch {
    throw new Error("Strategist uplink failed. Retry shortly.");
  }

  if (vaultLeadId) {
    const prisma = getPrisma();
    const owned = await prisma.sovereignLead.findFirst({
      where: { id: vaultLeadId, userId },
      select: { id: true },
    });
    if (owned) {
      const fullThread: StrategistMessage[] = [
        ...trimmed,
        { role: "assistant", content: reply },
      ];
      await prisma.sovereignLead.update({
        where: { id: vaultLeadId },
        data: {
          strategistThread: fullThread as unknown as Prisma.InputJsonValue,
        },
      });
    }
  }

  return { reply };
}
