"use client";

import { LEAD_CATEGORY_LEGEND } from "@/lib/overwatch/leadMapDisplay";

export function MapBusinessLegend() {
  return (
    <div
      className="pointer-events-none absolute bottom-3 right-3 z-[2] max-w-[200px] rounded-lg border border-white/10 bg-black/70 px-3 py-2.5 font-mono text-[9px] uppercase tracking-wide text-slate-400 backdrop-blur-md"
      aria-label="Business type legend"
    >
      <p className="mb-2 text-[10px] font-semibold text-slate-300">Targets</p>
      <ul className="space-y-1.5 normal-case tracking-normal">
        {LEAD_CATEGORY_LEGEND.map((row) => (
          <li key={row.category} className="flex items-center gap-2 text-slate-400">
            <span
              className={`size-2 shrink-0 rounded-full border border-white/20 ${row.dotClass}`}
              aria-hidden
            />
            <span className="text-[10px] leading-tight">{row.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
