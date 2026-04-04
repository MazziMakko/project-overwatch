import type { SovereignLeadHarvest } from "@/lib/services/OverpassService";

type PolygonFeature = {
  type: "Feature";
  id?: string;
  properties: { id: string; score: number; height: number };
  geometry: { type: "Polygon"; coordinates: number[][][] };
};

/** Half-width of the extrusion footprint in meters (narrow column). */
const HALF_FOOTPRINT_M = 7;

function squareRing(
  lat: number,
  lng: number,
  halfM: number,
): [number, number][] {
  const cos = Math.cos((lat * Math.PI) / 180);
  const mPerDegLat = 111_320;
  const mPerDegLng = 111_320 * Math.max(0.05, cos);
  const dLat = halfM / mPerDegLat;
  const dLng = halfM / mPerDegLng;
  return [
    [lng - dLng, lat - dLat],
    [lng + dLng, lat - dLat],
    [lng + dLng, lat + dLat],
    [lng - dLng, lat + dLat],
    [lng - dLng, lat - dLat],
  ];
}

/**
 * Small footprint polygons at each lead with `height` (m) from vulnerability score.
 * Score 5 towers over score 1.
 */
export function buildLeadExtrusionGeoJson(
  leads: SovereignLeadHarvest[],
  vulnerabilityById: Record<string, number>,
): { type: "FeatureCollection"; features: PolygonFeature[] } {
  const features: PolygonFeature[] = [];
  for (const lead of leads) {
    const raw = vulnerabilityById[lead.id] ?? 1;
    const score = Math.min(5, Math.max(1, Math.round(raw)));
    const height = 45 + score * 85;
    const ring = squareRing(lead.lat, lead.lng, HALF_FOOTPRINT_M);
    features.push({
      type: "Feature",
      id: lead.id,
      properties: {
        id: lead.id,
        score,
        height,
      },
      geometry: {
        type: "Polygon",
        coordinates: [ring],
      },
    });
  }
  return { type: "FeatureCollection", features };
}
