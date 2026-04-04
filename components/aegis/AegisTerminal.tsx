"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchAegisGasOracle,
  type AegisOracleResult,
} from "@/app/actions/aegisOracle";
import { useVortex } from "@/hooks/useVortex";
import {
  calculateGasResonance,
  type GasResonanceResult,
  type GasResonanceStatus,
} from "@/lib/aegis/gasResonance";

const FEED_LINES = [
  "[14:02:01] COMMIT · batch #AEG-2046 · XRP · 12.4k USDC equiv",
  "[14:02:04] VERIFY · counterparty sig · escrow HELD",
  "[14:02:09] SETTLE · hash 0x9f…a3 · SOURCE window open",
  "[14:02:11] COMMIT · B2B invoice INV-8831 · ALGO rail",
  "[14:02:15] HOLD · MATERIAL noise · gas root 7 — defer",
  "[14:02:18] PREPARE · HARMONIC · root 6 — fee stabilizing",
  "[14:02:22] SETTLE NOW · root 9 · God Window · finality",
  "[14:02:25] COMMIT · Gumroad webhook · ledger append-only",
] as const;

function statusLabel(s: GasResonanceStatus): string {
  switch (s) {
    case "SOURCE":
      return "SOURCE · God Window";
    case "HARMONIC":
      return "HARMONIC · Control flow";
    default:
      return "MATERIAL · Noise";
  }
}

