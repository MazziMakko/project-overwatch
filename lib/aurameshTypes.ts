export type LocalAudit = {
  /** Client queue key (not persisted server-side) */
  localId: string;
  businessId: string;
  technicianName: string | null;
  payload: Record<string, unknown>;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  photoUrl: string | null;
  capturedAt: string;
  cryptoHash: string;
};

/** Payload sent to the server ledger (no localId). */
export type SyncAuditPayload = Omit<LocalAudit, "localId">;
