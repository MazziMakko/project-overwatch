/**
 * Lemon Squeezy REST client (JSON:API + License API).
 *
 * There is no first-party `@lemonsqueezy/*` npm package with reliable releases; the stack uses
 * the official HTTPS API per https://docs.lemonsqueezy.com/api with `LEMONSQUEEZY_API_KEY` +
 * `LEMONSQUEEZY_STORE_ID`.
 */

const JSON_API = "https://api.lemonsqueezy.com/v1";

export type LemonSqueezyConfig = {
  apiKey: string;
  storeId: string;
};

export function getLemonSqueezyConfig(): LemonSqueezyConfig {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY?.trim();
  const storeId = process.env.LEMONSQUEEZY_STORE_ID?.trim();
  if (!apiKey || !storeId) {
    throw new Error(
      "LEMONSQUEEZY_API_KEY and LEMONSQUEEZY_STORE_ID must be set for Lemon Squeezy.",
    );
  }
  return { apiKey, storeId };
}

export async function lemonSqueezyJsonApi(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const { apiKey } = getLemonSqueezyConfig();
  const url = path.startsWith("http") ? path : `${JSON_API}${path.startsWith("/") ? "" : "/"}${path}`;
  return fetch(url, {
    ...init,
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${apiKey}`,
      ...init.headers,
    },
  });
}

export type CreateCheckoutInput = {
  variantId: string;
  /** Passed through to webhook `meta.custom_data` (e.g. Clerk user id, lead id). */
  custom: Record<string, string | number | boolean>;
  /** Optional redirect after successful purchase. */
  redirectUrl?: string;
};

/**
 * Creates a hosted checkout and returns the checkout URL from `data.attributes.url`.
 */
export async function createCheckoutUrl(input: CreateCheckoutInput): Promise<string> {
  const { storeId } = getLemonSqueezyConfig();

  const productOptions =
    input.redirectUrl && input.redirectUrl.length > 0
      ? { redirect_url: input.redirectUrl }
      : {};

  const body = {
    data: {
      type: "checkouts",
      attributes: {
        checkout_data: {
          custom: input.custom,
        },
        product_options: productOptions,
      },
      relationships: {
        store: {
          data: { type: "stores", id: String(storeId) },
        },
        variant: {
          data: { type: "variants", id: String(input.variantId) },
        },
      },
    },
  };

  const res = await lemonSqueezyJsonApi("/checkouts", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `Lemon Squeezy checkout failed (${res.status}): ${errText.slice(0, 400)}`,
    );
  }

  const json = (await res.json()) as {
    data?: { attributes?: { url?: string } };
  };
  const url = json.data?.attributes?.url;
  if (!url || typeof url !== "string") {
    throw new Error("Lemon Squeezy checkout response missing checkout URL.");
  }
  return url;
}
