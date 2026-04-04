"use client";

import { useCallback, useEffect, useState } from "react";
import {
  destroyPeerMesh,
  dialRemotePeer,
  getPeerMeshDebug,
  initPeerMesh,
} from "@/lib/peerMeshClient";
import {
  clearSignalOverride,
  persistSignalOverride,
  resolvePeerSignalConfig,
} from "@/lib/peerMeshConfig";

export type MeshPhase = "idle" | "signaling" | "open" | "error" | "needs-config";

export function useMeshCoordinator() {
  const [online, setOnline] = useState(
    () => (typeof navigator !== "undefined" ? navigator.onLine : true),
  );
  const [phase, setPhase] = useState<MeshPhase>("idle");
  const [myId, setMyId] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [dataPeers, setDataPeers] = useState<string[]>([]);
  const [dialTarget, setDialTarget] = useState("");
  const [dialError, setDialError] = useState<string | null>(null);

  const [hostInput, setHostInput] = useState("");
  const [portInput, setPortInput] = useState("9000");
  const [pathInput, setPathInput] = useState("/");
  const [secureInput, setSecureInput] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const h = sessionStorage.getItem("auramesh_signal_host");
    if (h) setHostInput(h);
    const pt = sessionStorage.getItem("auramesh_signal_port");
    if (pt) setPortInput(pt);
    const ph = sessionStorage.getItem("auramesh_signal_path");
    if (ph) setPathInput(ph);
    const sc = sessionStorage.getItem("auramesh_signal_secure");
    if (sc === "1" || sc === "true") setSecureInput(true);
  }, []);

  const bootstrap = useCallback(async () => {
    const config = resolvePeerSignalConfig(online);
    if (!config) {
      setPhase("needs-config");
      setMyId(null);
      return;
    }
    setPhase("signaling");
    setLastError(null);
    const result = await initPeerMesh(config, {
      onOpen: (id) => {
        setMyId(id);
        setPhase("open");
      },
      onError: (msg) => {
        setLastError(msg);
        setPhase("error");
      },
      onDisconnected: () => {
        setPhase("signaling");
        setMyId(null);
      },
    });
    if (!result.ok) {
      setLastError(result.reason);
      setPhase("error");
    }
  }, [online]);

  useEffect(() => {
    void bootstrap();
    return () => {
      destroyPeerMesh();
    };
  }, [bootstrap]);

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

  useEffect(() => {
    if (phase !== "open") return;
    const sync = () => setDataPeers([...getPeerMeshDebug().dataPeers]);
    sync();
    const t = setInterval(sync, 1200);
    return () => clearInterval(t);
  }, [phase]);

  const applyManualSignal = useCallback(async () => {
    const host = hostInput.trim();
    if (!host) return;
    const port = parseInt(portInput, 10) || 9000;
    let path = pathInput.startsWith("/") ? pathInput : `/${pathInput}`;
    path = path.endsWith("/") ? path : `${path}/`;
    persistSignalOverride({
      host,
      port,
      path,
      secure: secureInput,
    });
    destroyPeerMesh();
    await bootstrap();
  }, [bootstrap, hostInput, portInput, pathInput, secureInput]);

  const clearManualAndRebootstrap = useCallback(async () => {
    clearSignalOverride();
    destroyPeerMesh();
    await bootstrap();
  }, [bootstrap]);

  const dial = useCallback(() => {
    setDialError(null);
    const err = dialRemotePeer(dialTarget);
    if (err) setDialError(err);
  }, [dialTarget]);

  return {
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
    rebootstrap: bootstrap,
  };
}
