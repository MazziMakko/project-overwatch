"use server";

import { calculateGasResonance, type GasResonanceResult } from "@/lib/aegis/gasResonance";

export type AegisOracleSuccess = {
  success: true;
  gwei: number;
  resonance: GasResonanceResult;
  lastSync: string;
  network: string;
};

export type AegisOracleFailure = {
  success: false;
  error: string;
  gwei: number;
  resonance: null;
};

export type AegisOracleResult = AegisOracleSuccess | AegisOracleFailure;

type EtherscanGasOracleResult = {
  LastBlock?: string;
  SafeGasPrice?: string;
  ProposeGasPrice?: string;
  FastGasPrice?: string;
};

/**
 * Sacred uplink: Etherscan gas oracle → 369 resonance. Fetch cached 300s (Root 3 cadence).
 */
export async function fetchAegisGasOracle(): Promise<AegisOracleResult> {
  const apiKey = process.env.ETHERSCAN_API_KEY?.trim();
  if (!apiKey) {
    return {
      success: false,
      error: "ETHERSCAN_API_KEY not configured",
      gwei: 0,
      resonance: null,
    };
  }

  try {
    const url = new URL("https://api.etherscan.io/api");
    url.searchParams.set("module", "gastracker");
    url.searchParams.set("action", "gasoracle");
    url.searchParams.set("apikey", apiKey);

    const res = await fetch(url.toString(), {
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      throw new Error(`Oracle HTTP ${res.status}`);
    }

    const data = (await res.json()) as {
      status?: string;
      message?: string;
      result?: EtherscanGasOracleResult | string;
    };

    if (data.status !== "1" || data.result == null) {
      throw new Error(
        typeof data.message === "string" ? data.message : "Oracle uplink failed",
      );
    }

    const result = data.result;
    if (typeof result === "string") {
      throw new Error("Unexpected oracle result shape");
    }

    const propose = result.ProposeGasPrice;
    if (propose == null) {
      throw new Error("Missing ProposeGasPrice");
    }

    const gwei = parseInt(String(propose), 10);
    if (!Number.isFinite(gwei) || gwei < 0) {
      throw new Error("Invalid ProposeGasPrice");
    }

    const resonance = calculateGasResonance(gwei);

    return {
      success: true,
      gwei,
      resonance,
      lastSync: new Date().toISOString(),
      network: "Ethereum Mainnet",
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Oracle uplink failed";
    console.error("[AEGIS_ORACLE]", msg);
    return {
      success: false,
      error: msg,
      gwei: 0,
      resonance: null,
    };
  }
}
