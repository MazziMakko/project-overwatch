"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Map, {
  Marker,
  NavigationControl,
  Popup,
  type MapRef,
} from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { PilotAuditDTO } from "@/app/actions/pilotAudits";
import { harvestLeads } from "@/app/actions/overwatch";
import {
  leadMapCategory,
  type LeadMapCategory,
} from "@/lib/overwatch/leadMapDisplay";
import { AuditHeatmapLayer } from "./AuditHeatmapLayer";
import { messageFromUnknown } from "@/lib/messageFromUnknown";
import {
  clampBoundsToHarvestArea,
  getMaxHarvestBboxAreaSqDeg,
} from "@/lib/overwatch/harvestBounds";
import type { SovereignLeadHarvest } from "@/lib/services/OverpassService";
import { LeadMapPopup } from "./LeadMapPopup";
import { MapBusinessLegend } from "./MapBusinessLegend";

const DEFAULT_STYLE =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

/** Default tactical viewport: Carneys Point, NJ — flat 2D (no pitch). */
const DEFAULT_INTEL_VIEW = {
  longitude: -75.4682,
  latitude: 39.7256,
  zoom: 13,
  pitch: 0,
  bearing: 0,
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
  /** Known vulnerability scores (1–5) by lead id — drives marker emphasis only (2D). */
  leadVulnerabilityById?: Record<string, number>;
  onBoundsBusy: (busy: boolean) => void;
  onHarvestError: (message: string | null) => void;
  focusRequest?: MapFocusRequest | null;
  onFocusApplied?: () => void;
};

function markerDotClass(
  category: LeadMapCategory,
  selected: boolean,
  hovered: boolean,
  vulnerabilityScore: number,
): string {
  const base =
    "rounded-full border shadow-[0_0_10px_rgba(0,0,0,0.5)] transition-transform duration-150 focus:outline focus:outline-2 focus:outline-lime-300";
  const size = selected ? "h-3.5 w-3.5" : hovered ? "h-3 w-3" : "h-2.5 w-2.5";
  const ring = selected ? "ring-2 ring-lime-200 ring-offset-1 ring-offset-black" : "";
  const scale = hovered && !selected ? "scale-125" : "";
  const pulse = vulnerabilityScore >= 5 ? "animate-pulse" : "";
  const byCat: Record<LeadMapCategory, string> = {
    shop: "border-amber-400/90 bg-amber-500/95 shadow-amber-400/50",
    amenity: "border-sky-400/90 bg-sky-500/95 shadow-sky-400/45",
    office: "border-violet-400/90 bg-violet-500/95 shadow-violet-400/45",
    other: "border-lime-400/85 bg-lime-500/90 shadow-lime-400/55",
  };
  return `${base} ${size} ${byCat[category]} ${ring} ${scale} ${pulse}`.trim();
}