export function AegisTerminal() {
  const { pulseIntensity, root: vortexRoot, state: vortexState } = useVortex();
  const [trinityStage, setTrinityStage] = useState(0);
  const [oracle, setOracle] = useState<AegisOracleResult | null>(null);
  const [oracleLoading, setOracleLoading] = useState(true);

  /** Vortex fallback when oracle is offline or API key missing. */
  const fallbackGwei = useMemo(() => {
    const base = 27 + (vortexRoot % 5) * 0.4;
    return Math.max(1, base + pulseIntensity * 5.5);
  }, [pulseIntensity, vortexRoot]);

  useEffect(() => {
    let cancelled = false;
    const syncOracle = async () => {
      const data = await fetchAegisGasOracle();
      if (!cancelled) {
        setOracle(data);
        setOracleLoading(false);
      }
    };
    void syncOracle();
    const interval = window.setInterval(syncOracle, 300_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const live = oracle?.success === true;
  const displayGwei = live ? oracle.gwei : fallbackGwei;
  const resonance: GasResonanceResult = live
    ? oracle.resonance
    : calculateGasResonance(fallbackGwei);

  /** Faster gauge pulse as digital root approaches 9 (Source window). */
  const pulseDurationSec = useMemo(() => {
    const r = resonance.root;
    return Math.max(0.35, 1.85 - (r / 9) * 1.45);
  }, [resonance.root]);

  /** Feed scroll speed tied to vortex pulse (higher pulse = faster log drift). */
  const feedDurationSec = Math.max(14, 32 - pulseIntensity * 18);

  const trinityColors =
    trinityStage === 0
      ? "border-amber-500/80 bg-amber-500/15 text-amber-100 shadow-[0_0_24px_rgba(245,158,11,0.25)]"
      : trinityStage === 1
        ? "border-violet-500/80 bg-violet-500/15 text-violet-100 shadow-[0_0_24px_rgba(139,92,246,0.25)]"
        : "border-lime-400/90 bg-lime-500/15 text-lime-100 shadow-[0_0_28px_rgba(74,222,128,0.35)]";

  const trinityLabel =
    trinityStage === 0 ? "3 · COMMIT" : trinityStage === 1 ? "6 · VERIFY" : "9 · SETTLE";

  return (
    <div
      className="relative flex min-h-[calc(100dvh-4.5rem)] w-full flex-col overflow-hidden bg-[#030303] font-mono text-slate-200"
      data-aegis-terminal
    >
      <div
        className="pointer-events-none absolute inset-0 z-[2] opacity-[0.22]"
        aria-hidden
        style={{
          backgroundImage: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0,0,0,0.45) 2px,
            rgba(0,0,0,0.45) 3px
          )`,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 z-[2] mix-blend-overlay will-change-transform"
        aria-hidden
        style={{
          background:
            "linear-gradient(rgba(34,197,94,0.15) 1px, transparent 1px)",
          backgroundSize: "100% 4px",
          opacity: 0.07,
          animation: "aegis-scan-drift 6s linear infinite",
        }}
      />

      <header className="relative z-[3] shrink-0 border-b border-white/10 px-4 py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-sm font-semibold tracking-tight text-white">
            AEGIS_PAY <span className="text-lime-400/90">::</span> TERMINAL
          </h1>
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
            March 2026 · Brutalist settlement
          </p>
        </div>
        <p className="mt-1 text-[10px] text-violet-300/80">
          Vortex sync · root {vortexRoot} · {vortexState} · pulse{" "}
          {pulseIntensity.toFixed(2)}
        </p>
        <p className="mt-1 text-[10px] text-slate-500">
          Oracle:{" "}
          {oracleLoading ? (
            <span className="text-amber-200/90">uplink…</span>
          ) : live ? (
            <span className="text-lime-300/90">
              LIVE · {oracle.network} · sync {new Date(oracle.lastSync).toLocaleTimeString()}
            </span>
          ) : (
            <span className="text-amber-200/90">
              fallback — {oracle?.error ?? "offline"}
            </span>
          )}
        </p>
      </header>

      <div className="relative z-[3] grid min-h-0 flex-1 grid-cols-1 gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="flex min-h-0 flex-col border-b border-white/10 p-4 lg:border-b-0 lg:border-r">
          <h2 className="mb-3 text-[10px] uppercase tracking-[0.25em] text-slate-500">
            Gas resonance
          </h2>
          <div className="flex flex-wrap items-end gap-6">
            <div>
              <p className="text-[10px] text-slate-500">
                GWEI {live ? "(Etherscan propose)" : "(vortex fallback)"}
              </p>
              <p className="text-3xl tabular-nums text-white">
                {displayGwei.toFixed(2)}
              </p>
            </div>
            <div
              className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-2 border-lime-500/40 bg-black/60"
              style={{
                boxShadow: `0 0 ${12 + resonance.root * 3}px rgba(74,222,128,${0.12 + pulseIntensity * 0.35})`,
                animation: `aegis-terminal-pulse ${pulseDurationSec}s ease-in-out infinite`,
              }}
            >
              <div className="text-center">
                <p className="text-2xl font-bold text-lime-300 tabular-nums">
                  {resonance.root}
                </p>
                <p className="text-[9px] uppercase tracking-wider text-slate-500">
                  root
                </p>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-violet-200/90">
                {statusLabel(resonance.status)}
              </p>
              <p className="mt-1 text-sm text-slate-300">
                Strategy:{" "}
                <span
                  className={
                    resonance.strategy === "SETTLE NOW"
                      ? "text-lime-300"
                      : resonance.strategy === "PREPARE"
                        ? "text-violet-300"
                        : "text-amber-200/90"
                  }
                >
                  {resonance.strategy}
                </span>
              </p>
              <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
                Material: friction · Harmonic: transition · Source: finality
              </p>
            </div>
          </div>
        </section>

        <aside className="flex min-h-[200px] min-w-0 flex-col p-4 lg:max-h-none">
          <h2 className="mb-2 text-[10px] uppercase tracking-[0.25em] text-slate-500">
            Trinity settle
          </h2>
          <button
            type="button"
            onClick={() => setTrinityStage((s) => (s + 1) % 3)}
            className={`w-full rounded border-2 px-4 py-4 text-sm font-semibold uppercase tracking-wider transition-colors ${trinityColors}`}
          >
            SETTLE
            <span className="mt-1 block text-[10px] font-normal opacity-90">
              {trinityLabel}
            </span>
          </button>
          <p className="mt-3 text-[9px] leading-relaxed text-slate-500">
            Amber 3 → Violet 6 → Lime 9. Click to advance the ritual.
          </p>
        </aside>
      </div>

      <section className="relative z-[3] min-h-[140px] shrink-0 border-t border-white/10 p-4">
        <h2 className="mb-2 text-[10px] uppercase tracking-[0.25em] text-slate-500">
          Transaction feed
        </h2>
        <div
          className="max-h-40 overflow-hidden text-[11px] leading-relaxed text-slate-400"
          style={{
            maskImage:
              "linear-gradient(transparent, black 12%, black 88%, transparent)",
          }}
        >
          <div
            style={{
              animation: `aegis-feed-scroll ${feedDurationSec}s linear infinite`,
            }}
          >
            {[...FEED_LINES, ...FEED_LINES].map((line, i) => (
              <p key={`${line}-${i}`} className="whitespace-pre-wrap py-0.5">
                {line}
              </p>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
