/**
 * Sovereign Copywriter — Lemon Squeezy / in-app product suite (IsoFlux · AuraMesh).
 * 369 narrative + brutalist tone. Paste `formatProductForLemonSqueezy()` into LS product descriptions.
 */

export type SovereignProductKey = "aegisPay" | "overwatchPro";

export const SOVEREIGN_VIBE = {
  lexicon: [
    "Ghost-Ops",
    "Sovereign Infrastructure",
    "Resonant Defense",
    "Digital Fragility",
    "Sovereign Sync",
    "Final Transition",
  ] as const,
  tagline:
    "Brutalist clarity. Monospaced conviction. Infrastructure that does not negotiate with dead zones.",
} as const;

export const aegisPayProduct = {
  name: "Aegis-Pay Terminal",
  subtitle: "P2P settlement rail · Resonant Defense for real money",
  /** Root 3 — The Pain */
  root3: `Digital Fragility is not a metaphor—it is the map going dark while your settlement still has to clear. Dead zones in connectivity, unsecure rails, and linear payment stacks that treat latency as someone else's problem. You feel it in the anxiety before every high-value move: one hop out of sync, one trust boundary blurred, and the whole chain reads as failure. Aegis-Pay was built for operators who refuse to run Ghost-Ops finance on consumer-grade assumptions.`,
  /** Root 6 — The Proof */
  root6: `IsoFlux does not chase speed with chaos—it uses resonance. The Vortex Math doubling circuit (1 → 2 → 4 → 8 → 7 → 5) is our performance spine: each stage doubles throughput discipline while bleeding off noise, so the mesh holds zero-lag coordination under load—not heroics. Settlement timing follows 369 cadence: triadic gates (commit / verify / release) so money moves with cryptographic rhythm, not wishful batch windows. This is Sovereign Infrastructure: predictable, auditable, and tuned for the pulse of the market.`,
  /** Root 9 — The Sovereign Result */
  root9: `The Final Transition is control without theater: P2P settlement you can reason about, rails that align to ISO 20022 semantics, and a system that breathes with volatility instead of breaking under it. Absolute security is not a slogan—it is layered Resonant Defense from ingress to anchor. You get finality you can defend in an audit, and a terminal that behaves like infrastructure, not a slot machine.`,
  specBullets: [
    "P2P Settlement",
    "369 Gas Resonance",
    "ISO 20022 Ready",
  ] as const,
} as const;

export const overwatchProProduct = {
  name: "Overwatch Pro",
  subtitle: "Ghost-Ops geospatial command · AuraMesh live uplink",
  root3: `Overwatch begins where linear dashboards end: in the field, where Digital Fragility is geographic. Dead zones are not just “bad signal”—they are blind spots where vulnerability compounds: missed hours, invisible storefronts, competitors who own the map layer while you own the lease. Unsecure intuition is not a strategy. Overwatch Pro is the Resonant Defense lens for operators who need truth on terrain before they spend another dollar on noise.`,
  root6: `The mesh does not guess—it triangulates. IsoFlux fuses 3D geospatial intelligence with vulnerability scoring so every lead carries a defensible rationale: where fragility concentrates, where outreach lands, where AuraMesh becomes the bridge from invisible to inevitable. The Vortex Math doubling circuit (1-2-4-8-7-5) governs how signals compress into action: each doubling step removes drag so your team runs zero-lag strike cadence. 369-timing sequences discovery, qualification, and follow-up so the stack resonates instead of stutters.`,
  root9: `The Final Transition is sovereign sight: a live uplink that breathes with the market—new targets, shifting risk, and proof you can show an owner in one screen. Complete control means your pipeline is not rented from a black box; it is Sovereign Infrastructure you can explain, repeat, and scale. Ghost-Ops becomes Ghost-Ops with receipts: intelligence that converts.`,
  specBullets: [
    "3D Geospatial Intelligence",
    "Vulnerability Scoring",
    "AuraMesh Live Uplink",
  ] as const,
} as const;

/** Plain-text block for CRM / long-form sales pages. */
export function formatProductLongForm(key: SovereignProductKey): string {
  const p = key === "aegisPay" ? aegisPayProduct : overwatchProProduct;
  return [
    `${p.name}`,
    p.subtitle,
    "",
    "── ROOT 3 · THE PAIN ──",
    p.root3,
    "",
    "── ROOT 6 · THE PROOF ──",
    p.root6,
    "",
    "── ROOT 9 · THE SOVEREIGN RESULT ──",
    p.root9,
    "",
    "── SPECS ──",
    ...p.specBullets.map((b) => `• ${b}`),
  ].join("\n");
}

/** Optimized for Lemon Squeezy product description (HTML-friendly plain text). */
export function formatProductForLemonSqueezy(key: SovereignProductKey): string {
  const p = key === "aegisPay" ? aegisPayProduct : overwatchProProduct;
  const bullets = p.specBullets.map((b) => `• ${b}`).join("\n");
  return `${p.name} — ${p.subtitle}

${p.root3}

${p.root6}

${p.root9}

SPECS
${bullets}

${SOVEREIGN_VIBE.tagline}`;
}

export function getProductOneLiner(key: SovereignProductKey): string {
  return key === "aegisPay"
    ? "Resonant P2P settlement: 369 gates, ISO 20022-ready, built for sovereign money."
    : "Ghost-Ops geospatial command: score fragility, strike with AuraMesh uplink.";
}
