"use client";

import { useMemo } from "react";
import { Layer, Source } from "react-map-gl/maplibre";
import type { PilotAuditDTO } from "@/app/actions/pilotAudits";
import { auditTemporalFreshness } from "@/lib/pilot/auditFreshness";

type AuditHeatmapLayerProps = {
  audits: PilotAuditDTO[];
};

/**
 * Temporal pulse: GeoJSON circle layer — lime when fresh (≤1h), fading to slate.
 */
export function AuditHeatmapLayer({ audits }: AuditHeatmapLayerProps) {
  const data = useMemo(() => {
    const features = audits.map((a) => ({
      type: "Feature" as const,
      id: a.id,
      geometry: {
        type: "Point" as const,
        coordinates: [a.longitude, a.latitude] as [number, number],
      },
      properties: {
        freshness: auditTemporalFreshness(a.capturedAt),
        hash: a.cryptoHash.slice(0, 10),
      },
    }));
    return {
      type: "FeatureCollection" as const,
      features,
    };
  }, [audits]);

  if (audits.length === 0) return null;

  return (
    <Source id="pilot-audit-pulse" type="geojson" data={data}>
      <Layer
        id="pilot-audit-pulse-glow"
        type="circle"
        paint={{
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["get", "freshness"],
            0,
            4,
            1,
            14,
          ],
          "circle-color": "#84cc16",
          "circle-opacity": [
            "interpolate",
            ["linear"],
            ["get", "freshness"],
            0,
            0.06,
            1,
            0.22,
          ],
          "circle-blur": 0.8,
        }}
      />
      <Layer
        id="pilot-audit-pulse-core"
        type="circle"
        paint={{
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["get", "freshness"],
            0,
            2,
            1,
            6,
          ],
          "circle-color": [
            "interpolate",
            ["linear"],
            ["get", "freshness"],
            0,
            "#64748b",
            1,
            "#bef264",
          ],
          "circle-opacity": [
            "interpolate",
            ["linear"],
            ["get", "freshness"],
            0,
            0.4,
            1,
            0.95,
          ],
          "circle-stroke-width": 1,
          "circle-stroke-color": "rgba(163, 230, 53, 0.5)",
        }}
      />
    </Source>
  );
}
