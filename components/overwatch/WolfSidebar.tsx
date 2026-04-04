"use client";

import { useUser } from "@clerk/nextjs";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import {
  Circle,
  Loader2,
  MapPin,
  MessageSquare,
  Radar,
  Save,
  Send,
  Shield,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  centroidOfLeads,
  leadCityLabel,
} from "@/lib/overwatch/leadMapDisplay";
import type {
  AnalyzeVulnerabilityResult,
  StrategistMessage,
} from "@/app/actions/overwatch";
import type { NominatimSearchHit } from "@/app/actions/nominatimSearch";
import type { SovereignLeadHarvest } from "@/lib/services/OverpassService";
import { OverwatchSearchBar } from "./OverwatchSearchBar";
import type { HudMode } from "./OverwatchMap";

export type IntelFeedItem = {
  id: string;
  title: string;
  subtitle: string;
  body: string;
  score: number;
};

type WolfSidebarProps = {
  leads: SovereignLeadHarvest[];
  hudMode: HudMode;
  onSelectLead: (lead: SovereignLeadHarvest) => void;
  onCityFocus: (lat: number, lng: number) => void;
  selected: SovereignLeadHarvest | null;
  analysis: AnalyzeVulnerabilityResult | null;
  analyzing: boolean;
  harvestError: string | null;
  harvesting: boolean;
  feed: IntelFeedItem[];
  onSaveVault: () => void;
  saving: boolean;
  saveMessage: string | null;
  strategistMessages: StrategistMessage[];
  strategistSending: boolean;
  strategistError: string | null;
  onDismissStrategistError: () => void;
  onStrategistSend: (text: string) => void;
  vaultLinked: boolean;
  onSearchNavigate: (hit: NominatimSearchHit) => void;
};

