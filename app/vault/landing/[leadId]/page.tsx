import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getSovereignBriefingForLead,
  parseStoredBriefing,
} from "@/app/actions/sovereignMetadata";
import { getPrisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ leadId: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { leadId } = await params;
  const briefing = await getSovereignBriefingForLead(leadId);
  if (briefing) {
    return {
      title: briefing.seoTitle,
      description: briefing.seoDescription,
    };
  }
  const { userId } = await auth();
  if (!userId) {
    return { title: "Sovereign landing · AuraMesh" };
  }
  const lead = await getPrisma().sovereignLead.findFirst({
    where: { id: leadId, userId },
    select: { name: true },
  });
  return {
    title: lead ? `${lead.name} · Sovereign landing` : "Sovereign landing",
  };
}

export default async function VaultLandingPage({ params }: PageProps) {
  const { leadId } = await params;
  const { userId } = await auth();

  if (!userId) {
    return (
      <div className="min-h-screen bg-[#030303] px-6 py-16 text-slate-200">
        <div className="mx-auto max-w-lg border border-white/10 bg-black/40 p-8 font-mono text-sm">
          <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">
            Sovereign landing
          </p>
          <p className="mt-4 text-slate-300">
            Sign in to view this briefing document.
          </p>
          <Link
            href="/vault"
            className="mt-6 inline-block border border-lime-500/40 bg-lime-500/10 px-4 py-2 text-xs text-lime-100 hover:bg-lime-500/20"
          >
            → Vault
          </Link>
        </div>
      </div>
    );
  }

  const row = await getPrisma().sovereignLead.findFirst({
    where: { id: leadId, userId },
    select: { name: true, type: true, sovereignBriefing: true },
  });
  if (!row) notFound();

  const briefing = parseStoredBriefing(row.sovereignBriefing);

  return (
    <div className="min-h-screen bg-[#030303] text-slate-200">
      <header className="border-b border-white/10 bg-black/50 px-6 py-4">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-slate-500">
              Hosted SEO draft
            </p>
            <h1 className="mt-1 font-mono text-lg font-semibold tracking-tight text-lime-200/95">
              {briefing?.seoTitle ?? row.name}
            </h1>
            <p className="mt-1 font-mono text-[11px] text-slate-500">
              {row.type}
            </p>
          </div>
          <Link
            href="/vault"
            className="rounded border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-xs text-slate-300 hover:bg-white/10"
          >
            ← Vault
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        {!briefing ? (
          <div className="border border-amber-500/30 bg-amber-950/20 p-6 font-mono text-sm text-amber-100/90">
            <p className="text-[10px] uppercase tracking-widest text-amber-400/80">
              No snapshot yet
            </p>
            <p className="mt-3 leading-relaxed text-slate-300">
              Generate a Digital Fragility Report in the Vault briefing panel — the snapshot
              saves automatically and unlocks this page for SEO-ready hosting.
            </p>
            <Link
              href="/vault"
              className="mt-5 inline-block border border-lime-500/35 bg-lime-500/10 px-4 py-2 text-xs text-lime-100"
            >
              Open Vault
            </Link>
          </div>
        ) : (
          <article className="space-y-8 font-mono text-[13px] leading-relaxed">
            <p className="border border-dashed border-white/15 bg-black/30 p-4 text-[12px] text-slate-400">
              {briefing.seoDescription}
            </p>

            <section className="border border-white/15 bg-[#0a0a0a] p-5 shadow-[inset_0_0_0_1px_rgba(163,230,53,0.1)]">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300">
                Root 3 · Problem
              </h2>
              <p className="mt-3 whitespace-pre-wrap text-slate-300">
                {briefing.root3Problem}
              </p>
            </section>

            <section className="border border-white/15 bg-[#0a0a0a] p-5 shadow-[inset_0_0_0_1px_rgba(139,92,246,0.12)]">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300">
                Root 6 · Logic
              </h2>
              <p className="mt-3 whitespace-pre-wrap text-slate-300">
                {briefing.root6Logic}
              </p>
            </section>

            <section className="border border-white/15 bg-[#0a0a0a] p-5 shadow-[inset_0_0_0_1px_rgba(163,230,53,0.1)]">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300">
                Root 9 · Source
              </h2>
              <p className="mt-3 whitespace-pre-wrap text-slate-300">
                {briefing.root9Source}
              </p>
            </section>

            <footer className="border-t border-white/10 pt-6 text-center text-[10px] uppercase tracking-[0.3em] text-slate-600">
              AuraMesh · Sovereign metadata engine
            </footer>
          </article>
        )}
      </main>
    </div>
  );
}
