import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function hashProposalPin(pin: string): {
  saltB64: string;
  hashHex: string;
} {
  const salt = randomBytes(16);
  const hash = scryptSync(pin.normalize("NFKC"), salt, 32);
  return { saltB64: salt.toString("base64"), hashHex: hash.toString("hex") };
}

export function verifyProposalPin(
  pin: string,
  saltB64: string,
  hashHex: string,
): boolean {
  try {
    const salt = Buffer.from(saltB64, "base64");
    const expected = Buffer.from(hashHex, "hex");
    const actual = scryptSync(pin.normalize("NFKC"), salt, 32);
    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  } catch {
    return false;
  }
}
