"use server";

import { randomBytes } from "node:crypto";
import { auth } from "@clerk/nextjs/server";
import { cookies, headers } from "next/headers";
import { getPrisma } from "@/lib/db";
import { proposalUnlockCookieName } from "@/lib/proposal/cookie";
import { hashProposalPin, verifyProposalPin } from "@/lib/proposal/pin";
import { sanitizeString } from "@/lib/sanitizeOsm";
import { trackProposalEvent } from "@/app/actions/proposalAnalytics";

function newShareToken(): string {
  return randomBytes(24).toString("base64url");
}

async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) {
    return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  }
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

export async function ensureProposalShareUrl(input: {
  leadId: string;
  /**
   * Omit to leave PIN unchanged.
   * Pass "" to remove PIN protection.
   * Pass 4–12 chars to set or replace PIN.
   */
  accessPin?: string;
}): Promise<{ url: string; hasPin: boolean }> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Sign in to generate a proposal link.");
  }

  const prisma = getPrisma();
  const row = await prisma.sovereignLead.findFirst({
    where: { id: input.leadId, userId },
    select: {
      id: true,
      proposalShareToken: true,
      proposalPinHash: true,
    },
  });
  if (!row) {
    throw new Error("Lead not found or access denied.");
  }

  const token = row.proposalShareToken ?? newShareToken();

  type PinUpdate = {
    proposalPinSalt?: string | null;
    proposalPinHash?: string | null;
  };
  let pinUpdate: PinUpdate = {};

  if (input.accessPin !== undefined) {
    const pinRaw = input.accessPin.trim();
    if (pinRaw.length === 0) {
      pinUpdate = { proposalPinSalt: null, proposalPinHash: null };
    } else {
      if (pinRaw.length < 4 || pinRaw.length > 12) {
        throw new Error("Access PIN must be 4–12 characters.");
      }
      const { saltB64, hashHex } = hashProposalPin(pinRaw);
      pinUpdate = { proposalPinSalt: saltB64, proposalPinHash: hashHex };
    }
  }

  const updated = await prisma.sovereignLead.update({
    where: { id: row.id },
    data: {
      proposalShareToken: token,
      ...pinUpdate,
    },
    select: { proposalPinHash: true },
  });

  const origin = await requestOrigin();
  const url = `${origin.replace(/\/$/, "")}/p/${encodeURIComponent(token)}`;
  return { url, hasPin: Boolean(updated.proposalPinHash) };
}

export async function verifyProposalUnlock(input: {
  token: string;
  pin: string;
}): Promise<{ ok: boolean; message?: string }> {
  const prisma = getPrisma();
  const row = await prisma.sovereignLead.findUnique({
    where: { proposalShareToken: input.token },
    select: {
      proposalPinHash: true,
      proposalPinSalt: true,
    },
  });

  if (!row?.proposalPinHash || !row.proposalPinSalt) {
    return { ok: false, message: "This briefing is not PIN-protected." };
  }

  if (!verifyProposalPin(input.pin, row.proposalPinSalt, row.proposalPinHash)) {
    return { ok: false, message: "Incorrect access code." };
  }

  const cookieStore = await cookies();
  cookieStore.set(proposalUnlockCookieName(input.token), "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  await trackProposalEvent(input.token, "UNLOCK");

  return { ok: true };
}

export type PublicProposalPayload = {
  businessName: string;
  categoryLabel: string;
  cityLabel: string | null;
  lat: number;
  lng: number;
  vulnerabilityScore: number;
  findings: string[];
};

export type ProposalPageLoadResult =
  | { kind: "not_found" }
  | { kind: "locked" }
  | { kind: "ok"; data: PublicProposalPayload };

export async function loadProposalPage(
  token: string,
): Promise<ProposalPageLoadResult> {
  const prisma = getPrisma();
  const row = await prisma.sovereignLead.findUnique({
    where: { proposalShareToken: token },
    select: {
      name: true,
      type: true,
      website: true,
      phone: true,
      vulnerabilityScore: true,
      lat: true,
      lng: true,
      osmMetadata: true,
      proposalPinHash: true,
    },
  });

  if (!row) return { kind: "not_found" };

  const cookieStore = await cookies();
  const pinLocked = Boolean(row.proposalPinHash);
  const unlocked =
    !pinLocked ||
    cookieStore.get(proposalUnlockCookieName(token))?.value === "1";

  if (pinLocked && !unlocked) {
    return { kind: "locked" };
  }

  const meta = (row.osmMetadata ?? {}) as Record<string, unknown>;
  const opening_hours =
    typeof meta.opening_hours === "string" ? meta.opening_hours : null;
  const city =
    (typeof meta["addr:city"] === "string" && meta["addr:city"]) ||
    (typeof meta["addr:place"] === "string" && meta["addr:place"]) ||
    null;

  const missingWebsite = row.website == null || row.website === "";
  const missingHours =
    opening_hours == null || String(opening_hours).trim() === "";
  const missingPhone = row.phone == null || row.phone === "";

  const findings: string[] = [];
  if (missingWebsite) {
    findings.push(
      "No authoritative web presence detected — high risk of invisibility in search and AI-assisted discovery.",
    );
  }
  if (missingHours) {
    findings.push(
      "Operating hours are not published in a machine-readable way — customers cannot trust “open now” signals.",
    );
  }
  if (missingPhone) {
    findings.push(
      "Primary voice contact is missing or thin — conversion paths break at the moment of intent.",
    );
  }
  if (findings.length === 0) {
    findings.push(
      "Baseline digital footprint is present; Sovereign Sync still hardens consistency across maps, voice, and web.",
    );
  }

  const categoryLabel = sanitizeString(
    row.type.replace(/^[^:]+:/, "").replace(/_/g, " ") || "Local business",
  ).slice(0, 120);

  return {
    kind: "ok",
    data: {
      businessName: sanitizeString(row.name).slice(0, 200),
      categoryLabel,
      cityLabel: city ? sanitizeString(String(city)).slice(0, 120) : null,
      lat: row.lat,
      lng: row.lng,
      vulnerabilityScore: row.vulnerabilityScore,
      findings,
    },
  };
}
