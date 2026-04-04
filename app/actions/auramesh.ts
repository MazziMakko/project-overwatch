"use server";

import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  buildAuditCanonical,
  type AuditHashMaterial,
} from "@/lib/auditIntegrity";
import { getPrisma } from "@/lib/db";
import { messageFromUnknown } from "@/lib/messageFromUnknown";

const auditRowSchema = z.object({
  businessId: z.string().min(1),
  technicianName: z.string().nullable().optional(),
  payload: z.record(z.string(), z.unknown()),
  latitude: z.number(),
  longitude: z.number(),
  accuracy: z.number().nullable(),
  photoUrl: z.string().nullable().optional(),
  capturedAt: z.string().min(1),
  cryptoHash: z
    .string()
    .length(64)
    .regex(/^[a-f0-9]+$/i),
});

const batchSchema = z.array(auditRowSchema).max(50);

function serverVerifyHash(material: AuditHashMaterial, claimed: string): boolean {
  const canonical = buildAuditCanonical(material);
  const actual = createHash("sha256").update(canonical, "utf8").digest("hex");
  return actual.toLowerCase() === claimed.toLowerCase();
}

export async function syncAuditsToLedger(
  audits: z.infer<typeof batchSchema>,
): Promise<{ ok: true; ids: string[] } | { ok: false; error: string }> {
  const parsed = batchSchema.safeParse(audits);
  if (!parsed.success) {
    return { ok: false, error: "Invalid audit payload" };
  }

  const prisma = getPrisma();
  const ids: string[] = [];

  const hashKey = (h: string) => h.toLowerCase();

  try {
    await prisma.$transaction(async (tx) => {
      for (const row of parsed.data) {
        const material: AuditHashMaterial = {
          businessId: row.businessId,
          technicianName: row.technicianName ?? null,
          payload: row.payload,
          latitude: row.latitude,
          longitude: row.longitude,
          accuracy: row.accuracy,
          photoUrl: row.photoUrl ?? null,
          capturedAt: row.capturedAt,
        };

        if (!serverVerifyHash(material, row.cryptoHash)) {
          throw new Error(`Integrity check failed for hash ${row.cryptoHash}`);
        }

        const key = hashKey(row.cryptoHash);
        const saved = await tx.auraMeshAudit.upsert({
          where: { cryptoHash: key },
          create: {
            businessId: row.businessId,
            technicianName: row.technicianName ?? null,
            payload: row.payload as Prisma.InputJsonValue,
            latitude: row.latitude,
            longitude: row.longitude,
            accuracy: row.accuracy,
            photoUrl: row.photoUrl ?? null,
            capturedAt: new Date(row.capturedAt),
            cryptoHash: key,
          },
          update: { syncedAt: new Date() },
          select: { id: true },
        });
        ids.push(saved.id);
      }
    });
  } catch (e) {
    return {
      ok: false,
      error: messageFromUnknown(e),
    };
  }

  return { ok: true, ids };
}
