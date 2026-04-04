import { createHash } from "node:crypto";

export function proposalUnlockCookieName(token: string): string {
  const h = createHash("sha256").update(token).digest("hex").slice(0, 32);
  return `proposal_ok_${h}`;
}
