"use client";

import { FileText, X, Copy, ExternalLink, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  generateDigitalFragilityReport,
  persistSovereignBriefingSnapshot,
} from "@/app/actions/sovereignMetadata";
import type { DigitalFragilityReport } from "@/lib/sovereign/briefingSnapshot";
import { messageFromUnknown } from "@/lib/messageFromUnknown";

type MetadataPanelProps = {
  leadId: string | null;
  onClose: () => void;
};

export function MetadataPanel({ leadId, onClose }: MetadataPanelProps) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [persistWarn, setPersistWarn] = useState<string | null>(null);
  const [report, setReport] = useState<DigitalFragilityReport | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!leadId) {
      setReport(null);
      setErr(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setErr(null);
    setPersistWarn(null);
    setReport(null);

    void (async () => {
      const res = await generateDigitalFragilityReport(leadId);
      if (cancelled) return;
      setLoading(false);
      if (res.ok) {
        setReport(res.report);
        const saved = await persistSovereignBriefingSnapshot(leadId, res.report);
        if (!saved.ok) {
          setPersistWarn(saved.error);
        }
      } else {
        setErr(res.error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [leadId]);

  const copyOutreach = useCallback(async () => {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(report.outreachCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      setErr(messageFromUnknown(e));
    }
  }, [report]);

  if (!leadId) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex justify-end bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sovereign-briefing-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close briefing"
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-lg flex-col border-l border-white/15 bg-[#030303] shadow-[0_0_60px_rgba(0,0,0,0.85)]">
        <header className="flex items-start justify-between gap-3 border-b border-white/10 bg-black/50 px-4 py-3">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-lime-400" aria-hidden />
            <div>
              <p
                id="sovereign-briefing-title"
                className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500"
              >
                Sovereign metadata engine
              </p>
              <p className="font-mono text-sm font-semibold text-slate-100">
                Digital fragility report
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-white/10 p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
            title="Close"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 font-mono text-[12px] leading-relaxed text-slate-300">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
              <Loader2 className="size-8 animate-spin text-violet-400" />
              <p className="text-[11px] uppercase tracking-wider">
                Automating intelligence…
              </p>
            </div>
          ) : err ? (
            <div className="rounded border border-red-500/35 bg-red-950/30 p-3 text-red-200/90">
              {err}
            </div>
          ) : report ? (
            <article className="space-y-4">
              <div className="border border-white/15 bg-[#0a0a0a] p-3 shadow-[inset_0_0_0_1px_rgba(163,230,53,0.12)]">
                <p className="mb-2 text-[9px] uppercase tracking-[0.25em] text-lime-500/80">
                  Briefing document
                </p>
                <div className="space-y-3">
                  <section>
                    <h3 className="mb-1 text-[10px] font-bold uppercase tracking-widest text-violet-300">
                      Root 3 · Problem
                    </h3>
                    <p className="whitespace-pre-wrap text-slate-300">
                      {report.root3Problem}
                    </p>
                  </section>
                  <section>
                    <h3 className="mb-1 text-[10px] font-bold uppercase tracking-widest text-violet-300">
                      Root 6 · Logic
                    </h3>
                    <p className="whitespace-pre-wrap text-slate-300">
                      {report.root6Logic}
                    </p>
                  </section>
                  <section>
                    <h3 className="mb-1 text-[10px] font-bold uppercase tracking-widest text-violet-300">
                      Root 9 · Source
                    </h3>
                    <p className="whitespace-pre-wrap text-slate-300">
                      {report.root9Source}
                    </p>
                  </section>
                </div>
              </div>

              <div className="border border-dashed border-white/20 bg-black/40 p-3">
                <p className="mb-2 text-[9px] uppercase tracking-[0.2em] text-slate-500">
                  SEO payload
                </p>
                <p className="text-[11px] text-lime-200/90">{report.seoTitle}</p>
                <p className="mt-1 text-[11px] text-slate-400">
                  {report.seoDescription}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void copyOutreach()}
                  className="inline-flex items-center gap-1.5 rounded border border-lime-500/40 bg-lime-500/10 px-3 py-2 text-[11px] font-medium text-lime-100 hover:bg-lime-500/20"
                >
                  <Copy className="size-3.5" />
                  {copied ? "Copied" : "One-click copy · outreach"}
                </button>
                <Link
                  href={`/vault/landing/${encodeURIComponent(leadId)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded border border-violet-500/40 bg-violet-500/10 px-3 py-2 text-[11px] font-medium text-violet-100 hover:bg-violet-500/20"
                >
                  <ExternalLink className="size-3.5" />
                  Open SEO landing page
                </Link>
              </div>
              {persistWarn ? (
                <p className="text-[10px] text-amber-400/90">
                  Snapshot not saved ({persistWarn}). Re-run briefing or check DB.
                </p>
              ) : null}
            </article>
          ) : null}
        </div>

        <footer className="border-t border-white/10 bg-black/40 px-4 py-2">
          <p className="text-center font-mono text-[9px] uppercase tracking-widest text-slate-600">
            Status: Go · Attract the ICP
          </p>
        </footer>
      </aside>
    </div>
  );
}
