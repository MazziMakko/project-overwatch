"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MapPin,
  Radio,
  RefreshCw,
  ShieldAlert,
  Target,
  XSquare,
} from "lucide-react";
import type { PilotAuditDTO } from "@/app/actions/pilotAudits";
import { harvestLeads } from "@/app/actions/overwatch";
import {
  leadCityLabel,
  leadMapCategory,
  formatCoordinates,
} from "@/lib/overwatch/leadMapDisplay";
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

function categoryBadgeClass(lead: SovereignLeadHarvest): string {
  const c = leadMapCategory(lead);
  const by: Record<typeof c, string> = {
    shop: "border-amber-500/40 text-amber-400/90",
    amenity: "border-sky-500/40 text-sky-400/90",
    office: "border-violet-500/40 text-violet-400/90",
    other: "border-lime-500/40 text-lime-400/90",
  };
  return by[c];
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
    return "—";
  };

  return (
    <div className="overwatch-map-shell relative flex min-h-[60vh] w-full flex-1 flex-col overflow-hidden rounded-lg border border-zinc-800 bg-black font-mono shadow-2xl lg:min-h-[70vh]">
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-lime-500" />
          <span className="truncate text-xs font-bold uppercase tracking-widest text-lime-500">
            {"// Tactical Intel Feed"}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-[10px] text-zinc-500">
          {intelActive ? (
            <>
              <span className="hidden sm:inline" title="Scan centroid">
                {formatCoordinates(scan.lat, scan.lng)}
              </span>
              <span>
                Z{scan.zoom.toFixed(1)}
              </span>
            </>
          ) : (
            <span className="flex items-center gap-1 text-violet-400/90">
              <Radio className="h-3 w-3" />
              Pilot uplink
            </span>
          )}
        </div>
        <div className="ml-2 flex items-center gap-3 text-[10px]">
          <span className="text-zinc-500">
            {intelActive ? "TARGETS" : "PINGS"}:{" "}
            <span className="text-white">
              {intelActive ? leads.length : pilotAudits.length}
            </span>
          </span>
          {intelActive ? (
            <button
              type="button"
              onClick={() => void runHarvestRef.current()}
              className="flex items-center gap-1 rounded border border-zinc-700 px-2 py-1 text-zinc-400 transition-colors hover:border-lime-500/50 hover:text-lime-300"
              title="Re-scan current sector"
            >
              <RefreshCw className="h-3 w-3" />
              <span className="hidden sm:inline">SCAN</span>
            </button>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-black p-4 sm:p-6">
        {intelActive ? (
          !leads.length ? (
            <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-zinc-600">
              <Target className="mb-4 h-12 w-12 opacity-20" aria-hidden />
              <p className="animate-pulse text-sm">AWAITING DIRECTIVE…</p>
              <p className="mt-2 text-xs">OSM harvest idle — adjust search or rescan.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {leads.map((lead) => {
                const city = leadCityLabel(lead) ?? "Location unknown";
                const selected = selectedId === lead.id;
                return (
                  <div
                    key={lead.id}
                    className={`group relative flex flex-col justify-between rounded border p-3 transition-all sm:p-4 ${
                      selected
                        ? "border-lime-500 bg-lime-500/10"
                        : "border-zinc-800 bg-zinc-900/50 hover:border-lime-500/60 hover:bg-zinc-900"
                    }`}
                  >
                    <div>
                      <h3 className="mb-1 truncate text-sm font-bold text-white group-hover:text-lime-400">
                        {lead.name || "UNIDENTIFIED ENTITY"}
                      </h3>
                      <p className="mb-1 truncate text-[10px] uppercase tracking-wide text-zinc-500">
                        {lead.type}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-zinc-400">
                        <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                        <span className="truncate">{city}</span>
                      </div>
                      <p className="mt-1 font-mono text-[10px] text-zinc-600">
                        {formatCoordinates(lead.lat, lead.lng)}
                      </p>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800 pt-3">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="h-3 w-3 text-zinc-500" aria-hidden />
                        <span className="text-[10px] text-zinc-500">FRAGILITY</span>
                        <span
                          className={`rounded border px-1.5 py-0.5 text-[10px] font-bold text-white ${categoryBadgeClass(lead)}`}
                        >
                          {fragilityLabel(lead)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onSelect(lead)}
                        className="text-[10px] text-lime-600 transition-colors hover:text-lime-400"
                      >
                        [ ANALYZE ]
                      </button>
                    </div>
                  </div>
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

      {intelActive && leads.length > 0 ? (
        <div className="flex justify-end border-t border-zinc-800 bg-zinc-950 p-2">
          <button
            type="button"
            onClick={wipeFeed}
            className="flex items-center gap-2 px-4 py-2 text-xs text-red-500/80 transition-colors hover:text-red-400"
          >
            <XSquare className="h-4 w-4" aria-hidden />
            [ WIPE FEED ]
          </button>
        </div>
      ) : null}
    </div>
  );
}
