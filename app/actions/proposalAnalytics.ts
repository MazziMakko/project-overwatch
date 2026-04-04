"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { getPrisma } from "@/lib/db";

const ALLOWED_TYPES = ["OPEN", "UNLOCK", "PILOT_CLICK"] as const;
export type ProposalEventType = (typeof ALLOWED_TYPES)[number];

function proposalIpSalt(): string {
  const s = process.env.PROPOSAL_IP_SALT?.trim();
  if (process.env.NODE_ENV === "production" && !s) {
    throw new Error("PROPOSAL_IP_SALT is required in production");
  }
  return s ?? "overwatch-proposal-ip-salt-rotate-in-prod";
}

function hashClientIp(rawIp: string): string {
  return createHash("sha256")
    .update(`${proposalIpSalt()}:${rawIp}`)
    .digest("hex");
}

async function getPrivacyContext(): Promise<{
  ipHash: string | null;
  userAgent: string | null;
}> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  const rawIp =
    forwarded?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    h.get("cf-connecting-ip") ??
    "";
  const ipHash =
    rawIp.length > 0 && rawIp !== "unknown"
      ? hashClientIp(rawIp)
      : null;
  const ua = h.get("user-agent");
  const userAgent =
    ua && ua.length > 0 ? ua.slice(0, 512) : null;
  return { ipHash, userAgent };
}

export async function trackProposalEvent(
  token: string,
  type: string,
): Promise<{ ok: boolean }> {
  if (!ALLOWED_TYPES.includes(type as ProposalEventType)) {
    return { ok: false };
  }

  const prisma = getPrisma();
  const lead = await prisma.sovereignLead.findUnique({
    where: { proposalShareToken: token },
    select: { id: true },
  });
  if (!lead) {
    return { ok: false };
  }

  const { ipHash, userAgent } = await getPrivacyContext();

  await prisma.proposalEvent.create({
    data: {
      leadId: lead.id,
      eventType: type,
      ipHash,
      userAgent,
    },
  });

  return { ok: true };
}

export type LeadEngagement = {
  totalViews: number;
  /** ISO 8601 or null */
  lastSeen: string | null;
  live: boolean;
};

export async function getVaultEngagementMap(
  leadIds: string[],
): Promise<Record<string, LeadEngagement>> {
  const empty: Record<string, LeadEngagement> = {};
  if (!leadIds.length) return empty;

  const prisma = getPrisma();
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);

  const events = await prisma.proposalEvent.findMany({
    where: { leadId: { in: leadIds } },
    select: { leadId: true, eventType: true, createdAt: true },
  });

  for (const id of leadIds) {
    empty[id] = { totalViews: 0, lastSeen: null, live: false };
  }

  for (const e of events) {
    const bucket = empty[e.leadId];
    if (!bucket) continue;

    const t = e.createdAt.getTime();
    const last = bucket.lastSeen ? new Date(bucket.lastSeen).getTime() : 0;
    if (t > last) {
      bucket.lastSeen = e.createdAt.toISOString();
    }

    if (e.eventType === "OPEN") {
      bucket.totalViews += 1;
      if (e.createdAt >= tenMinAgo) {
        bucket.live = true;
      }
    }
  }

  return empty;
}
