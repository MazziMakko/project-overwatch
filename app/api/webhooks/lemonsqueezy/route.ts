import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { verifyLemonSqueezyWebhookSignature } from "@/lib/lemonsqueezy/webhookVerify";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type LSWebhookBody = {
  meta?: {
    event_name?: string;
    custom_data?: Record<string, unknown>;
  };
  data?: {
    type?: string;
    id?: string;
    attributes?: Record<string, unknown>;
  };
};

function extractUserId(customData: Record<string, unknown> | undefined): string | null {
  if (!customData || typeof customData !== "object") return null;
  const raw = customData.user_id;
  if (typeof raw === "string" && raw.length > 0) return raw;
  if (typeof raw === "number") return String(raw);
  return null;
}

function extractVariantId(body: LSWebhookBody): string | null {
  const attr = body.data?.attributes;
  if (!attr) return null;
  const first = attr.first_order_item as { variant_id?: number } | undefined;
  if (first && typeof first.variant_id === "number") {
    return String(first.variant_id);
  }
  const vid = attr.variant_id;
  if (typeof vid === "number") return String(vid);
  if (typeof vid === "string" && vid.length > 0) return vid;
  return null;
}

/** Lemon Squeezy subscription statuses that should unlock paid features (incl. trial). */
function subscriptionGrantsAccess(status: string | undefined): boolean {
  if (!status) return false;
  return status === "active" || status === "on_trial";
}

function resolveVariantTargets(variantId: string | null): {
  aegis: boolean;
  pro: boolean;
} {
  if (!variantId) return { aegis: false, pro: false };
  const aegisV = process.env.LEMONSQUEEZY_VARIANT_AEGIS_PAY?.trim();
  const proV = process.env.LEMONSQUEEZY_VARIANT_OVERWATCH_PRO?.trim();
  const defV = process.env.LEMONSQUEEZY_DEFAULT_VARIANT_ID?.trim();

  if (aegisV && variantId === aegisV) return { aegis: true, pro: false };
  if (proV && variantId === proV) return { aegis: false, pro: true };
  if (defV && variantId === defV) return { aegis: true, pro: true };
  return { aegis: false, pro: false };
}

export async function POST(request: Request) {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "LEMONSQUEEZY_WEBHOOK_SECRET not configured" },
      { status: 500 },
    );
  }

  const rawBody = await request.text();
  const sig = request.headers.get("x-signature");
  if (!verifyLemonSqueezyWebhookSignature(rawBody, sig, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const eventName = request.headers.get("x-event-name")?.trim() ?? "";
  let body: LSWebhookBody;
  try {
    body = JSON.parse(rawBody) as LSWebhookBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = eventName || body.meta?.event_name || "";

  const subscriptionEvents = new Set([
    "subscription_created",
    "subscription_updated",
  ]);
  const orderEvents = new Set(["order_created"]);

  if (!subscriptionEvents.has(name) && !orderEvents.has(name)) {
    return NextResponse.json({ ok: true, ignored: name }, { status: 200 });
  }

  const userId = extractUserId(body.meta?.custom_data);
  if (!userId) {
    return NextResponse.json(
      { ok: true, skipped: "no user_id in custom_data" },
      { status: 200 },
    );
  }

  const prisma = getPrisma();
  const existing = await prisma.userEntitlement.findUnique({
    where: { userId },
  });

  const dataType = body.data?.type;
  const attr = body.data?.attributes ?? {};

  if (subscriptionEvents.has(name) && dataType === "subscriptions") {
    const variantId = extractVariantId(body);
    const targets = resolveVariantTargets(variantId);
    if (!targets.aegis && !targets.pro) {
      return NextResponse.json(
        {
          ok: true,
          skipped: "subscription variant not mapped to entitlements",
          variantId,
        },
        { status: 200 },
      );
    }

    const status =
      typeof attr.status === "string" ? attr.status : undefined;
    const hasAccess = subscriptionGrantsAccess(status);
    const customerId = attr.customer_id;

    const nextAegis = targets.aegis
      ? hasAccess
      : (existing?.aegisPayEnabled ?? false);
    const nextPro = targets.pro
      ? hasAccess
      : (existing?.overwatchProEnabled ?? false);

    const subscriptionId = body.data?.id ?? null;

    await prisma.userEntitlement.upsert({
      where: { userId },
      create: {
        userId,
        aegisPayEnabled: nextAegis,
        overwatchProEnabled: nextPro,
        lemonSqueezyCustomerId:
          customerId != null ? String(customerId) : null,
        lastOrderIdentifier: existing?.lastOrderIdentifier ?? null,
        lastSubscriptionId: subscriptionId,
      },
      update: {
        aegisPayEnabled: nextAegis,
        overwatchProEnabled: nextPro,
        ...(customerId != null
          ? { lemonSqueezyCustomerId: String(customerId) }
          : {}),
        ...(subscriptionId ? { lastSubscriptionId: subscriptionId } : {}),
      },
    });

    return NextResponse.json({ ok: true, mode: "subscription" }, { status: 200 });
  }

  if (name === "order_created") {
    const variantId = extractVariantId(body);
    const flags = resolveVariantTargets(variantId);
    if (!flags.aegis && !flags.pro) {
      return NextResponse.json(
        {
          ok: true,
          skipped: "variant not mapped to entitlements",
          variantId,
        },
        { status: 200 },
      );
    }

    const customerId = attr.customer_id;
    const orderIdentifier =
      typeof attr.identifier === "string" ? attr.identifier : null;

    const nextAegis = (existing?.aegisPayEnabled ?? false) || flags.aegis;
    const nextPro = (existing?.overwatchProEnabled ?? false) || flags.pro;

    const subscriptionId =
      dataType === "subscriptions" && body.data?.id ? body.data.id : null;

    await prisma.userEntitlement.upsert({
      where: { userId },
      create: {
        userId,
        aegisPayEnabled: nextAegis,
        overwatchProEnabled: nextPro,
        lemonSqueezyCustomerId:
          customerId != null ? String(customerId) : null,
        lastOrderIdentifier: orderIdentifier,
        lastSubscriptionId: subscriptionId,
      },
      update: {
        aegisPayEnabled: nextAegis,
        overwatchProEnabled: nextPro,
        ...(customerId != null
          ? { lemonSqueezyCustomerId: String(customerId) }
          : {}),
        ...(orderIdentifier ? { lastOrderIdentifier: orderIdentifier } : {}),
        ...(subscriptionId ? { lastSubscriptionId: subscriptionId } : {}),
      },
    });

    return NextResponse.json({ ok: true, mode: "order" }, { status: 200 });
  }

  return NextResponse.json({ ok: true, ignored: name }, { status: 200 });
}

export async function GET() {
  return NextResponse.json({ ok: false }, { status: 405 });
}
