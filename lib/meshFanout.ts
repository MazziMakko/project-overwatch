"use client";

import type { LocalAudit } from "@/lib/aurameshTypes";
import { broadcastAuditOverPeerMesh } from "@/lib/peerMeshClient";
import { meshBroadcastAudit } from "@/lib/meshSync";

/** Same-tab BroadcastChannel + cross-device PeerJS data channels. */
export function fanOutAuditToMesh(audit: LocalAudit): void {
  meshBroadcastAudit(audit);
  broadcastAuditOverPeerMesh(audit);
}
