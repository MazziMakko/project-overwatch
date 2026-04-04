"use client";

import { useCallback, useEffect, useState } from "react";

export type GeospatialState = {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  loading: boolean;
  error: string | null;
};

const OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 20_000,
};

export function useGeospatial() {
  const [state, setState] = useState<GeospatialState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    loading: false,
    error: null,
  });

  const refresh = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState((s) => ({
        ...s,
        loading: false,
        error: "Geolocation not available",
      }));
      return;
    }

    setState((s) => ({ ...s, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? null,
          loading: false,
          error: null,
        });
      },
      (err) => {
        setState({
          latitude: null,
          longitude: null,
          accuracy: null,
          loading: false,
          error: err.message || "GPS error",
        });
      },
      OPTIONS,
    );
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...state, refresh };
}