export function WolfSidebar({
  leads,
  hudMode,
  onSelectLead,
  onCityFocus,
  selected,
  analysis,
  analyzing,
  harvestError,
  harvesting,
  feed,
  onSaveVault,
  saving,
  saveMessage,
  strategistMessages,
  strategistSending,
  strategistError,
  onDismissStrategistError,
  onStrategistSend,
  vaultLinked,
  onSearchNavigate,
}: WolfSidebarProps) {
  const { isSignedIn } = useUser();
  const [draft, setDraft] = useState("");

  const leadsByCity = useMemo(() => {
    const m = new Map<string, SovereignLeadHarvest[]>();
    for (const lead of leads) {
      const city = leadCityLabel(lead) ?? "Unspecified area";
      const list = m.get(city);
      if (list) list.push(lead);
      else m.set(city, [lead]);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [leads]);

  return (
    <aside
      className="flex h-[min(44dvh,560px)] min-h-[240px] w-full shrink-0 flex-col border-t border-slate-800 bg-slate-950/40 backdrop-blur-xl sm:h-[min(42dvh,540px)]"
      aria-label="Wolf Hunter intelligence"
    >
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-white/10 px-4 py-3 sm:flex-nowrap">
        <div className="flex min-w-0 shrink-0 items-center gap-2">
          <Radar className="size-5 text-lime-400" aria-hidden />
          <div>
            <p className="text-sm font-medium tracking-tight text-white">
              Intelligence Feed
            </p>
            <p className="text-xs text-slate-500">
              {hudMode === "pilot"
                ? "Pilot uplink · vault-scoped audits"
                : harvesting
                  ? "Harvesting OSM…"
                  : `${leads.length} leads in view`}
            </p>
          </div>
        </div>
        <div className="flex min-w-0 w-full flex-[1_1_200px] items-center gap-2 sm:w-auto">
          <div className="min-w-0 flex-1 sm:max-w-md">
            <OverwatchSearchBar onNavigate={onSearchNavigate} />
          </div>
          <div
            className="flex shrink-0 items-center gap-1.5"
            role="toolbar"
            aria-label="Quick actions"
          >
            {[1, 2, 3].map((slot) => (
              <button
                key={slot}
                type="button"
                className="flex size-8 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-slate-500 shadow-sm hover:border-lime-500/25 hover:bg-white/[0.09] hover:text-slate-300"
                aria-label={`Quick action ${slot} (placeholder)`}
                title="Placeholder"
              >
                <Circle className="size-3 opacity-50" strokeWidth={1.5} aria-hidden />
              </button>
            ))}
          </div>
        </div>
        {isSignedIn ? (
          <Link
            href="/vault"
            className="ml-auto shrink-0 rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-slate-300 hover:bg-white/10 sm:ml-0"
          >
            Vault
          </Link>
        ) : null}
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain px-4 py-3">
        {hudMode === "pilot" ? (
          <p className="mb-4 rounded border border-lime-500/20 bg-lime-500/5 px-3 py-2 text-[11px] leading-relaxed text-lime-100/85">
            <span className="font-mono text-[10px] uppercase tracking-wide text-lime-400/90">
              Pilot mode
            </span>
            <br />
            B2B harvest is paused. Map shows AuraMesh audits for vault sites. Use
            auditor at{" "}
            <code className="text-lime-300/90">/auditor/{"{vaultLeadId}"}</code>{" "}
            so <code className="text-lime-300/90">businessId</code> matches.
          </p>
        ) : null}
        {harvestError ? (
          <p className="mb-4 rounded border border-red-500/30 bg-red-950/40 px-3 py-2 text-xs text-red-200">
            {harvestError}
          </p>
        ) : null}

        {hudMode === "intel" && leads.length > 0 ? (
          <section className="mb-6">
            <h2 className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <MapPin className="size-3.5" aria-hidden />
              Areas & targets
            </h2>
            <p className="mb-3 text-[11px] leading-relaxed text-slate-500">
              Open an <span className="text-slate-400">area</span> for a pitched
              street-level view of every business in frame, or a{" "}
              <span className="text-slate-400">single target</span> for full
              analysis.
            </p>
            <div className="space-y-2 pr-1">
              {leadsByCity.map(([city, cityLeads]) => {
                const c = centroidOfLeads(cityLeads);
                return (
                  <div
                    key={city}
                    className="rounded-lg border border-white/10 bg-black/25"
                  >
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-2 border-b border-white/5 px-2.5 py-2 text-left hover:bg-white/[0.04]"
                      onClick={() => {
                        if (c) onCityFocus(c.lat, c.lng);
                      }}
                      disabled={!c}
                    >
                      <span className="font-medium text-slate-200">{city}</span>
                      <span className="shrink-0 font-mono text-[10px] text-slate-500">
                        {cityLeads.length} · fly to
                      </span>
                    </button>
                    <ul className="divide-y divide-white/5">
                      {cityLeads.map((lead) => (
                        <li key={lead.id}>
                          <button
                            type="button"
                            className={`w-full px-2.5 py-1.5 text-left text-xs hover:bg-white/[0.06] ${
                              selected?.id === lead.id
                                ? "bg-lime-500/10 text-lime-100"
                                : "text-slate-300"
                            }`}
                            onClick={() => onSelectLead(lead)}
                          >
                            <span className="font-medium">{lead.name}</span>
                            <span className="ml-2 font-mono text-[10px] text-slate-500">
                              {lead.type}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="mb-6">
          <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <Shield className="size-3.5" aria-hidden />
            Active target
          </h2>
          {!selected ? (
            <p className="text-sm text-slate-500">Select a map marker.</p>
          ) : (
            <div className="rounded-lg border border-white/10 bg-black/30 p-3">
              <p className="font-medium text-white">{selected.name}</p>
              <p className="font-mono text-xs text-slate-400">{selected.type}</p>
              <dl className="mt-2 space-y-1 font-mono text-[11px] text-slate-300">
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">lat</dt>
                  <dd className="select-all">{selected.lat.toFixed(6)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">lng</dt>
                  <dd className="select-all">{selected.lng.toFixed(6)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">web</dt>
                  <dd className="truncate">{selected.website ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">phone</dt>
                  <dd>{selected.phone ?? "—"}</dd>
                </div>
              </dl>

              {analyzing ? (
                <p className="mt-3 flex items-center gap-2 text-xs text-lime-300/90">
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  Running analyst…
                </p>
              ) : analysis ? (
                <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                  <p className="font-mono text-xs text-lime-300">
                    Vulnerability{" "}
                    <span className="text-lg font-semibold text-white">
                      {analysis.vulnerabilityScore}
                    </span>
                    <span className="text-slate-500">/5</span>
                  </p>
                  {analysis.rationale ? (
                    <p className="text-xs text-slate-500">{analysis.rationale}</p>
                  ) : null}
                  {isSignedIn ? (
                    <button
                      type="button"
                      onClick={onSaveVault}
                      disabled={saving}
                      className="mt-2 inline-flex items-center gap-2 rounded-md border border-lime-500/40 bg-lime-500/10 px-3 py-1.5 text-xs font-medium text-lime-100 hover:bg-lime-500/20 disabled:opacity-50"
                    >
                      <Save className="size-3.5" aria-hidden />
                      {saving ? "Saving…" : "Save to vault"}
                    </button>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">
                      Sign in to save this lead to your vault (IDOR-safe).
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </section>

        <section className="mb-6">
          <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <MessageSquare className="size-3.5" aria-hidden />
            Strategist uplink
            {vaultLinked ? (
              <span className="rounded border border-lime-500/35 bg-lime-500/10 px-1.5 py-0.5 font-mono text-[9px] font-normal uppercase tracking-wide text-lime-200/90">
                Vault sync
              </span>
            ) : null}
          </h2>
          {strategistError ? (
            <div className="mb-3 flex items-start justify-between gap-2 rounded border border-amber-500/35 bg-amber-950/40 px-3 py-2 text-xs text-amber-100">
              <span>{strategistError}</span>
              <button
                type="button"
                onClick={onDismissStrategistError}
                className="shrink-0 rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-slate-300 hover:bg-white/10"
              >
                Dismiss
              </button>
            </div>
          ) : null}
          {!selected ? (
            <p className="text-sm text-slate-500">
              Select a target to open the AuraMesh pitch thread.
            </p>
          ) : analyzing && strategistMessages.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/25 px-3 py-4 text-xs text-slate-400">
              <Loader2 className="size-4 shrink-0 animate-spin text-lime-400" aria-hidden />
              Generating vulnerability pitch…
            </div>
          ) : (
            <div className="flex flex-col rounded-lg border border-white/10 bg-black/35">
              <div className="max-h-[220px] min-h-[120px] space-y-2 overflow-y-auto p-3">
                <AnimatePresence initial={false}>
                  {strategistMessages.map((m, i) => (
                    <motion.div
                      key={`${i}-${m.role}-${m.content.slice(0, 24)}`}
                      initial={{ opacity: 0, x: m.role === "user" ? 12 : -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 28,
                      }}
                      className={`rounded-md px-2.5 py-2 text-sm leading-relaxed ${
                        m.role === "user"
                          ? "ml-4 border border-white/10 bg-white/[0.06] text-slate-200"
                          : "mr-2 border border-lime-500/20 bg-lime-500/[0.07] text-slate-100"
                      }`}
                    >
                      <span className="mb-0.5 block font-mono text-[9px] uppercase tracking-wider text-slate-500">
                        {m.role === "user" ? "You" : "Strategist"}
                      </span>
                      {m.content}
                    </motion.div>
                  ))}
                </AnimatePresence>
                {strategistSending ? (
                  <p className="flex items-center gap-2 px-1 font-mono text-[10px] text-slate-500">
                    <Loader2 className="size-3 animate-spin" aria-hidden />
                    Thinking…
                  </p>
                ) : null}
              </div>
              <form
                className="flex gap-2 border-t border-white/10 p-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const t = draft.trim();
                  if (!t || strategistSending || analyzing) return;
                  onStrategistSend(t);
                  setDraft("");
                }}
              >
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Refine hook, tone, or channel…"
                  disabled={!analysis || strategistSending || analyzing}
                  className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/40 px-2 py-1.5 font-mono text-xs text-slate-100 placeholder:text-slate-600 focus:border-lime-500/40 focus:outline-none disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!analysis || strategistSending || analyzing || !draft.trim()}
                  className="inline-flex shrink-0 items-center justify-center rounded-md border border-lime-500/35 bg-lime-500/15 p-2 text-lime-100 hover:bg-lime-500/25 disabled:opacity-40"
                  aria-label="Send to strategist"
                >
                  <Send className="size-4" />
                </button>
              </form>
            </div>
          )}
        </section>

        {saveMessage ? (
          <p className="mb-4 text-xs text-lime-200/90">{saveMessage}</p>
        ) : null}
        </div>

        <div className="flex min-h-[100px] flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-y-contain border-t border-white/10 px-4 py-3">
          <section className="min-h-0">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Stream
            </h2>
            <ul className="space-y-2 pb-2">
              <AnimatePresence initial={false}>
                {feed.map((item) => (
                  <motion.li
                    key={item.id}
                    initial={{ x: 48, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ opacity: 0, x: 24 }}
                    transition={{
                      type: "spring",
                      stiffness: 420,
                      damping: 28,
                      mass: 0.85,
                    }}
                    className="rounded-lg border border-white/10 bg-black/25 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-white">
                        {item.title}
                      </p>
                      <span className="font-mono text-xs text-lime-300">
                        {item.score}/5
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{item.subtitle}</p>
                    <p className="mt-2 text-xs leading-relaxed text-slate-300">
                      {item.body}
                    </p>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </section>
        </div>
      </div>
    </aside>
  );
}
