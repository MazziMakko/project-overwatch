"use client";

import type { SovereignLeadHarvest } from "@/lib/services/OverpassService";
import {
  formatCoordinates,
  formatLeadAddress,
  formatOsmRatingLine,
  googleMapsSearchUrl,
  safeHttpUrl,
} from "@/lib/overwatch/leadMapDisplay";

type LeadMapPopupProps = {
  lead: SovereignLeadHarvest;
};

export function LeadMapPopup({ lead }: LeadMapPopupProps) {
  const address = formatLeadAddress(lead);
  const website = safeHttpUrl(lead.website);
  const ratingLine = formatOsmRatingLine(lead.osmMetadata as Record<string, unknown>);
  const mapsUrl = googleMapsSearchUrl(lead.lat, lead.lng);
  const phone = lead.phone?.trim() || null;

  return (
    <div className="min-w-[220px] max-w-[280px] rounded-lg border border-white/15 bg-[#0a0a0a] p-3 text-left text-slate-200 shadow-xl">
      <p className="font-semibold leading-snug text-white">{lead.name}</p>
      <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wide text-slate-500">
        {lead.type}
      </p>
      {ratingLine ? (
        <p className="mt-2 text-xs text-amber-200/90">{ratingLine}</p>
      ) : (
        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
          Google-style star ratings are not stored in OSM for most places. Use
          coordinates below for dead-zone handoff; open Maps when you have data.
        </p>
      )}
      <dl className="mt-3 space-y-1.5 border-t border-white/10 pt-2 font-mono text-[11px]">
        {address ? (
          <div>
            <dt className="text-slate-500">Address</dt>
            <dd className="text-slate-300">{address}</dd>
          </div>
        ) : null}
        {phone ? (
          <div>
            <dt className="text-slate-500">Phone</dt>
            <dd>
              <a
                href={`tel:${phone.replace(/\s+/g, "")}`}
                className="text-sky-300 underline decoration-sky-500/40 hover:text-sky-200"
              >
                {phone}
              </a>
            </dd>
          </div>
        ) : null}
        {website ? (
          <div>
            <dt className="text-slate-500">Website</dt>
            <dd>
              <a
                href={website}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-lime-300 underline decoration-lime-500/40 hover:text-lime-200"
              >
                {website.replace(/^https?:\/\//i, "")}
              </a>
            </dd>
          </div>
        ) : null}
        {lead.opening_hours ? (
          <div>
            <dt className="text-slate-500">Hours</dt>
            <dd className="text-slate-300">{lead.opening_hours}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-slate-500">Coordinates (WGS84)</dt>
          <dd className="select-all text-lime-200/90">
            {formatCoordinates(lead.lat, lead.lng)}
          </dd>
        </div>
      </dl>
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 block rounded border border-white/10 bg-white/5 px-2 py-1.5 text-center text-[10px] font-medium uppercase tracking-wide text-slate-400 hover:bg-white/10 hover:text-slate-200"
      >
        Open in Google Maps
      </a>
    </div>
  );
}
