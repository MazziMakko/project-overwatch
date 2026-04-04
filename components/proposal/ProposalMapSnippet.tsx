"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const STYLE =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

type ProposalMapSnippetProps = {
  lat: number;
  lng: number;
};

export function ProposalMapSnippet({ lat, lng }: ProposalMapSnippetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE,
      center: [lng, lat],
      zoom: 15.2,
      interactive: false,
      attributionControl: false,
    });

    mapRef.current = map;
    map.on("load", () => {
      setReady(true);
      new maplibregl.Marker({ color: "#4ade80" })
        .setLngLat([lng, lat])
        .addTo(map);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [lat, lng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.setCenter([lng, lat]);
  }, [lat, lng, ready]);

  return (
    <div className="proposal-map-shell relative aspect-[16/10] w-full max-w-3xl overflow-hidden rounded-xl border border-white/[0.08] bg-black shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
      <div ref={containerRef} className="absolute inset-0" />
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden
      >
        <div className="overwatch-radar-line opacity-80" />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#050505] to-transparent" />
      <p className="pointer-events-none absolute bottom-3 left-4 max-w-[85%] font-mono text-[9px] leading-relaxed tracking-wide text-white/35">
        Tactical grid · © OpenStreetMap · © CARTO
      </p>
    </div>
  );
}