export function OverwatchMap({
  maplibreToken,
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
  const mapRef = useRef<MapRef | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ready, setReady] = useState(false);
  const [leads, setLeads] = useState<SovereignLeadHarvest[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const intelActive = hudMode === "intel";

  const onLeadsRef = useRef(onLeads);
  const onBoundsBusyRef = useRef(onBoundsBusy);
  const onHarvestErrorRef = useRef(onHarvestError);
  const onSelectRef = useRef(onSelect);
  onLeadsRef.current = onLeads;
  onBoundsBusyRef.current = onBoundsBusy;
  onHarvestErrorRef.current = onHarvestError;
  onSelectRef.current = onSelect;

  const styleUrl = maplibreToken
    ? `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${encodeURIComponent(maplibreToken)}`
    : DEFAULT_STYLE;

  const cancelHoverClear = useCallback(() => {
    if (hoverClearRef.current) {
      clearTimeout(hoverClearRef.current);
      hoverClearRef.current = null;
    }
  }, []);

  const scheduleHoverClear = useCallback(() => {
    cancelHoverClear();
    hoverClearRef.current = setTimeout(() => {
      hoverClearRef.current = null;
      setHoveredId(null);
    }, 160);
  }, [cancelHoverClear]);

  const runHarvest = useCallback(async () => {
    if (!intelActive) return;
    const map = mapRef.current?.getMap();
    if (!map?.loaded()) return;
    const b = map.getBounds();
    const raw = {
      south: b.getSouth(),
      west: b.getWest(),
      north: b.getNorth(),
      east: b.getEast(),
    };
    const maxArea = getMaxHarvestBboxAreaSqDeg();
    const bounds = clampBoundsToHarvestArea(raw, maxArea);
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
  }, [intelActive]);

  const runHarvestRef = useRef(runHarvest);
  runHarvestRef.current = runHarvest;

  useEffect(() => {
    setReady(false);
    setLeads([]);
    setHoveredId(null);
    onHarvestErrorRef.current(null);
  }, [styleUrl]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      cancelHoverClear();
    };
  }, [cancelHoverClear]);

  useEffect(() => {
    const el = shellRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      mapRef.current?.getMap()?.resize();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let frame = 0;
    let id = 0;
    const tick = () => {
      mapRef.current?.getMap()?.resize();
      frame++;
      if (frame < 6) id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [hudMode]);

  const scheduleHarvest = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      void runHarvestRef.current();
    }, 800);
  }, []);

  const handleMapLoad = useCallback(() => {
    setReady(true);
    void runHarvestRef.current();
  }, []);

  const handleMapError = useCallback((e: { error?: unknown }) => {
    console.warn("[OverwatchMap]", messageFromUnknown(e.error));
  }, []);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !ready || !focusRequest) return;
    if (!map.loaded()) return;
    map.flyTo({
      center: [focusRequest.lng, focusRequest.lat],
      zoom: focusRequest.zoom ?? 17.5,
      pitch: 0,
      bearing: focusRequest.bearing ?? 0,
      essential: true,
      duration: focusRequest.duration ?? 1800,
    });
    onFocusApplied?.();
  }, [ready, focusRequest, onFocusApplied]);

  const hoveredLead = hoveredId
    ? leads.find((l) => l.id === hoveredId) ?? null
    : null;

  useEffect(() => {
    if (ready && intelActive) {
      void runHarvestRef.current();
    }
  }, [ready, intelActive]);

  return (
    <div
      ref={shellRef}
      className="overwatch-map-shell relative h-full w-full min-h-0 overflow-hidden rounded-lg border border-zinc-800 bg-black"
    >
      <div className="relative z-[1] h-full w-full min-h-0">
        <Map
          key={styleUrl}
          ref={mapRef}
          mapLib={maplibregl}
          mapStyle={styleUrl}
          initialViewState={{
            longitude: DEFAULT_INTEL_VIEW.longitude,
            latitude: DEFAULT_INTEL_VIEW.latitude,
            zoom: DEFAULT_INTEL_VIEW.zoom,
            pitch: 0,
            bearing: DEFAULT_INTEL_VIEW.bearing,
          }}
          style={{ width: "100%", height: "100%" }}
          reuseMaps
          trackResize
          onLoad={handleMapLoad}
          onMoveEnd={intelActive ? scheduleHarvest : undefined}
          onError={handleMapError}
        >
          <NavigationControl showCompass={false} position="top-left" />
          {intelActive ? null : <AuditHeatmapLayer audits={pilotAudits} />}
          {intelActive
            ? leads.map((lead) => {
                const cat = leadMapCategory(lead);
                const selected = selectedId === lead.id;
                const hovered = hoveredId === lead.id;
                const vuln = leadVulnerabilityById[lead.id] ?? 1;
                return (
                  <Marker
                    key={lead.id}
                    longitude={lead.lng}
                    latitude={lead.lat}
                    anchor="center"
                    onClick={(e) => {
                      e.originalEvent?.stopPropagation();
                      onSelectRef.current(lead);
                    }}
                  >
                    <button
                      type="button"
                      className={markerDotClass(cat, selected, hovered, vuln)}
                      aria-label={lead.name}
                      onMouseEnter={() => {
                        cancelHoverClear();
                        setHoveredId(lead.id);
                      }}
                      onMouseLeave={() => {
                        scheduleHoverClear();
                      }}
                    />
                  </Marker>
                );
              })
            : null}
          {intelActive && hoveredLead ? (
            <Popup
              longitude={hoveredLead.lng}
              latitude={hoveredLead.lat}
              anchor="bottom"
              offset={12}
              closeButton={false}
              closeOnClick={false}
              maxWidth="320px"
            >
              <div
                onMouseEnter={cancelHoverClear}
                onMouseLeave={scheduleHoverClear}
              >
                <LeadMapPopup lead={hoveredLead} />
              </div>
            </Popup>
          ) : null}
        </Map>
      </div>
      {intelActive ? (
        <MapBusinessLegend />
      ) : (
        <div className="pointer-events-none absolute bottom-3 right-3 z-[2] max-w-[200px] rounded-lg border border-lime-500/20 bg-black/70 px-3 py-2 font-mono text-[9px] uppercase tracking-wide text-slate-400 backdrop-blur-md">
          <p className="mb-1 text-[10px] font-semibold text-lime-300/90">
            Temporal pulse
          </p>
          <p className="normal-case leading-snug tracking-normal text-slate-500">
            Lime = fresh (≤1h). Grey = older trail. Vault{" "}
            <code className="text-lime-600/90">businessId</code> must match
            auditor route.
          </p>
        </div>
      )}
    </div>
  );
}
