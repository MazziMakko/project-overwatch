"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  Building2,
  Crosshair,
  MapPin,
  Radio,
  RefreshCw,
  Target,
  XSquare,
} from "lucide-react";
import type { PilotAuditDTO } from "@/app/actions/pilotAudits";
import { harvestCorporateIntel } from "@/app/actions/overwatch";
import {
  b2bCeoName,
  b2bEmail,
  b2bLocationLabel,
} from "@/lib/overwatch/corporateIntel";
import { messageFromUnknown } from "@/lib/messageFromUnknown";
import type { SovereignLeadHarvest } from "@/lib/services/OverpassService";

const DEFAULT_DIRECTIVE = "b2b software";

/** Focus sync from sidebar / vault — search directive only (no geospatial fields). */
export type MapFocusRequest = {
  query: string;
};

export type HudMode = "intel" | "pilot";

type OverwatchMapProps = {
  maplibreToken?: string | null;
  hudMode: HudMode;
  pilotAudits: PilotAuditDTO[];
  onLeads: (leads: SovereignLeadHarvest[]) => void;
  onSelect: (lead: SovereignLeadHarvest | null) => void;
  selectedId: string | null;
  leadVulnerabilityById?: Record<string, number>;
  onBoundsBusy: (busy: boolean) => void;
  onHarvestError: (message: string | null) => void;
  focusRequest?: MapFocusRequest | null;
  onFocusApplied?: () => void;
};

