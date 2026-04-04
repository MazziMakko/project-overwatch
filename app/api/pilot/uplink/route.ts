import { auth } from "@clerk/nextjs/server";
import { getPrisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Server-Sent Events: new AuraMeshAudit rows synced for the user's vault sites.
 * Same-origin cookies carry Clerk session.
 */
export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const prisma = getPrisma();
  const leads = await prisma.sovereignLead.findMany({
    where: { userId },
    select: { id: true },
  });
  const leadIds = leads.map((l) => l.id);

  const encoder = new TextEncoder();
  const signal = request.signal;

  const stream = new ReadableStream({
    async start(controller) {
      let watermark = new Date(Date.now() - 120_000);

      const ping = () => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          /* closed */
        }
      };

      const pushBatch = async () => {
        if (leadIds.length === 0) return;
        try {
          const batch = await prisma.auraMeshAudit.findMany({
            where: {
              businessId: { in: leadIds },
              syncedAt: { gt: watermark },
            },
            orderBy: { syncedAt: "asc" },
            take: 100,
            select: {
              id: true,
              businessId: true,
              cryptoHash: true,
              latitude: true,
              longitude: true,
              syncedAt: true,
            },
          });
          for (const r of batch) {
            const payload = {
              type: "uplink",
              id: r.id,
              businessId: r.businessId,
              cryptoHash: r.cryptoHash,
              lat: r.latitude,
              lng: r.longitude,
              syncedAt: r.syncedAt.toISOString(),
            };
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
            );
            if (r.syncedAt > watermark) watermark = r.syncedAt;
          }
        } catch {
          try {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "error", message: "poll failed" })}\n\n`,
              ),
            );
          } catch {
            /* closed */
          }
        }
      };

      await pushBatch();
      const poll = setInterval(() => {
        void pushBatch();
      }, 2800);
      const keepalive = setInterval(ping, 15000);

      const stop = () => {
        clearInterval(poll);
        clearInterval(keepalive);
        try {
          controller.close();
        } catch {
          /* noop */
        }
      };

      signal.addEventListener("abort", stop);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
