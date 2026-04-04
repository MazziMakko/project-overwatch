"use server";

import { auth } from "@clerk/nextjs/server";
import { getPrisma } from "@/lib/db";

export type PilotAuditDTO = {
  id: string;
  businessId: string;
  latitude: number;
  longitude: number;
  cryptoHash: string;
  capturedAt: string;
  syncedAt: string;
};

/**
 * Audits whose businessId matches a vault lead owned by the signed-in user.
 * Optional businessId narrows to one pilot site (use vault lead id).
 */
export async function listPilotAudits(options?: {
  businessId?: string | null;
  limit?: number;
}): Promise<PilotAuditDTO[]> {
  const { userId } = await auth();
  if (!userId) return [];

  const prisma = getPrisma();
  const leads = await prisma.sovereignLead.findMany({
    where: { userId },
    select: { id: true },
  });
  const leadIds = leads.map((l) => l.id);
  if (leadIds.length === 0) return [];

  const bid = options?.businessId?.trim();
  if (bid && !leadIds.includes(bid)) return [];

  const limit = Math.min(Math.max(options?.limit ?? 500, 1), 2000);

  const rows = await prisma.auraMeshAudit.findMany({
    where: {
      businessId: bid ? bid : { in: leadIds },
      latitude: { not: null },
      longitude: { not: null },
    },
    orderBy: { capturedAt: "desc" },
    take: limit,
    select: {
      id: true,
      businessId: true,
      latitude: true,
      longitude: true,
      cryptoHash: true,
      capturedAt: true,
      syncedAt: true,
    },
  });

  return rows
    .filter(
      (r): r is typeof r & { latitude: number; longitude: number } =>
        r.latitude != null && r.longitude != null,
    )
    .map((r) => ({
      id: r.id,
      businessId: r.businessId,
      latitude: r.latitude,
      longitude: r.longitude,
      cryptoHash: r.cryptoHash,
      capturedAt: r.capturedAt.toISOString(),
      syncedAt: r.syncedAt.toISOString(),
    }));
}
