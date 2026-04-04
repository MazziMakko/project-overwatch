/**
 * Browser-only: resolves PeerServer (signaling) endpoints.
 * Offline mesh requires a PeerServer reachable on the local hotspot/LAN
 * (e.g. `npx peerjs --port 9000 --host 0.0.0.0` on the gateway machine).
 */

export type PeerMeshSignalConfig = {
  host: string;
  port: number;
  path: string;
  secure: boolean;
};

const CLOUD: PeerMeshSignalConfig = {
  host: "0.peerjs.com",
  port: 443,
  path: "/",
  secure: true,
};

function normalizePath(p: string): string {
  const withSlash = p.startsWith("/") ? p : `/${p}`;
  return withSlash.endsWith("/") ? withSlash : `${withSlash}/`;
}

function readSessionOverride(): PeerMeshSignalConfig | null {
  if (typeof window === "undefined") return null;
  const host = sessionStorage.getItem("auramesh_signal_host");
  if (!host?.trim()) return null;
  const portRaw = sessionStorage.getItem("auramesh_signal_port");
  const pathRaw = sessionStorage.getItem("auramesh_signal_path");
  const secureRaw = sessionStorage.getItem("auramesh_signal_secure");
  return {
    host: host.trim(),
    port: portRaw ? parseInt(portRaw, 10) || 9000 : 9000,
    path: pathRaw ? normalizePath(pathRaw) : normalizePath("/"),
    secure: secureRaw === "1" || secureRaw === "true",
  };
}

/**
 * When offline: only LAN/hotspot signaling works — returns null if nothing configured.
 * When online: uses session/env local server if set, otherwise PeerJS cloud.
 */
export function resolvePeerSignalConfig(online: boolean): PeerMeshSignalConfig | null {
  const session = readSessionOverride();
  const envHost = process.env.NEXT_PUBLIC_AURA_MESH_SIGNAL_HOST?.trim();
  const envPort = parseInt(
    process.env.NEXT_PUBLIC_AURA_MESH_SIGNAL_PORT || "9000",
    10,
  );
  const envPath = normalizePath(
    process.env.NEXT_PUBLIC_AURA_MESH_SIGNAL_PATH || "/",
  );
  const envSecure = process.env.NEXT_PUBLIC_AURA_MESH_SIGNAL_SECURE === "true";

  const localFromEnv: PeerMeshSignalConfig | null = envHost
    ? {
        host: envHost,
        port: Number.isFinite(envPort) ? envPort : 9000,
        path: envPath,
        secure: envSecure,
      }
    : null;

  const localMerged: PeerMeshSignalConfig | null = session ?? localFromEnv;

  if (!online) {
    return localMerged;
  }
  if (localMerged) {
    return localMerged;
  }
  return CLOUD;
}

export function persistSignalOverride(config: PeerMeshSignalConfig): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem("auramesh_signal_host", config.host);
  sessionStorage.setItem("auramesh_signal_port", String(config.port));
  sessionStorage.setItem("auramesh_signal_path", config.path);
  sessionStorage.setItem("auramesh_signal_secure", config.secure ? "1" : "0");
}

export function clearSignalOverride(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem("auramesh_signal_host");
  sessionStorage.removeItem("auramesh_signal_port");
  sessionStorage.removeItem("auramesh_signal_path");
  sessionStorage.removeItem("auramesh_signal_secure");
}
