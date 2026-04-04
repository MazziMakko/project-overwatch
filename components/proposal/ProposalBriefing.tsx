"use client";

import dynamic from "next/dynamic";
import { trackProposalEvent } from "@/app/actions/proposalAnalytics";
import type { PublicProposalPayload } from "@/app/actions/proposalPublic";

const ProposalMapSnippet = dynamic(
  () =>
    import("./ProposalMapSnippet").then((m) => m.ProposalMapSnippet),
  { ssr: false, loading: () => <MapPlaceholder /> },
);

function MapPlaceholder() {
  return (
    <div className="flex aspect-[16/10] w-full max-w-3xl items-center justify-center rounded-xl border border-white/[0.08] bg-black/60 font-mono text-xs text-slate-600">
      Loading tactical grid…
    </div>
  );
}

function pilotMailto(data: PublicProposalPayload): string {
  const email =
    process.env.NEXT_PUBLIC_PILOT_CONTACT_EMAIL ?? "hello@example.com";
  const subject = encodeURIComponent(
    `30-Day Tablet Pilot — ${data.businessName}`,
  );
  const body = encodeURIComponent(
    `We reviewed the Digital Fragility audit for ${data.businessName}.\n\nWe are interested in scheduling the 30-Day Tablet Pilot for Sovereign Sync / AuraMesh.\n\n— `,
  );
  return `mailto:${email}?subject=${subject}&body=${body}`;
}

export function ProposalBriefing({
  token,
  data,
}: {
  token: string;
  data: PublicProposalPayload;
}) {
  const locale = data.cityLabel
    ? `${data.categoryLabel} · ${data.cityLabel}`
    : data.categoryLabel;

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.12),transparent)]" />

      <header className="relative border-b border-white/[0.06] bg-[#050505]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-6 py-10">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-emerald-500/80">
            AuraMesh · Sovereign Sync
          </p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Digital Fragility Audit: {data.businessName}
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-500">
            {locale} — vulnerability index{" "}
            <span className="font-mono text-emerald-400/90">
              {data.vulnerabilityScore}
            </span>
            <span className="text-slate-600">/5</span> based on public
            discovery signals (maps, web, hours, contact).
          </p>
        </div>
      </header>

      <main className="relative mx-auto max-w-3xl space-y-14 px-6 py-12">
        <section className="space-y-4">
          <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
            Location lock
          </h2>
          <ProposalMapSnippet lat={data.lat} lng={data.lng} />
        </section>

        <section className="space-y-4">
          <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
            Intelligence summary
          </h2>
          <ul className="space-y-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
            {data.findings.map((line, i) => (
              <li
                key={i}
                className="flex gap-3 text-sm leading-relaxed text-slate-300"
              >
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-red-400/80 shadow-[0_0_10px_rgba(248,113,113,0.45)]" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-8">
          <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-400/80">
            The fix · Sovereign Sync
          </h2>
          <p className="text-sm leading-relaxed text-slate-300">
            <strong className="text-white">AuraMesh</strong> runs the{" "}
            <strong className="text-white">Sovereign Sync</strong> protocol: one
            source of truth for your hours, web presence, and contact paths so
            maps, search, and voice assistants stop contradicting each other.
            We eliminate the{" "}
            <span className="text-emerald-200/90">digital fragility</span>{" "}
            that costs you walk-ins and trust.
          </p>
          <p className="text-sm leading-relaxed text-slate-400">
            Tablet-first pilot: your team confirms data once; we propagate with
            audit trails suitable for operators who care about proof, not
            guesswork.
          </p>
        </section>

        <section className="pb-20">
          <a
            href={pilotMailto(data)}
            onClick={() => void trackProposalEvent(token, "PILOT_CLICK")}
            className="inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white px-6 py-4 text-sm font-semibold text-black transition hover:bg-slate-100 sm:w-auto"
          >
            Schedule 30-Day Tablet Pilot
          </a>
          <p className="mt-4 text-xs leading-relaxed text-slate-600">
            Opens your mail client with a pre-filled subject line. Add your
            best callback number in the body if you want a same-day reply.
          </p>
        </section>
      </main>
    </div>
  );
}
