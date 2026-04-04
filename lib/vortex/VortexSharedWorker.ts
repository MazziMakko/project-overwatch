/// <reference lib="webworker" />

import { computeVortexHeartbeat } from "./vortexMath";

/**
 * SharedWorker entry: one interval, broadcast to all connected ports.
 */

export type {};

const BEAT_MS = 100;

let tick: ReturnType<typeof setInterval> | null = null;
const ports: MessagePort[] = [];

function broadcast() {
  const payload = computeVortexHeartbeat(Date.now());
  const msg = {
    type: "VORTEX_HEARTBEAT" as const,
    payload,
  };
  for (const port of ports) {
    try {
      port.postMessage(msg);
    } catch {
      /* port may be closed */
    }
  }
}

function ensureTick() {
  if (tick != null) return;
  broadcast();
  tick = setInterval(broadcast, BEAT_MS);
}

function stopTickIfIdle() {
  if (ports.length > 0 || tick == null) return;
  clearInterval(tick);
  tick = null;
}

const swSelf = self as unknown as SharedWorkerGlobalScope;

swSelf.onconnect = (event: MessageEvent) => {
  const port = event.ports[0];
  ports.push(port);

  port.onmessage = (e: MessageEvent<{ type?: string }>) => {
    const cmd = e.data?.type;
    if (cmd === "STOP") {
      const idx = ports.indexOf(port);
      if (idx >= 0) ports.splice(idx, 1);
      port.close();
      stopTickIfIdle();
      return;
    }
    if (cmd === "START" || cmd === "CALCULATE_RESONANCE") {
      ensureTick();
    }
  };

  port.start();
  ensureTick();
};
