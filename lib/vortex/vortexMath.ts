/**
 * Pure 3-6-9 / doubling-circuit math — safe to import from any worker bundle.
 */

export type VortexState = "MATERIAL" | "CONTROL" | "SOURCE";

export type VortexHeartbeatPayload = {
  root: number;
  state: VortexState;
  activeMaterialNode: number;
  timestamp: number;
  /** Base band intensity (SOURCE > CONTROL > MATERIAL). */
  intensity: number;
  /** Smoothed 0–1 value for UI (phase within the 100ms beat). */
  pulseIntensity: number;
};

const DOUBLING_CIRCUIT = [1, 2, 4, 8, 7, 5] as const;
const CIRCUIT_MS = 1000;
const BEAT_MS = 100;

function classifyState(root: number): VortexState {
  if (root === 9) return "SOURCE";
  if (root === 3 || root === 6) return "CONTROL";
  return "MATERIAL";
}

function baseIntensity(state: VortexState): number {
  if (state === "SOURCE") return 1;
  if (state === "CONTROL") return 0.6;
  return 0.3;
}

/**
 * Digital root in 1..9: DR(n) = 1 + ((n - 1) % 9)
 */
export function computeVortexHeartbeat(timestamp: number): VortexHeartbeatPayload {
  const root = 1 + ((timestamp - 1) % 9);
  const state = classifyState(root);
  const circuitIndex = Math.floor(timestamp / CIRCUIT_MS) % DOUBLING_CIRCUIT.length;
  const activeMaterialNode = DOUBLING_CIRCUIT[circuitIndex];
  const intensity = baseIntensity(state);
  const phaseInBeat = (timestamp % BEAT_MS) / BEAT_MS;
  const pulseIntensity = Math.min(
    1,
    intensity * (0.82 + 0.18 * phaseInBeat),
  );

  return {
    root,
    state,
    activeMaterialNode,
    timestamp,
    intensity,
    pulseIntensity,
  };
}
