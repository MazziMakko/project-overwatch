"use client";

import { useUser } from "@clerk/nextjs";
import { AnimatePresence, motion } from "framer-motion";
import { Radio } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type UplinkLogLine = {
  id: string;
  text: string;
  at: number;
};

function formatUplinkPayload(d: {
  id?: string;
  cryptoHash?: string;
  lat?: number | null;
  lng?: number | null;
  businessId?: string;
}): string | null {
  if (!d.id || !d.cryptoHash) return null;
  const lat =
    d.lat != null && Number.isFinite(Number(d.lat))
      ? Number(d.lat).toFixed(6)
      : "—";
  const lng =
    d.lng != null && Number.isFinite(Number(d.lng))
      ? Number(d.lng).toFixed(6)
      : "—";
  const hash = String(d.cryptoHash).slice(0, 18);
  const site = d.businessId ? d.businessId.slice(0, 10) : "—";
  return `[UPLINK] NEW AUDIT CAPTURED — HASH: 0x${hash} — LAT/LNG: ${lat}, ${lng} — SITE: ${site}`;
}

export function PilotLiveFeed() {
  const { isSignedIn } = useUser();
  const [lines, setLines] = useState<UplinkLogLine[]>([]);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!isSignedIn) {
      setConnected(false);
      return;
    }

    const es = new EventSource("/api/pilot/uplink");
    esRef.current = es;

    es.onopen = () => setConnected(true);

    es.onmessage = (ev) => {
      try {
        const d = JSON.parse(ev.data as string) as {
          type?: string;
          id?: string;
          cryptoHash?: string;
          lat?: number | null;
          lng?: number | null;
          businessId?: string;
        };
        if (d.type === "error") return;
        if (d.type !== "uplink") return;
        const text = formatUplinkPayload(d);
        if (!text) return;
        setLines((prev) =>
          [{ id: d.id!, text, at: Date.now() }, ...prev].slice(0, 48),
        );
      } catch {
        /* ignore parse */
      }
    };

    es.onerror = () => {
      setConnected(false);
    };

    return () => {
      es.close();
      esRef.current = null;
      setConnected(false);
    };
  }, [isSignedIn]);

  if (!isSignedIn) return null;

  return (
    <aside
      className="rounded-lg border border-lime-500/25 bg-black/50 backdrop-blur-md"
      aria-label="Pilot live uplink feed"
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
        <div className="flex items-center gap-2">
          <Radio
            className={`size-4 ${connected ? "text-lime-400" : "text-slate-600"}`}
            aria-hidden
          />
          <h2 className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300">
            Live uplink
          </h2>
        </div>
        <span
          className={`font-mono text-[9px] uppercase tracking-wide ${
            connected ? "text-lime-400/90" : "text-slate-600"
          }`}
        >
          {connected ? "stream" : "reconnect…"}
        </span>
      </div>
      <div className="max-h-[min(50vh,420px)] overflow-y-auto px-2 py-2 font-mono text-[10px] leading-relaxed text-slate-400">
        {lines.length === 0 ? (
          <p className="px-1 py-4 text-center text-slate-600">
            Waiting for tablet sync… Open{" "}
            <code className="text-lime-500/80">/auditor/{"{vaultLeadId}"}</code>{" "}
            and push queue when online.
          </p>
        ) : (
          <AnimatePresence initial={false}>
            {lines.map((line) => (
              <motion.div
                key={line.id}
                layout={false}
                initial={{ opacity: 0, x: 28 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                className="border-b border-white/[0.04] py-2 pl-1 text-lime-100/90 last:border-0"
              >
                {line.text}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </aside>
  );
}
