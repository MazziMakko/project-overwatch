import { SystemsDiagram } from "@/components/architect/SystemsDiagram";

const CARDS = [
  {
    title: "0-Cost Infrastructure",
    body: "We engineered around expensive fleet SaaS lock-in. Open routing data, controlled signaling, and Neon-backed ledgering replace recurring enterprise bloat while preserving operational control.",
  },
  {
    title: "Cryptographic Integrity",
    body: "Each audit payload is canonically hashed with SHA-256 at capture and re-verified server-side before ledger insert. If bytes drift, the write is rejected. No silent mutation path.",
  },
  {
    title: "Geospatial Sovereignty",
    body: "Field capture enforces high-accuracy GPS with zero cache age, forcing hardware-grade location retrieval for compliance narratives and incident defensibility.",
  },
  {
    title: "The Briar Protocol",
    body: "When internet dies, tablets pivot to LAN/hotspot signaling and WebRTC peer channels. Audit events propagate device-to-device, sustaining operational continuity in dead zones.",
  },
] as const;

export default function ArchitectPage() {
  return (
    <main className="min-h-screen bg-[#030303] text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-8 sm:py-20">
        <header className="border-b border-white/10 pb-10">
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-lime-400">
            Proof-of-Work Showcase
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            The Grand Architect
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-relaxed text-neutral-400 sm:text-base">
            Production systems for high-risk operations: offline-first audit capture,
            cryptographic integrity, geospatial certainty, and cross-device mesh
            continuity. Built to survive compliance scrutiny and operational chaos.
          </p>
        </header>

        <section className="mt-10">
          <SystemsDiagram />
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-2">
          {CARDS.map((card, idx) => (
            <article
              key={card.title}
              className="border border-white/10 bg-black/35 p-5 transition hover:border-lime-400/30"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-neutral-500">
                Tactical Card {String(idx + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-3 text-xl font-semibold text-white">{card.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-neutral-400">{card.body}</p>
            </article>
          ))}
        </section>

        <section className="mt-10 border border-lime-400/30 bg-black/45 p-6 shadow-[0_0_0_1px_rgba(163,230,53,0.15),0_0_30px_rgba(132,204,22,0.12)]">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-lime-400">
            Technical Deep Dive
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-white">Video Anchor</h2>
          <p className="mt-3 max-w-2xl text-sm text-neutral-400">
            Insert architecture walkthrough footage here: live edge capture,
            dead-zone mesh handshake, ledger uplink replay, and forensic hash
            verification.
          </p>
          <div className="mt-5 border border-white/15 bg-[#060606] p-8 text-center">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500">
              Video Placeholder (16:9)
            </p>
          </div>
        </section>

        <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.2em] text-lime-300">
          Status: Go. We are moving from the shadows into the market.
        </p>
      </div>
    </main>
  );
}
