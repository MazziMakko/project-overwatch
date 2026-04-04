import { getLemonSqueezyConfig } from "@/lib/lemonsqueezy/client";

const LICENSE_API = "https://api.lemonsqueezy.com/v1/licenses/validate";

/** Default product label for the Aegis-Pay Terminal SKU (override via env). */
const DEFAULT_AEGIS_PRODUCT_LABEL = "Aegis-Pay Terminal";

export type LicenseValidateResponse = {
  valid: boolean;
  error: string | null;
  license_key?: {
    id: number;
    status: string;
    key: string;
    activation_limit: number;
    activation_usage: number;
    created_at: string;
    expires_at: string | null;
  };
  instance?: unknown;
  meta?: {
    store_id?: number;
    product_id?: number;
    product_name?: string;
    variant_id?: number;
    variant_name?: string;
    customer_id?: number;
    customer_name?: string;
    customer_email?: string;
  };
};

async function postLicenseValidate(licenseKey: string): Promise<LicenseValidateResponse> {
  let apiKey: string;
  try {
    apiKey = getLemonSqueezyConfig().apiKey;
  } catch {
    throw new Error("LEMONSQUEEZY_API_KEY not configured");
  }
  const body = new URLSearchParams({ license_key: licenseKey.trim() });
  const res = await fetch(LICENSE_API, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Bearer ${apiKey}`,
    },
    body,
  });
  const json = (await res.json()) as LicenseValidateResponse;
  return json;
}

/**
 * Validates a license key for the "Aegis-Pay Terminal" product (Lemon Squeezy / Gumroad-class SKU).
 * Matches `LEMONSQUEEZY_AEGIS_PAY_PRODUCT_NAME` when set, otherwise substring "Aegis-Pay" on product or variant name.
 */
export async function validateAegisPayLicenseKey(licenseKey: string): Promise<{
  ok: boolean;
  reason?: string;
  meta?: LicenseValidateResponse["meta"];
}> {
  const key = licenseKey.trim();
  if (!key) {
    return { ok: false, reason: "Empty license key." };
  }

  let raw: LicenseValidateResponse;
  try {
    raw = await postLicenseValidate(key);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "License validation request failed.";
    return { ok: false, reason: msg };
  }

  if (!raw.valid) {
    return {
      ok: false,
      reason: raw.error ?? "License not valid.",
    };
  }

  const expected =
    process.env.LEMONSQUEEZY_AEGIS_PAY_PRODUCT_NAME?.trim() || DEFAULT_AEGIS_PRODUCT_LABEL;
  const productName = raw.meta?.product_name ?? "";
  const variantName = raw.meta?.variant_name ?? "";
  const haystack = `${productName} ${variantName}`;

  const variantAllow = process.env.LEMONSQUEEZY_VARIANT_AEGIS_PAY?.trim();
  if (variantAllow && String(raw.meta?.variant_id) === variantAllow) {
    return { ok: true, meta: raw.meta };
  }

  if (
    haystack.includes(expected) ||
    haystack.toLowerCase().includes("aegis-pay") ||
    haystack.toLowerCase().includes("aegis pay")
  ) {
    return { ok: true, meta: raw.meta };
  }

  return {
    ok: false,
    reason: `License is valid but product does not match ${expected}.`,
    meta: raw.meta,
  };
}
