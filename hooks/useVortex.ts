"use client";

import { useEffect, useRef, useState } from "react";
import type {
  VortexHeartbeatPayload,
  VortexState,
} from "@/lib/vortex/vortexMath";

export type { VortexState };

export type UseVortexResult = {
  root: number;
  state: VortexState;
  /** Smoothed 0–1 for HUD / map overlays. */
  pulseIntensity: number;
  /** Doubling-circuit node (1-2-4-8-7-5), advances each second. */
  activeMaterialNode: number;
  /** Last heartbeat timestamp (ms). */
  lastTimestamp: number | null;
};

function createDedicatedWorkerUrl(): URL {
  return new URL("../lib/vortex/VortexWorker.ts", import.meta.url);
}

function createSharedWorkerUrl(): URL {
  return new URL("../lib/vortex/VortexSharedWorker.ts", import.meta.url);
}

/**
 * Off-main-thread 3-6-9 / doubling-circuit resonance. Prefers SharedWorker when
 * available; falls back to a dedicated Worker. Terminates / closes on unmount.
 */
export function useVortex(): UseVortexResult {
  const [root, setRoot] = useState(0);
  const [state, setState] = useState<VortexState>("MATERIAL");
  const [pulseIntensity, setPulseIntensity] = useState(0);
  const [activeMaterialNode, setActiveMaterialNode] = useState(1);
  const [lastTimestamp, setLastTimestamp] = useState<number | null>(null);
  const handleRef = useRef<
    | { mode: "shared"; worker: SharedWorker; onMessage: (e: MessageEvent) => void }
    | { mode: "dedicated"; worker: Worker; onMessage: (e: MessageEvent) => void }
    | null
  >(null);

  useEffect(() => {
    let cancelled = false;

    const onMessage = (e: MessageEvent) => {
      if (cancelled) return;
      if (e.data?.type !== "VORTEX_HEARTBEAT") return;
      const p = e.data.payload as VortexHeartbeatPayload;
      setRoot(p.root);
      setState(p.state);
      setPulseIntensity(p.pulseIntensity);
      setActiveMaterialNode(p.activeMaterialNode);
      setLastTimestamp(p.timestamp);
    };

    const opts: WorkerOptions = { type: "module", name: "vortex" };

    const tryShared = (): boolean => {
      if (typeof SharedWorker === "undefined") return false;
      try {
        const worker = new SharedWorker(createSharedWorkerUrl(), opts);
        worker.port.addEventListener("message", onMessage);
        worker.port.start();
        worker.port.postMessage({ type: "START" });
        handleRef.current = {
          mode: "shared",
          worker,
          onMessage,
        };
        return true;
      } catch {
        return false;
      }
    };

    const useDedicated = () => {
      const worker = new Worker(createDedicatedWorkerUrl(), opts);
      worker.addEventListener("message", onMessage);
      worker.postMessage({ type: "START" });
      handleRef.current = {
        mode: "dedicated",
        worker,
        onMessage,
      };
    };

    if (!tryShared()) {
      useDedicated();
    }

    return () => {
      cancelled = true;
      const h = handleRef.current;
      handleRef.current = null;
      if (!h) return;
      if (h.mode === "shared") {
        try {
          h.worker.port.postMessage({ type: "STOP" });
        } catch {
          /* ignore */
        }
        h.worker.port.removeEventListener("message", h.onMessage);
        h.worker.port.close();
      } else {
        try {
          h.worker.postMessage({ type: "STOP" });
        } catch {
          /* ignore */
        }
        h.worker.removeEventListener("message", h.onMessage);
        h.worker.terminate();
      }
    };
  }, []);

  return {
    root,
    state,
    pulseIntensity,
    activeMaterialNode,
    lastTimestamp,
  };
}
