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
import { harvestLeads } from "@/app/actions/overwatch";
import { leadCityLabel, formatCoordinates } from "@/lib/overwatch/leadMapDisplay";
import {
  clampBoundsToHarvestArea,
  getMaxHarvestBboxAreaSqDeg,
  type MapBounds,
} from "@/lib/overwatch/harvestBounds";
import { messageFromUnknown } from "@/lib/messageFromUnknown";
import type { SovereignLeadHarvest } from "@/lib/services/OverpassService";

/** Default tactical viewport: Carneys Point, NJ — harvest bbox derived from center + zoom. */
const DEFAULT_INTEL_VIEW = {
  longitude: -75.4682,
  latitude: 39.7256,
  zoom: 13,
} as const;

export type MapFocusRequest = {
  lng: number;
  lat: number;
  zoom?: number;
  pitch?: number;
  bearing?: number;
  duration?: number;
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

function harvestBoundsFromCenterZoom(
  lat: number,
  lng: number,
  zoom: number,
): MapBounds {
  const z = Math.max(0, Math.min(22, zoom));
  const baseSpan = 0.085;
  const span = baseSpan * Math.pow(2, 13 - z);
  const half = Math.max(span / 2, 0.0015);
  const raw: MapBounds = {
    south: lat - half,
    north: lat + half,
    west: lng - half,
    east: lng + half,
  };
  return clampBoundsToHarvestArea(raw, getMaxHarvestBboxAreaSqDeg());
}

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
  const [scan, setScan] = useState<{
    lat: number;
    lng: number;
    zoom: number;
  }>({
    lat: DEFAULT_INTEL_VIEW.latitude,
    lng: DEFAULT_INTEL_VIEW.longitude,
    zoom: DEFAULT_INTEL_VIEW.zoom,
  });

  const onLeadsRef = useRef(onLeads);
  const onBoundsBusyRef = useRef(onBoundsBusy);
  const onHarvestErrorRef = useRef(onHarvestError);
  onLeadsRef.current = onLeads;
  onBoundsBusyRef.current = onBoundsBusy;
  onHarvestErrorRef.current = onHarvestError;

  const intelActive = hudMode === "intel";

  const runHarvest = useCallback(async () => {
    if (!intelActive) return;
    const bounds = harvestBoundsFromCenterZoom(scan.lat, scan.lng, scan.zoom);
    onBoundsBusyRef.current(true);
    onHarvestErrorRef.current(null);
    try {
      const next = await harvestLeads(bounds);
      setLeads(next);
      onLeadsRef.current(next);
    } catch (e) {
      onHarvestErrorRef.current(messageFromUnknown(e));
    } finally {
      onBoundsBusyRef.current(false);
    }
  }, [intelActive, scan.lat, scan.lng, scan.zoom]);

  const runHarvestRef = useRef(runHarvest);
  runHarvestRef.current = runHarvest;

  useEffect(() => {
    if (!focusRequest) return;
    setScan({
      lat: focusRequest.lat,
      lng: focusRequest.lng,
      zoom: focusRequest.zoom ?? 14.5,
    });
    onFocusApplied?.();
  }, [focusRequest, onFocusApplied]);

  useEffect(() => {
    if (!intelActive) {
      setLeads([]);
      onLeadsRef.current([]);
      return;
    }
    void runHarvestRef.current();
  }, [intelActive, scan.lat, scan.lng, scan.zoom]);

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
      {/* HEADER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-950/80 px-4 py-3 backdrop-blur-md sm:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-lime-500 shadow-[0_0_8px_#84cc16]" />
          <span className="truncate text-xs font-bold uppercase tracking-widest text-lime-500">
            Ghost-Ops // Active Stream
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3 sm:gap-4">
          {intelActive ? (
            <span
              className="hidden font-mono text-[10px] text-zinc-500 md:inline"
              title="Scan centroid"
            >
              {formatCoordinates(scan.lat, scan.lng)} · Z{scan.zoom.toFixed(1)}
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
                title="Re-scan current sector"
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
              <p className="mt-2 text-xs text-zinc-500">
                ENTER TARGET PARAMETERS TO COMMENCE SCAN
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {leads.map((lead) => {
                const city = leadCityLabel(lead) ?? "Location Unknown";
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
                      <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                        <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                        <span className="truncate">{city}</span>
                      </div>
                      <p className="mt-2 font-mono text-[10px] text-zinc-600">
                        {formatCoordinates(lead.lat, lead.lng)}
                      </p>
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
                <div className="font-mono text-[10px] text-zinc-600">
                  {formatCoordinates(a.latitude, a.longitude)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
