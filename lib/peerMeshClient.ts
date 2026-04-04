"use client";

import type { LocalAudit } from "@/lib/aurameshTypes";
import { messageFromUnknown } from "@/lib/messageFromUnknown";
import type { DataConnection, Peer, PeerOptions } from "peerjs";

const CHANNEL_LABEL = "auramesh_ledger_v1";

type WireMessage = { type: "AURAMESH_AUDIT"; payload: LocalAudit };

let peer: Peer | null = null;
const connections = new Map<string, DataConnection>();
let auditListener: ((audit: LocalAudit) => void) | null = null;

export function setPeerMeshAuditListener(fn: ((audit: LocalAudit) => void) | null) {
  auditListener = fn;
}

export function broadcastAuditOverPeerMesh(audit: LocalAudit): void {
  const msg: WireMessage = { type: "AURAMESH_AUDIT", payload: audit };
  for (const conn of connections.values()) {
    if (!conn.open) continue;
    try {
      conn.send(msg);
    } catch {
      /* ignore send errors */
    }
  }
}

function isLocalAudit(v: unknown): v is LocalAudit {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.cryptoHash === "string" &&
    o.cryptoHash.length === 64 &&
    typeof o.businessId === "string" &&
    typeof o.capturedAt === "string"
  );
}

function attachConnection(conn: DataConnection) {
  conn.on("open", () => {
    connections.set(conn.peer, conn);
  });
  conn.on("data", (data: unknown) => {
    if (!data || typeof data !== "object") return;
    const d = data as { type?: string; payload?: unknown };
    if (d.type === "AURAMESH_AUDIT" && isLocalAudit(d.payload)) {
      auditListener?.(d.payload);
    }
  });
  conn.on("close", () => {
    connections.delete(conn.peer);
  });
  conn.on("error", () => {
    connections.delete(conn.peer);
  });
}

export function destroyPeerMesh(): void {
  for (const c of connections.values()) {
    try {
      c.close();
    } catch {
      /* ignore */
    }
  }
  connections.clear();
  if (peer && !peer.destroyed) {
    try {
      peer.destroy();
    } catch {
      /* ignore */
    }
  }
  peer = null;
}

export type PeerMeshHooks = {
  onOpen: (id: string) => void;
  onError: (message: string) => void;
  onDisconnected: () => void;
};

export async function initPeerMesh(
  signal: { host: string; port: number; path: string; secure: boolean },
  hooks: PeerMeshHooks,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  destroyPeerMesh();

  try {
    const { Peer: PeerCtor } = await import("peerjs");
    const opts: PeerOptions = {
      host: signal.host,
      port: signal.port,
      path: signal.path,
      secure: signal.secure,
      debug: 1,
    };
    const p = new PeerCtor(opts);
    peer = p;

    p.on("open", (id: string) => {
      hooks.onOpen(id);
    });
    p.on("connection", (conn: DataConnection) => {
      attachConnection(conn);
    });
    p.on("error", (err: { message?: string }) => {
      hooks.onError(err?.message ?? "Peer error");
    });
    p.on("disconnected", () => {
      hooks.onDisconnected();
    });

    return { ok: true };
  } catch (e) {
    return { ok: false, reason: messageFromUnknown(e) };
  }
}

export function dialRemotePeer(remoteId: string): string | null {
  if (!peer || peer.destroyed || !peer.open) {
    return "Signaling not ready";
  }
  const trimmed = remoteId.trim();
  if (!trimmed) return "Enter a peer id";

  for (const c of connections.values()) {
    if (c.peer === trimmed && c.open) return null;
  }

  try {
    const conn = peer.connect(trimmed, {
      label: CHANNEL_LABEL,
      serialization: "json",
      reliable: true,
    });
    attachConnection(conn);
    return null;
  } catch (e) {
    return messageFromUnknown(e);
  }
}

export function getPeerMeshDebug() {
  return {
    brokerReady: Boolean(peer?.open),
    myId: peer?.id ?? null,
    dataPeers: [...connections.keys()],
  };
}
