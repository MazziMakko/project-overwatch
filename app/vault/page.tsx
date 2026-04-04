import { auth } from "@clerk/nextjs/server";
import { SignInButton } from "@clerk/nextjs";
import Link from "next/link";
import { getVaultEngagementMap } from "@/app/actions/proposalAnalytics";
import { listVaultLeadsForUser } from "@/app/actions/overwatch";
import { SovereignCheckout } from "@/components/billing/SovereignCheckout";
import { PilotLiveFeed } from "@/components/vault/PilotLiveFeed";
import { VaultTable } from "@/components/vault/VaultTable";

export const dynamic = "force-dynamic";

export default async function VaultPage() {
  const { userId } = await auth();

  if (!userId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#030303] px-6">
        <div className="max-w-md text-center">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-slate-500">
            Sovereign vault
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">
            Command ledger locked
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Sign in with Clerk to load leads scoped strictly to your{" "}
            <code className="rounded bg-white/5 px-1 py-0.5 font-mono text-xs text-lime-200/90">
              userId
            </code>
            . No cross-tenant reads.
          </p>
        </div>
        <SignInButton mode="modal">
          <button
            type="button"
            className="rounded-md border border-lime-500/40 bg-lime-500/10 px-5 py-2.5 font-mono text-sm font-medium text-lime-100 hover:bg-lime-500/20"
          >
            Authenticate
          </button>
        </SignInButton>
        <Link
          href="/overwatch"
          className="font-mono text-xs text-slate-500 underline decoration-white/10 underline-offset-4 hover:text-slate-300"
        >
          ← Return to Overwatch
        </Link>
      </div>
    );
  }

  const leads = await listVaultLeadsForUser();
  const engagement = await getVaultEngagementMap(leads.map((l) => l.id));

  return (
    <div className="min-h-screen bg-[#030303] text-slate-100">
      <header className="border-b border-white/10 bg-black/40 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-slate-500">
              Phase 1 · Vault
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-white">
              Command ledger
            </h1>
            <p className="mt-1 max-w-xl text-xs text-slate-500">
              Ranked by vulnerability score (highest first). Score 5 rows pulse —
              immediate outreach window.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-slate-500">
              {leads.length} record{leads.length === 1 ? "" : "s"}
            </span>
            <Link
              href="/overwatch"
              className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-xs text-slate-200 hover:bg-white/10"
            >
              Overwatch
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8">
          <SovereignCheckout />
        </div>
        <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[1fr_minmax(280px,360px)] lg:items-start lg:gap-8">
          <div className="order-2 min-w-0 lg:order-1">
            <VaultTable leads={leads} engagement={engagement} />
          </div>
          <div className="order-1 lg:sticky lg:top-4 lg:order-2 lg:self-start">
            <PilotLiveFeed />
          </div>
        </div>
      </main>
    </div>
  );
}
