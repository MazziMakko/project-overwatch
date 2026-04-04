"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { LocalAudit } from "@/lib/aurameshTypes";
import { computeAuditCryptoHash, type AuditHashMaterial } from "@/lib/auditIntegrity";
import { fanOutAuditToMesh } from "@/lib/meshFanout";
import { meshSubscribeAudits } from "@/lib/meshSync";
import { syncAuditsToLedger } from "@/app/actions/auramesh";
import { messageFromUnknown } from "@/lib/messageFromUnknown";

export type { LocalAudit } from "@/lib/aurameshTypes";

type EnqueueInput = {
  businessId: string;
  payload: Record<string, unknown>;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  technicianName?: string | null;
  photoUrl?: string | null;
};

type AuditStore = {
  offlineQueue: LocalAudit[];
  isSyncing: boolean;
  enqueueAudit: (input: EnqueueInput) => Promise<LocalAudit>;
  clearQueue: (cryptoHashes: string[]) => void;
  setSyncing: (v: boolean) => void;
  mergeFromMesh: (audit: LocalAudit) => void;
  syncQueue: () => Promise<
    | { ok: true; ids: string[] }
    | { ok: false; error: string }
  >;
};

function buildMaterial(
  input: EnqueueInput,
  capturedAt: string,
): AuditHashMaterial {
  return {
    businessId: input.businessId,
    technicianName: input.technicianName ?? null,
    payload: input.payload,
    latitude: input.latitude,
    longitude: input.longitude,
    accuracy: input.accuracy,
    photoUrl: input.photoUrl ?? null,
    capturedAt,
  };
}

export const useAuditStore = create<AuditStore>()(
  persist(
    (set, get) => ({
      offlineQueue: [],
      isSyncing: false,

      enqueueAudit: async (input) => {
        const capturedAt = new Date().toISOString();
        const material = buildMaterial(input, capturedAt);
        const cryptoHash = await computeAuditCryptoHash(material);
        const audit: LocalAudit = {
          localId:
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          businessId: input.businessId,
          technicianName: input.technicianName ?? null,
          payload: input.payload,
          latitude: input.latitude,
          longitude: input.longitude,
          accuracy: input.accuracy,
          photoUrl: input.photoUrl ?? null,
          capturedAt,
          cryptoHash,
        };

        set((s) => {
          if (s.offlineQueue.some((a) => a.cryptoHash === audit.cryptoHash)) {
            return s;
          }
          return { offlineQueue: [...s.offlineQueue, audit] };
        });

        fanOutAuditToMesh(audit);
        return audit;
      },

      clearQueue: (cryptoHashes) => {
        const setHashes = new Set(cryptoHashes);
        set((s) => ({
          offlineQueue: s.offlineQueue.filter((a) => !setHashes.has(a.cryptoHash)),
        }));
      },

      setSyncing: (v) => set({ isSyncing: v }),

      mergeFromMesh: (audit) => {
        set((s) => {
          if (s.offlineQueue.some((a) => a.cryptoHash === audit.cryptoHash)) {
            return s;
          }
          return { offlineQueue: [...s.offlineQueue, audit] };
        });
      },

      syncQueue: async () => {
        const queue = get().offlineQueue;
        if (queue.length === 0) {
          return { ok: true, ids: [] };
        }
        set({ isSyncing: true });
        try {
          const payload = queue.map(({ localId: _l, ...rest }) => rest);
          const result = await syncAuditsToLedger(payload);
          if (result.ok) {
            get().clearQueue(queue.map((a) => a.cryptoHash));
          }
          return result;
        } catch (e) {
          return { ok: false as const, error: messageFromUnknown(e) };
        } finally {
          set({ isSyncing: false });
        }
      },
    }),
    {
      name: "auramesh-audit-queue",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ offlineQueue: state.offlineQueue }),
    },
  ),
);

declare global {
  interface Window {
    __aurameshMeshWired?: boolean;
  }
}

if (typeof window !== "undefined" && !window.__aurameshMeshWired) {
  window.__aurameshMeshWired = true;
  meshSubscribeAudits((audit) => {
    useAuditStore.getState().mergeFromMesh(audit);
  });
}
