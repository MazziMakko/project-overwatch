/// <reference lib="webworker" />

import { computeVortexHeartbeat } from "./vortexMath";

/**
 * SOVEREIGN VORTEX ENGINE (Dedicated Worker)
 * Tesla 369 + doubling circuit; heartbeats every 100ms.
 */

export type {};

const BEAT_MS = 100;

let tick: ReturnType<typeof setInterval> | null = null;

function emit() {
  const payload = computeVortexHeartbeat(Date.now());
  self.postMessage({
    type: "VORTEX_HEARTBEAT",
    payload,
  });
}

self.onmessage = (e: MessageEvent<{ type?: string }>) => {
  const cmd = e.data?.type;
  if (cmd === "STOP") {
    if (tick != null) {
      clearInterval(tick);
      tick = null;
    }
    return;
  }
  if (cmd === "START" || cmd === "CALCULATE_RESONANCE") {
    if (tick != null) clearInterval(tick);
    emit();
    tick = setInterval(emit, BEAT_MS);
  }
};
