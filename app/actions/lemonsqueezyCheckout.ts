"use server";

import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { createCheckoutUrl } from "@/lib/lemonsqueezy/client";

async function getAppOrigin(): Promise<string | undefined> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (host) return `${proto}://${host}`;
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  return fromEnv?.replace(/\/$/, "") || undefined;
}

export type SovereignCheckoutProduct = "aegis" | "overwatch";

export async function provisionSovereignCheckout(input?: {
  leadId?: string | null;
  product?: SovereignCheckoutProduct;
}): Promise<
  { ok: true; checkoutUrl: string } | { ok: false; error: string }
> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: "Sign in to provision access." };
  }

  const product = input?.product ?? "aegis";
  const variantId =
    product === "overwatch"
      ? process.env.LEMONSQUEEZY_VARIANT_OVERWATCH_PRO?.trim()
      : process.env.LEMONSQUEEZY_VARIANT_AEGIS_PAY?.trim();
  const fallback = process.env.LEMONSQUEEZY_DEFAULT_VARIANT_ID?.trim();
  const resolved = variantId || fallback;
  if (!resolved) {
    return {
      ok: false,
      error:
        "Configure LEMONSQUEEZY_VARIANT_AEGIS_PAY, LEMONSQUEEZY_VARIANT_OVERWATCH_PRO, or LEMONSQUEEZY_DEFAULT_VARIANT_ID.",
    };
  }

  try {
    const origin = await getAppOrigin();
    const redirectUrl = origin ? `${origin}/vault?checkout=success` : undefined;

    const checkoutUrl = await createCheckoutUrl({
      variantId: resolved,
      custom: {
        user_id: userId,
        ...(input?.leadId ? { lead_id: input.leadId } : {}),
      },
      redirectUrl,
    });

    return { ok: true, checkoutUrl };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Checkout failed.";
    return { ok: false, error: msg };
  }
}
