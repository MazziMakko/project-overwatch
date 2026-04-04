#!/usr/bin/env node
/**
 * Production env gate — checks presence only (never prints secret values).
 * Usage: node scripts/check-env.mjs
 * Optional: load .env.local first: node --env-file=.env.local scripts/check-env.mjs (Node 20+)
 */

const required = [
  "DATABASE_URL",
  "GROQ_API_KEY",
  "PROPOSAL_IP_SALT",
  "CLERK_SECRET_KEY",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
];

const recommended = [
  "ETHERSCAN_API_KEY",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_APP_URL",
  "NOMINATIM_CONTACT_EMAIL",
  "LEMONSQUEEZY_API_KEY",
  "LEMONSQUEEZY_STORE_ID",
  "LEMONSQUEEZY_WEBHOOK_SECRET",
];

let failed = false;

for (const key of required) {
  const v = process.env[key];
  if (v == null || String(v).trim() === "") {
    console.error(`[check-env] MISSING required: ${key}`);
    failed = true;
  } else {
    console.log(`[check-env] OK required: ${key} (set)`);
  }
}

for (const key of recommended) {
  const v = process.env[key];
  if (v == null || String(v).trim() === "") {
    console.warn(`[check-env] WARN recommended: ${key} (unset)`);
  } else {
    console.log(`[check-env] OK recommended: ${key} (set)`);
  }
}

if (failed) {
  console.error("\n[check-env] FAILED — set secrets in Vercel/hosting only, never commit.");
  process.exit(1);
}

console.log("\n[check-env] PASS — required production keys present (values not shown).");
