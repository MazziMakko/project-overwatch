"use client";

import type { SovereignLead } from "@prisma/client";
import Link from "next/link";
import { useState } from "react";
import type { LeadEngagement } from "@/app/actions/proposalAnalytics";
import { MetadataPanel } from "@/components/vault/MetadataPanel";
import { VaultRowActions } from "@/components/vault/VaultRowActions";

type VaultTableProps = {
  leads: SovereignLead[];
  engagement: Record<string, LeadEngagement>;
};

function formatWhen(d: Date) {
  return d.toISOString().slice(0, 16).replace("T", " ");
}

function formatLastSeen(iso: string | null) {
  if (!iso) return "—";
  return iso.slice(0, 16).replace("T", " ");
}

export function VaultTable({ leads, engagement }: VaultTableProps) {
  const [briefingLeadId, setBriefingLeadId] = useState<string | null>(null);

  if (leads.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-black/40 p-8 text-center font-mono text-sm text-slate-500">
        No leads in the vault yet. Harvest on{" "}
        <Link
          href="/overwatch"
          className="text-lime-400 underline decoration-lime-500/40 underline-offset-2 hover:text-lime-300"
        >
          /overwatch
        </Link>{" "}
        and save high-value targets.
      </div>
    );
  }

  return (
    <>
    <div className="overflow-x-auto rounded-lg border border-white/10 bg-black/30">
      <table className="w-full min-w-[1080px] border-collapse font-mono text-[12px] text-slate-200">
        <thead>
          <tr className="border-b border-white/10 bg-black/50 text-left text-[11px] uppercase tracking-wider text-slate-500">
            <th className="px-3 py-2 font-medium">Score</th>
            <th className="px-3 py-2 font-medium">Name</th>
            <th className="px-3 py-2 font-medium">Type</th>
            <th className="px-3 py-2 font-medium">Phone</th>
            <th className="px-3 py-2 font-medium">Web</th>
            <th className="px-3 py-2 font-medium">Coords</th>
            <th className="px-3 py-2 font-medium">Captured</th>
            <th className="px-3 py-2 font-medium">Engagement</th>
            <th className="px-3 py-2 text-right font-medium">Strike</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((row) => {
            const priority = row.vulnerabilityScore >= 5;
            const eng = engagement[row.id] ?? {
              totalViews: 0,
              lastSeen: null,
              live: false,
            };
            return (
              <tr
                key={row.id}
                className={`border-b border-white/[0.06] transition-colors hover:bg-white/[0.03] ${
                  priority
                    ? "vault-row-priority border-red-500/40 bg-red-950/15"
                    : ""
                }`}
              >
                <td className="px-3 py-2 tabular-nums text-lime-300">
                  {row.vulnerabilityScore}
                  {priority ? (
                    <span className="ml-1.5 text-[10px] font-normal uppercase tracking-wide text-red-300/90">
                      hot
                    </span>
                  ) : null}
                </td>
                <td className="max-w-[200px] truncate px-3 py-2 text-slate-100">
                  {row.name}
                </td>
                <td className="max-w-[160px] truncate px-3 py-2 text-slate-400">
                  {row.type}
                </td>
                <td className="max-w-[120px] truncate px-3 py-2 text-slate-300">
                  {row.phone ?? "—"}
                </td>
                <td className="max-w-[140px] truncate px-3 py-2 text-slate-400">
                  {row.website ?? "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-slate-500">
                  {row.lat.toFixed(4)}, {row.lng.toFixed(4)}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-slate-500">
                  {formatWhen(row.createdAt)}
                </td>
                <td className="px-3 py-2 align-top">
                  <div className="flex flex-col gap-1.5">
                    {eng.live ? (
                      <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-500/45 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)]">
                        <span
                          className="size-1.5 animate-pulse rounded-full bg-emerald-400"
                          aria-hidden
                        />
                        Live
                      </span>
                    ) : null}
                    <span className="text-slate-300">
                      <span className="tabular-nums text-lime-300/90">
                        {eng.totalViews}
                      </span>{" "}
                      <span className="text-slate-500">views</span>
                    </span>
                    <span className="text-[10px] leading-tight text-slate-500">
                      Last seen{" "}
                      {eng.lastSeen ? (
                        <time dateTime={eng.lastSeen}>
                          {formatLastSeen(eng.lastSeen)}
                        </time>
                      ) : (
                        "—"
                      )}
                    </span>
                  </div>
                </td>
                <td className="px-2 py-2 align-middle">
                  <VaultRowActions
                    vaultId={row.id}
                    lat={row.lat}
                    lng={row.lng}
                    strategistThread={row.strategistThread}
                    onOpenBriefing={() => setBriefingLeadId(row.id)}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    <MetadataPanel
      leadId={briefingLeadId}
      onClose={() => setBriefingLeadId(null)}
    />
    </>
  );
}
