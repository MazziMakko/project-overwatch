"use client";

import type { LocalAudit } from "@/lib/aurameshTypes";

const CHANNEL_NAME = "auramesh_mesh_net";

type MeshMessage = { type: "AUDIT"; payload: LocalAudit };

const listeners = new Set<(audit: LocalAudit) => void>();
let channel: BroadcastChannel | null = null;

function ensureChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return null;
  }
  if (!channel) {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (ev: MessageEvent<MeshMessage>) => {
      if (ev.data?.type !== "AUDIT" || !ev.data.payload) return;
      listeners.forEach((fn) => {
        try {
          fn(ev.data.payload);
        } catch {
          /* ignore subscriber errors */
        }
      });
    };
  }
  return channel;
}

export function meshBroadcastAudit(audit: LocalAudit): void {
  const ch = ensureChannel();
  ch?.postMessage({ type: "AUDIT", payload: audit } satisfies MeshMessage);
}

export function meshSubscribeAudits(
  handler: (audit: LocalAudit) => void,
): () => void {
  ensureChannel();
  listeners.add(handler);
  return () => {
    listeners.delete(handler);
  };
}
