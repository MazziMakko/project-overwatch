"use client";

import { useEffect } from "react";
import { useMeshCoordinator } from "@/hooks/useMeshCoordinator";
import { setPeerMeshAuditListener } from "@/lib/peerMeshClient";
import { useAuditStore } from "@/store/useAuditStore";

const LIME = "#84cc16";
const BG = "#0a0a0a";

function phaseLabel(
  phase: string,
  online: boolean,
): { text: string; pulse: boolean } {
  if (!online) {
    return { text: "DEAD ZONE · LOCAL SIGNAL REQUIRED", pulse: true };
  }
  switch (phase) {
    case "open":
      return { text: "WEBRTC MESH · LIVE", pulse: false };
    case "signaling":
      return { text: "SIGNALING · HANDSHAKE", pulse: true };
    case "needs-config":
      return { text: "HANDSHAKE FALLBACK · SET SIGNAL HOST", pulse: true };
    case "error":
      return { text: "MESH FAULT · RETRY OR FALLBACK", pulse: true };
    default:
      return { text: "MESH · STANDBY", pulse: false };
  }
}

export function MeshCoordinator() {
  const {
    online,
    phase,
    myId,
    lastError,
    dataPeers,
    dialTarget,
    setDialTarget,
    dialError,
    dial,
    hostInput,
    setHostInput,
    portInput,
    setPortInput,
    pathInput,
    setPathInput,
    secureInput,
    setSecureInput,
    applyManualSignal,
    clearManualAndRebootstrap,
    rebootstrap,
  } = useMeshCoordinator();

  useEffect(() => {
    setPeerMeshAuditListener((audit) => {
      useAuditStore.getState().mergeFromMesh(audit);
    });
    return () => setPeerMeshAuditListener(null);
  }, []);

  const { text: statusText, pulse } = phaseLabel(phase, online);

  return (
    <section
      className="rounded-lg border-2 p-4"
      style={{ borderColor: `${LIME}55`, backgroundColor: BG }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p
          className={`text-[10px] font-bold uppercase tracking-widest ${pulse ? "animate-pulse" : ""}`}
          style={{ color: LIME }}
        >
          {statusText}
        </p>
        <span className="text-[9px] uppercase text-neutral-500">
          {online ? "WAN OK" : "NO INTERNET"}
        </span>
      </div>

      <div className="mt-3 space-y-1 text-[11px] text-neutral-400">
        <p>
          <span className="text-neutral-600">MY PEER ID · </span>
          <span className="break-all font-medium text-white">
            {myId ?? "—"}
          </span>
        </p>
        <p>
          <span className="text-neutral-600">DATA PEERS · </span>
          {dataPeers.length === 0
            ? "none"
            : dataPeers.join(", ")}
        </p>
      </div>

      {(phase === "needs-config" || phase === "error") && (
        <div className="mt-4 space-y-2 border-t border-neutral-800 pt-4">
          <p className="text-[10px] uppercase tracking-wider text-neutral-500">
            Hotspot / LAN PeerServer (handshake fallback)
          </p>
          <p className="text-[10px] leading-relaxed text-neutral-600">
            Run on the gateway machine:{" "}
            <code className="text-neutral-400">
              npx peerjs --port 9000 --host 0.0.0.0
            </code>{" "}
            then enter its Wi‑Fi IP below.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block">
              <span className="text-[9px] uppercase text-neutral-600">
                Host
              </span>
              <input
                value={hostInput}
                onChange={(e) => setHostInput(e.target.value)}
                placeholder="192.168.43.1"
                className="mt-1 w-full border border-neutral-700 bg-black px-2 py-1.5 text-xs text-white"
              />
            </label>
            <label className="block">
              <span className="text-[9px] uppercase text-neutral-600">
                Port
              </span>
              <input
                value={portInput}
                onChange={(e) => setPortInput(e.target.value)}
                className="mt-1 w-full border border-neutral-700 bg-black px-2 py-1.5 text-xs text-white"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-[9px] uppercase text-neutral-600">
                Path
              </span>
              <input
                value={pathInput}
                onChange={(e) => setPathInput(e.target.value)}
                placeholder="/"
                className="mt-1 w-full border border-neutral-700 bg-black px-2 py-1.5 text-xs text-white"
              />
            </label>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-[10px] text-neutral-400">
            <input
              type="checkbox"
              checked={secureInput}
              onChange={(e) => setSecureInput(e.target.checked)}
              className="accent-[#84cc16]"
            />
            TLS (wss) — use on HTTPS PeerServer only
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void applyManualSignal()}
              className="border px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-black"
              style={{ backgroundColor: LIME, borderColor: LIME }}
            >
              Apply & reconnect
            </button>
            <button
              type="button"
              onClick={() => void clearManualAndRebootstrap()}
              className="border border-neutral-600 px-3 py-2 text-[10px] uppercase tracking-wider text-neutral-300"
            >
              Clear override
            </button>
            <button
              type="button"
              onClick={() => void rebootstrap()}
              className="border border-neutral-600 px-3 py-2 text-[10px] uppercase tracking-wider text-neutral-300"
            >
              Retry signaling
            </button>
          </div>
        </div>
      )}

      {phase === "open" && (
        <div className="mt-4 space-y-2 border-t border-neutral-800 pt-4">
          <p className="text-[10px] uppercase tracking-wider text-neutral-500">
            Dial remote peer
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={dialTarget}
              onChange={(e) => setDialTarget(e.target.value)}
              placeholder="Other tablet Peer ID"
              className="min-w-0 flex-1 border border-neutral-700 bg-black px-2 py-2 text-xs text-white"
            />
            <button
              type="button"
              onClick={() => dial()}
              className="border px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white"
              style={{ borderColor: LIME }}
            >
              Connect
            </button>
          </div>
          {dialError && (
            <p className="text-[10px] text-red-400">{dialError}</p>
          )}
        </div>
      )}

      {lastError && (
        <p className="mt-3 text-[10px] text-red-400">{lastError}</p>
      )}

      <p className="mt-3 text-[9px] leading-relaxed text-neutral-600">
        BroadcastChannel = same device tabs. PeerJS + LAN PeerServer = Tablet A ↔
        Tablet B in a dead zone. Share &quot;My Peer ID&quot; or type the other
        tablet&apos;s id, then Connect.
      </p>
    </section>
  );
}
