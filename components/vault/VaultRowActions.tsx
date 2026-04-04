"use client";

import Link from "next/link";
import {
  Copy,
  ExternalLink,
  FileStack,
  MapPin,
  ScanEye,
  Share2,
} from "lucide-react";
import { useCallback, useState } from "react";
import { messageFromUnknown } from "@/lib/messageFromUnknown";
import { ensureProposalShareUrl } from "@/app/actions/proposalPublic";
import {
  firstAssistantPitch,
  parseStrategistThread,
} from "@/lib/strategistThread";

type VaultRowActionsProps = {
  vaultId: string;
  lat: number;
  lng: number;
  strategistThread: unknown;
  onOpenBriefing?: () => void;
};

export function VaultRowActions({
  vaultId,
  lat,
  lng,
  strategistThread,
  onOpenBriefing,
}: VaultRowActionsProps) {
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [accessPin, setAccessPin] = useState("");
  const [removePin, setRemovePin] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareErr, setShareErr] = useState<string | null>(null);
  const [urlCopied, setUrlCopied] = useState(false);

  const thread = parseStrategistThread(strategistThread);
  const pitch = firstAssistantPitch(thread);
  const hasPitch = pitch.length > 0;

  const copyPitch = useCallback(async () => {
    if (!hasPitch) return;
    try {
      await navigator.clipboard.writeText(pitch);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [hasPitch, pitch]);

  const runShare = useCallback(async () => {
    setShareBusy(true);
    setShareErr(null);
    setShareUrl(null);
    setUrlCopied(false);
    try {
      let accessPinArg: string | undefined;
      if (removePin) {
        accessPinArg = "";
      } else if (accessPin.trim().length > 0) {
        accessPinArg = accessPin.trim();
      }
      const { url } = await ensureProposalShareUrl({
        leadId: vaultId,
        ...(accessPinArg !== undefined ? { accessPin: accessPinArg } : {}),
      });
      setShareUrl(url);
      await navigator.clipboard.writeText(url);
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2500);
      setAccessPin("");
      setRemovePin(false);
    } catch (e) {
      setShareErr(messageFromUnknown(e));
    } finally {
      setShareBusy(false);
    }
  }, [accessPin, removePin, vaultId]);

  const q = `${lat},${lng}`;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  const streetViewUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;

  return (
    <div className="flex min-w-[200px] flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-1">
        {onOpenBriefing ? (
          <button
            type="button"
            onClick={onOpenBriefing}
            title="Digital fragility report (3-6-9 briefing)"
            className="inline-flex items-center gap-1 rounded border border-lime-500/35 bg-lime-500/10 px-1.5 py-1 text-[10px] text-lime-100 hover:bg-lime-500/20"
          >
            <FileStack className="size-3 shrink-0" aria-hidden />
            Brief
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => void copyPitch()}
          disabled={!hasPitch}
          title={hasPitch ? "Copy AuraMesh hook" : "No strategist thread saved"}
          className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 py-1 text-[10px] text-slate-300 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
        >
          <Copy className="size-3 shrink-0" aria-hidden />
          {copied ? "Copied" : "Pitch"}
        </button>
        <button
          type="button"
          onClick={() => {
            setShareOpen((o) => !o);
            setShareErr(null);
          }}
          title="Create or copy public proposal link"
          className="inline-flex items-center gap-1 rounded border border-violet-500/30 bg-violet-500/10 px-1.5 py-1 text-[10px] text-violet-200 hover:bg-violet-500/20"
        >
          <Share2 className="size-3 shrink-0" aria-hidden />
          Share
        </button>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Open in Google Maps"
          className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 py-1 text-[10px] text-slate-300 hover:bg-white/10"
        >
          <MapPin className="size-3 shrink-0" aria-hidden />
          Map
        </a>
        <a
          href={streetViewUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Street View"
          className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 py-1 text-[10px] text-slate-300 hover:bg-white/10"
        >
          <ScanEye className="size-3 shrink-0" aria-hidden />
          Street
        </a>
        <Link
          href={`/overwatch?vaultId=${encodeURIComponent(vaultId)}`}
          title="Refocus Overwatch map on this target"
          className="inline-flex items-center gap-1 rounded border border-lime-500/30 bg-lime-500/10 px-1.5 py-1 text-[10px] text-lime-100 hover:bg-lime-500/20"
        >
          <ExternalLink className="size-3 shrink-0" aria-hidden />
          HUD
        </Link>
      </div>

      {shareOpen ? (
        <div className="w-full max-w-[220px] rounded-md border border-white/10 bg-black/50 p-2 text-left">
          <p className="mb-2 font-mono text-[9px] uppercase tracking-wide text-slate-500">
            Public proposal
          </p>
          <input
            type="password"
            inputMode="numeric"
            placeholder="Optional PIN (4–12)"
            value={accessPin}
            onChange={(e) => {
              setAccessPin(e.target.value);
              setRemovePin(false);
            }}
            disabled={removePin}
            className="mb-2 w-full rounded border border-white/10 bg-black/40 px-2 py-1 font-mono text-[10px] text-slate-200 placeholder:text-slate-600"
          />
          <label className="mb-2 flex cursor-pointer items-center gap-1.5 font-mono text-[9px] text-slate-500">
            <input
              type="checkbox"
              checked={removePin}
              onChange={(e) => {
                setRemovePin(e.target.checked);
                if (e.target.checked) setAccessPin("");
              }}
              className="rounded border-white/20"
            />
            Remove PIN next
          </label>
          <button
            type="button"
            disabled={shareBusy}
            onClick={() => void runShare()}
            className="w-full rounded border border-violet-500/35 bg-violet-500/15 py-1.5 font-mono text-[10px] text-violet-100 hover:bg-violet-500/25 disabled:opacity-50"
          >
            {shareBusy ? "Working…" : "Generate & copy link"}
          </button>
          {shareErr ? (
            <p className="mt-2 text-[10px] text-red-400/90">{shareErr}</p>
          ) : null}
          {shareUrl ? (
            <p className="mt-2 break-all font-mono text-[9px] text-slate-500">
              {urlCopied ? "Copied to clipboard. " : ""}
              {shareUrl}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
