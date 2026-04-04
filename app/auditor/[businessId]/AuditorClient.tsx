"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MeshCoordinator } from "@/components/MeshCoordinator";
import { useGeospatial } from "@/hooks/useGeospatial";
import { useAuditStore } from "@/store/useAuditStore";

const LIME = "#84cc16";
const BG = "#050505";

function gpsBars(accuracyM: number | null): { level: number; label: string } {
  if (accuracyM == null || Number.isNaN(accuracyM)) {
    return { level: 0, label: "NO LOCK" };
  }
  if (accuracyM <= 8) return { level: 3, label: "STRONG" };
  if (accuracyM <= 25) return { level: 2, label: "MED" };
  if (accuracyM <= 80) return { level: 1, label: "WEAK" };
  return { level: 0, label: "POOR" };
}

export function AuditorClient({ businessId }: { businessId: string }) {
  const {
    latitude,
    longitude,
    accuracy,
    loading: gpsLoading,
    error: gpsError,
    refresh: refreshGps,
  } = useGeospatial();

  const offlineQueue = useAuditStore((s) => s.offlineQueue);
  const isSyncing = useAuditStore((s) => s.isSyncing);
  const enqueueAudit = useAuditStore((s) => s.enqueueAudit);
  const syncQueue = useAuditStore((s) => s.syncQueue);

  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [lastLog, setLastLog] = useState<string | null>(null);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  const lock = useMemo(() => gpsBars(accuracy), [accuracy]);

  const onScanLog = useCallback(async () => {
    setLastLog(null);
    setSyncMsg(null);
    if (latitude == null || longitude == null) {
      setLastLog("GPS fix required. Wait for lock or tap REFRESH GPS.");
      refreshGps();
      return;
    }
    const payload: Record<string, unknown> = {
      kind: "field-scan",
      businessId,
      recordedAt: new Date().toISOString(),
      userAgent:
        typeof navigator !== "undefined" ? navigator.userAgent : null,
    };
    const audit = await enqueueAudit({
      businessId,
      payload,
      latitude,
      longitude,
      accuracy,
    });
    setLastLog(`Logged · hash ${audit.cryptoHash.slice(0, 12)}…`);
  }, [
    accuracy,
    businessId,
    enqueueAudit,
    latitude,
    longitude,
    refreshGps,
  ]);

  const onSync = useCallback(async () => {
    setSyncMsg(null);
    try {
      const r = await syncQueue();
      if (r.ok) {
        setSyncMsg(
          r.ids.length === 0
            ? "Queue empty"
            : `Synced ${r.ids.length} record(s) to ledger`,
        );
      } else {
        setSyncMsg(r.error);
      }
    } catch {
      setSyncMsg("Sync failed unexpectedly.");
    }
  }, [syncQueue]);

  return (
    <div
      className="min-h-screen px-4 py-8 font-mono text-[13px] sm:text-sm"
      style={{ backgroundColor: BG, color: "#e5e5e5" }}
    >
      <div className="mx-auto flex max-w-lg flex-col gap-8">
        <header className="border-b-2 pb-4" style={{ borderColor: LIME }}>
          <p className="text-[10px] uppercase tracking-[0.35em] text-neutral-500">
            AuraMesh · Auditor
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">
            SITE / {businessId}
          </h1>
        </header>

        <div className="flex flex-wrap items-center gap-3">
          <span
            className={
              online
                ? "rounded px-2 py-1 text-[10px] uppercase tracking-wider text-neutral-500"
                : "animate-pulse rounded px-2 py-1 text-[10px] uppercase tracking-wider"
            }
            style={
              online
                ? {}
                : {
                    backgroundColor: `${LIME}22`,
                    color: LIME,
                    boxShadow: `0 0 20px ${LIME}44`,
                  }
            }
          >
            {online ? "ONLINE" : "OFFLINE MODE"}
          </span>
          {isSyncing && (
            <span className="text-[10px] uppercase" style={{ color: LIME }}>
              Syncing…
            </span>
          )}
        </div>

        <section
          className="rounded-lg border-2 p-5"
          style={{ borderColor: `${LIME}66` }}
        >
          <p className="text-[10px] uppercase tracking-widest text-neutral-500">
            GPS lock
          </p>
          <div className="mt-3 flex items-end gap-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-3 rounded-sm transition-colors"
                style={{
                  height: `${8 + i * 10}px`,
                  backgroundColor:
                    lock.level >= i ? LIME : `${LIME}22`,
                  opacity: lock.level >= i ? 1 : 0.35,
                }}
              />
            ))}
          </div>
          <p className="mt-3 text-lg font-semibold text-white">{lock.label}</p>
          <p className="mt-1 text-neutral-400">
            {gpsLoading && "Acquiring satellites…"}
            {!gpsLoading &&
              accuracy != null &&
              `Accuracy ±${Math.round(accuracy)} m`}
            {!gpsLoading && accuracy == null && gpsError && (
              <span className="text-red-400">{gpsError}</span>
            )}
          </p>
          <p className="mt-2 break-all text-[11px] text-neutral-600">
            {latitude != null && longitude != null
              ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
              : "—"}
          </p>
          <button
            type="button"
            onClick={() => refreshGps()}
            className="mt-4 border px-4 py-2 text-[10px] uppercase tracking-wider text-white transition hover:bg-white/5"
            style={{ borderColor: LIME }}
          >
            Refresh GPS
          </button>
        </section>

        <button
          type="button"
          onClick={() => void onScanLog()}
          className="w-full rounded-lg border-4 py-8 text-2xl font-black uppercase tracking-[0.2em] text-black transition hover:brightness-110 active:scale-[0.99]"
          style={{
            backgroundColor: LIME,
            borderColor: LIME,
            boxShadow: `0 0 40px ${LIME}66`,
          }}
        >
          Scan / Log
        </button>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => void onSync()}
            disabled={!online || isSyncing || offlineQueue.length === 0}
            className="flex-1 border-2 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-white disabled:opacity-30"
            style={{ borderColor: LIME }}
          >
            Uplink queue ({offlineQueue.length})
          </button>
        </div>

        {lastLog && (
          <p className="text-center text-xs" style={{ color: LIME }}>
            {lastLog}
          </p>
        )}
        {syncMsg && (
          <p className="text-center text-xs text-neutral-400">{syncMsg}</p>
        )}

        <MeshCoordinator />

        <footer className="border-t border-neutral-800 pt-6 text-[10px] text-neutral-600">
          Local queue + BroadcastChannel (same device) + PeerJS mesh (cross
          tablet via LAN PeerServer). Ledger hash verified on uplink.
        </footer>
      </div>
    </div>
  );
}
