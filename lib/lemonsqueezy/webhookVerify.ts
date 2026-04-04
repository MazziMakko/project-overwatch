import crypto from "node:crypto";

/**
 * Verifies `X-Signature` HMAC-SHA256 (hex) of the raw body against `LEMONSQUEEZY_WEBHOOK_SECRET`.
 * @see https://docs.lemonsqueezy.com/help/webhooks/signing-requests
 */
export function verifyLemonSqueezyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader) return false;
  const hmac = crypto.createHmac("sha256", secret);
  const digestHex = hmac.update(rawBody).digest("hex");
  const digest = Buffer.from(digestHex, "utf8");
  const sig = Buffer.from(signatureHeader, "utf8");
  if (digest.length !== sig.length) return false;
  try {
    return crypto.timingSafeEqual(digest, sig);
  } catch {
    return false;
  }
}