export function OverwatchMap({
  maplibreToken: _maplibreToken,
  hudMode,
  pilotAudits,
  onLeads,
  onSelect,
  selectedId,
  leadVulnerabilityById = {},
  onBoundsBusy,
  onHarvestError,
  focusRequest,
  onFocusApplied,
}: OverwatchMapProps) {
  const [leads, setLeads] = useState<SovereignLeadHarvest[]>([]);
  const [directive, setDirective] = useState(DEFAULT_DIRECTIVE);

  const onLeadsRef = useRef(onLeads);
  const onBoundsBusyRef = useRef(onBoundsBusy);
  const onHarvestErrorRef = useRef(onHarvestError);
  onLeadsRef.current = onLeads;
  onBoundsBusyRef.current = onBoundsBusy;
  onHarvestErrorRef.current = onHarvestError;

  const intelActive = hudMode === "intel";

  const harvestQuery = useCallback(
    async (qRaw: string) => {
      if (!intelActive) return;
      const q = qRaw.trim();
      if (!q) {
        onHarvestErrorRef.current("Enter a search directive.");
        return;
      }
      onBoundsBusyRef.current(true);
      onHarvestErrorRef.current(null);
      try {
        const next = await harvestCorporateIntel({ query: q });
        setLeads(next);
        onLeadsRef.current(next);
      } catch (e) {
        onHarvestErrorRef.current(messageFromUnknown(e));
      } finally {
        onBoundsBusyRef.current(false);
      }
    },
    [intelActive],
  );

  const runHarvest = useCallback(() => {
    void harvestQuery(directive);
  }, [harvestQuery, directive]);

  const runHarvestRef = useRef(runHarvest);
  runHarvestRef.current = runHarvest;

  useEffect(() => {
    if (!focusRequest?.query?.trim()) return;
    const q = focusRequest.query.trim();
    setDirective(q);
    onFocusApplied?.();
    void harvestQuery(q);
  }, [focusRequest, onFocusApplied, harvestQuery]);

  useEffect(() => {
    if (!intelActive) {
      setLeads([]);
      onLeadsRef.current([]);
      return;
    }
    void harvestQuery(directive);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only remount / mode switch; directive changes use SCAN
  }, [intelActive]);

  const wipeFeed = useCallback(() => {
    setLeads([]);
    onLeads([]);
    onSelect(null);
  }, [onLeads, onSelect]);

  const fragilityLabel = (lead: SovereignLeadHarvest) => {
    const v = leadVulnerabilityById[lead.id];
    if (typeof v === "number" && v >= 1 && v <= 5) return `${v}/5`;
    return null;
  };

  return (
    <div className="overwatch-map-shell relative flex min-h-[60vh] w-full flex-1 flex-col overflow-hidden rounded-lg border border-zinc-800 bg-black font-mono shadow-2xl lg:min-h-[70vh]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-950/80 px-4 py-3 backdrop-blur-md sm:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-lime-500 shadow-[0_0_8px_#84cc16]" />
          <span className="truncate text-xs font-bold uppercase tracking-widest text-lime-500">
            Ghost-Ops // Active Stream
          </span>
        </div>
        <div className="flex w-full min-w-0 flex-[1_1_220px] items-center gap-2 sm:w-auto sm:max-w-xl">
          <label className="sr-only" htmlFor="overwatch-directive">
            B2B search directive
          </label>
          <input
            id="overwatch-directive"
            type="text"
            value={directive}
            onChange={(e) => setDirective(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void runHarvestRef.current();
            }}
            className="min-w-0 flex-1 rounded border border-zinc-800 bg-black px-2 py-1.5 font-mono text-[11px] text-lime-100 placeholder:text-zinc-600 focus:border-lime-500/50 focus:outline-none focus:ring-1 focus:ring-lime-500/30"
            placeholder="Directive (Apollo q_keywords)…"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3 sm:gap-4">
          {intelActive ? (
            <span
              className="hidden max-w-[140px] truncate font-mono text-[10px] text-zinc-500 lg:inline"
              title="Active directive"
            >
              {directive.trim() || "—"}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] text-violet-400/90">
              <Radio className="h-3 w-3 shrink-0" aria-hidden />
              Pilot uplink
            </span>
          )}
          <span className="text-xs text-zinc-500">
            {intelActive ? "TARGETS" : "PINGS"}:{" "}
            <span className="font-bold text-white">
              {intelActive ? leads.length : pilotAudits.length}
            </span>
          </span>
          {intelActive ? (
            <>
              <button
                type="button"
                onClick={() => void runHarvestRef.current()}
                className="flex items-center gap-1.5 rounded border border-zinc-700/80 px-2 py-1 text-xs text-zinc-400 transition-colors hover:border-lime-500/50 hover:text-lime-300"
                title="Run B2B harvest for current directive"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                <span className="hidden sm:inline">SCAN</span>
              </button>
              {leads.length > 0 ? (
                <button
                  type="button"
                  onClick={wipeFeed}
                  className="flex items-center gap-1.5 text-xs text-red-500/80 transition-colors hover:text-red-400"
                >
                  <XSquare className="h-4 w-4" aria-hidden />
                  [ WIPE ]
                </button>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-black p-4 md:p-6">
        {intelActive ? (
          !leads.length ? (
            <div className="flex h-full min-h-[220px] flex-col items-center justify-center text-zinc-600">
              <Target className="mb-4 h-16 w-16 opacity-20" aria-hidden />
              <p className="animate-pulse text-sm tracking-widest">
                AWAITING DIRECTIVE
              </p>
              <p className="mt-2 text-center text-xs text-zinc-500">
                ENTER A B2B KEYWORD SECTOR — APOLLO PEOPLE SEARCH (SERVER-SIDE)
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {leads.map((lead) => {
                const loc = b2bLocationLabel(lead) ?? "Location unknown";
                const exec = b2bCeoName(lead);
                const mail = b2bEmail(lead);
                const selected = selectedId === lead.id;
                const frag = fragilityLabel(lead);
                return (
                  <button
                    key={lead.id}
                    type="button"
                    onClick={() => onSelect(lead)}
                    className={`group relative flex w-full cursor-pointer flex-col justify-between overflow-hidden rounded-md border p-5 text-left transition-all hover:-translate-y-1 hover:border-lime-500/50 hover:bg-zinc-900 hover:shadow-[0_4px_20px_-4px_rgba(132,204,22,0.15)] focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-500/60 ${
                      selected
                        ? "border-lime-500 bg-lime-500/10 shadow-[0_4px_24px_-4px_rgba(132,204,22,0.2)]"
                        : "border-zinc-800 bg-zinc-900/40"
                    }`}
                  >
                    <div>
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded border border-zinc-800 bg-zinc-950 transition-colors group-hover:border-lime-500/30 ${
                            selected ? "border-lime-500/40" : ""
                          }`}
                        >
                          <Building2 className="h-4 w-4 text-zinc-400 transition-colors group-hover:text-lime-400" />
                        </div>
                        <div className="flex min-w-0 items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-950 px-2 py-1">
                          <Activity className="h-3 w-3 shrink-0 text-lime-500" aria-hidden />
                          <span className="text-[10px] font-bold text-zinc-300">
                            {frag ?? "N/A"}
                          </span>
                        </div>
                      </div>

                      <h3 className="mb-1 truncate text-base font-bold text-zinc-100 transition-colors group-hover:text-lime-400">
                        {lead.name || "UNIDENTIFIED ENTITY"}
                      </h3>
                      {exec ? (
                        <p className="mb-1 truncate text-xs text-zinc-400">{exec}</p>
                      ) : null}
                      <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                        <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                        <span className="truncate">{loc}</span>
                      </div>
                      {mail ? (
                        <p className="mt-2 truncate font-mono text-[10px] text-zinc-500">
                          {mail}
                        </p>
                      ) : (
                        <p className="mt-2 text-[10px] text-zinc-600">
                          Email gated — enrich in Apollo when available
                        </p>
                      )}
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-zinc-800/80 pt-3">
                      <div className="min-w-0 truncate text-[10px] uppercase tracking-wider text-zinc-500">
                        {lead.type || "General"}
                      </div>
                      <div className="flex shrink-0 items-center gap-1 text-xs font-bold text-lime-600 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                        ANALYZE <Crosshair className="h-3 w-3" aria-hidden />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )
        ) : pilotAudits.length === 0 ? (
          <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-zinc-600">
            <Radio className="mb-4 h-12 w-12 opacity-20" aria-hidden />
            <p className="text-sm">No pilot pings for linked vault leads.</p>
            <p className="mt-2 max-w-md text-center text-xs text-zinc-500">
              Temporal trail appears when AuraMesh audits sync. Match{" "}
              <code className="text-lime-600/90">businessId</code> to auditor routes.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {pilotAudits.map((a) => (
              <div
                key={a.id}
                className="flex flex-col gap-1 rounded border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-[11px] text-zinc-300 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <span className="font-mono text-lime-500/90">
                    {a.cryptoHash.slice(0, 10)}…
                  </span>
                  <span className="ml-2 text-zinc-500">
                    biz {a.businessId.slice(0, 8)}…
                  </span>
                </div>
                <div className="shrink-0 font-mono text-[10px] text-zinc-500">
                  {new Date(a.capturedAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
