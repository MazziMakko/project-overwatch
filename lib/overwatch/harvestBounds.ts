/**
 * Shared OSM harvest viewport limits. Server and client use the same max area so we can
 * clamp oversized map views before calling Overpass (avoids "too big" errors when zoomed out).
 */

export type MapBounds = {
  south: number;
  west: number;
  north: number;
  east: number;
};

const DEFAULT_MAX_BBOX_AREA_SQ_DEG = 0.28;

/**
 * Max lat×lng bounding-box area (square degrees). Override with
 * `OVERPASS_MAX_BBOX_AREA_SQ_DEG` (server) or `NEXT_PUBLIC_OVERPASS_MAX_BBOX_AREA_SQ_DEG` (client build).
 */
export function getMaxHarvestBboxAreaSqDeg(): number {
  const raw =
    typeof process !== "undefined"
      ? process.env.OVERPASS_MAX_BBOX_AREA_SQ_DEG ??
        process.env.NEXT_PUBLIC_OVERPASS_MAX_BBOX_AREA_SQ_DEG
      : undefined;
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0 && n <= 1) return n;
  return DEFAULT_MAX_BBOX_AREA_SQ_DEG;
}

/** Shrink bounds toward center so area ≤ max (preserves aspect ratio). */
export function clampBoundsToHarvestArea(
  bounds: MapBounds,
  maxAreaSqDeg: number = getMaxHarvestBboxAreaSqDeg(),
): MapBounds {
  const { south, west, north, east } = bounds;
  const latSpan = Math.abs(north - south);
  const lngSpan = Math.abs(east - west);
  const area = latSpan * lngSpan;
  if (!(area > 0)) return bounds;
  if (area <= maxAreaSqDeg) return bounds;

  const scale = Math.sqrt(maxAreaSqDeg / area);
  const latMid = (south + north) / 2;
  const lngMid = (west + east) / 2;
  const halfLat = (latSpan * scale) / 2;
  const halfLng = (lngSpan * scale) / 2;

  return {
    south: latMid - halfLat,
    north: latMid + halfLat,
    west: lngMid - halfLng,
    east: lngMid + halfLng,
  };
}

export function assertHarvestableBounds(bounds: MapBounds): void {
  const { south, west, north, east } = bounds;
  const latSpan = Math.abs(north - south);
  const lngSpan = Math.abs(east - west);
  if (!(latSpan > 0 && lngSpan > 0)) {
    throw new Error("Invalid map bounds for harvest.");
  }
  const max = getMaxHarvestBboxAreaSqDeg();
  if (latSpan * lngSpan > max) {
    throw new Error(
      "Map area is too large for OSM harvest. Zoom in and try again.",
    );
  }
}
