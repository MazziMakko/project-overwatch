"use client";

import { useUser } from "@clerk/nextjs";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { NominatimSearchHit } from "@/app/actions/nominatimSearch";
import {
  listPilotAudits,
  type PilotAuditDTO,
} from "@/app/actions/pilotAudits";
import {
  analyzeVulnerability,
  getVaultLeadForOverwatch,
  persistVaultStrategistThread,
  saveLeadToVault,
  strategistFollowUp,
  type AnalyzeVulnerabilityResult,
  type LeadAnalysisPayload,
  type StrategistMessage,
} from "@/app/actions/overwatch";
import { messageFromUnknown } from "@/lib/messageFromUnknown";
import { firstAssistantPitch } from "@/lib/strategistThread";
import { leadCityLabel } from "@/lib/overwatch/leadMapDisplay";
import type { SovereignLeadHarvest } from "@/lib/services/OverpassService";
import { WolfSidebar, type IntelFeedItem } from "./WolfSidebar";
import type { HudMode, MapFocusRequest } from "./OverwatchMap";

const OverwatchMap = dynamic(
  () => import("./OverwatchMap").then((m) => m.OverwatchMap),
  { ssr: false, loading: () => <MapLoading /> },
);

function MapLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-black text-sm text-slate-500">
      Initializing tactical feed…
    </div>
  );
}

function leadToPayload(lead: SovereignLeadHarvest): LeadAnalysisPayload {
  return {
    name: lead.name,
    type: lead.type,
    city: leadCityLabel(lead),
    website: lead.website,
    phone: lead.phone,
    opening_hours: lead.opening_hours,
    lat: lead.lat,
    lng: lead.lng,
    osmMetadata: lead.osmMetadata as Record<string, unknown>,
  };
}

type OverwatchCommandProps = {
  initialVaultLeadId?: string | null;
};

export function OverwatchCommand({
  initialVaultLeadId = null,
}: OverwatchCommandProps) {
  const router = useRouter();
  const { isSignedIn } = useUser();
  const [hudMode, setHudMode] = useState<HudMode>("intel");
  const [pilotAudits, setPilotAudits] = useState<PilotAuditDTO[]>([]);
  const [leads, setLeads] = useState<SovereignLeadHarvest[]>([]);
  const [selected, setSelected] = useState<SovereignLeadHarvest | null>(null);
  const [analysis, setAnalysis] = useState<AnalyzeVulnerabilityResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [harvesting, setHarvesting] = useState(false);
  const [harvestError, setHarvestError] = useState<string | null>(null);
  const [feed, setFeed] = useState<IntelFeedItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [strategistMessages, setStrategistMessages] = useState<StrategistMessage[]>(
    [],
  );
  const [strategistSending, setStrategistSending] = useState(false);
  const [strategistError, setStrategistError] = useState<string | null>(null);
  const [vaultLeadId, setVaultLeadId] = useState<string | null>(null);
  const [mapFocus, setMapFocus] = useState<MapFocusRequest | null>(null);
  const [leadVulnerabilityById, setLeadVulnerabilityById] = useState<
    Record<string, number>
  >({});

  const strategistMessagesRef = useRef<StrategistMessage[]>([]);
  const vaultLeadIdRef = useRef<string | null>(null);

  useEffect(() => {
    strategistMessagesRef.current = strategistMessages;
  }, [strategistMessages]);

  useEffect(() => {
    vaultLeadIdRef.current = vaultLeadId;
  }, [vaultLeadId]);

  const clearMapFocus = useCallback(() => setMapFocus(null), []);

  const selectedId = selected?.id ?? null;

  const pilotBusinessFilter = useMemo(() => {
    const id = selected?.id;
    if (id?.startsWith("vault:")) return id.slice(7);
    return undefined;
  }, [selected?.id]);

  useEffect(() => {
    if (hudMode !== "pilot" || !isSignedIn) {
      setPilotAudits([]);
      return;
    }
    let cancelled = false;
    const tick = async () => {
      try {
        const rows = await listPilotAudits({
          businessId: pilotBusinessFilter,
          limit: 400,
        });
        if (!cancelled) setPilotAudits(rows);
      } catch {
        if (!cancelled) setPilotAudits([]);
      }
    };
    void tick();
    const iv = setInterval(tick, 4500);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [hudMode, isSignedIn, pilotBusinessFilter]);

  useEffect(() => {
    if (hudMode === "pilot") {
      setLeads([]);
      setHarvesting(false);
    }
  }, [hudMode]);

  const runAnalysis = useCallback(
    async (
      lead: SovereignLeadHarvest,
      opts?: { vaultIdForPersist?: string },
    ) => {
      setAnalyzing(true);
      setSaveMessage(null);
      setStrategistError(null);
      try {
        const result = await analyzeVulnerability(leadToPayload(lead));
        setAnalysis(result);
        setLeadVulnerabilityById((prev) => ({
          ...prev,
          [lead.id]: result.vulnerabilityScore,
        }));
        const thread: StrategistMessage[] = [
          { role: "assistant", content: result.pitch },
        ];
        setStrategistMessages(thread);
        strategistMessagesRef.current = thread;
        if (opts?.vaultIdForPersist) {
          await persistVaultStrategistThread({
            vaultLeadId: opts.vaultIdForPersist,
            thread,
          });
        }
        const id = `${lead.id}-${Date.now()}`;
        setFeed((prev) =>
          [
            {
              id,
              title: lead.name,
              subtitle: lead.type,
              body: result.pitch,
              score: result.vulnerabilityScore,
            },
            ...prev,
          ].slice(0, 12),
        );
      } catch (e) {
        setStrategistError(messageFromUnknown(e));
        setAnalysis(null);
        setStrategistMessages([]);
        strategistMessagesRef.current = [];
      } finally {
        setAnalyzing(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!initialVaultLeadId) return;
    let cancelled = false;
    void (async () => {
      try {
        const pack = await getVaultLeadForOverwatch(initialVaultLeadId);
        if (cancelled || !pack) return;
        setVaultLeadId(pack.vaultId);
        vaultLeadIdRef.current = pack.vaultId;
        setSelected(pack.lead);
        setMapFocus({
          lng: pack.lead.lng,
          lat: pack.lead.lat,
          zoom: 17.5,
          pitch: 50,
          bearing: -10,
        });
        if (pack.strategistThread.length > 0) {
          setStrategistMessages(pack.strategistThread);
          strategistMessagesRef.current = pack.strategistThread;
          const pitch = firstAssistantPitch(pack.strategistThread);
          setLeadVulnerabilityById((prev) => ({
            ...prev,
            [pack.lead.id]: pack.vulnerabilityScore,
          }));
          setAnalysis({
            vulnerabilityScore: pack.vulnerabilityScore,
            pitch: pitch || "—",
            rationale: "Hydrated from Sovereign Vault.",
          });
        } else {
          await runAnalysis(pack.lead, { vaultIdForPersist: pack.vaultId });
        }
        router.replace("/overwatch", { scroll: false });
      } catch (e) {
        if (!cancelled) {
          setHarvestError(messageFromUnknown(e));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialVaultLeadId, router, runAnalysis]);

  const handleSelect = useCallback(
    (lead: SovereignLeadHarvest | null) => {
      setSelected(lead);
      setAnalysis(null);
      setStrategistMessages([]);
      strategistMessagesRef.current = [];
      setVaultLeadId(null);
      vaultLeadIdRef.current = null;
      setStrategistError(null);
      if (lead) {
        setMapFocus({
          lng: lead.lng,
          lat: lead.lat,
          zoom: 17.75,
          pitch: 52,
          bearing: -12,
          duration: 1900,
        });
        void runAnalysis(lead);
      }
    },
    [runAnalysis],
  );

  const handleCityFocus = useCallback((lat: number, lng: number) => {
    setSelected(null);
    setAnalysis(null);
    setStrategistMessages([]);
    strategistMessagesRef.current = [];
    setVaultLeadId(null);
    vaultLeadIdRef.current = null;
    setStrategistError(null);
    setMapFocus({
      lng,
      lat,
      zoom: 14.5,
      pitch: 48,
      bearing: -10,
      duration: 2000,
    });
  }, []);

  const handleSearchNavigate = useCallback((hit: NominatimSearchHit) => {
    setSelected(null);
    setAnalysis(null);
    setStrategistMessages([]);
    strategistMessagesRef.current = [];
    setVaultLeadId(null);
    vaultLeadIdRef.current = null;
    setStrategistError(null);
    setMapFocus({
      lng: hit.lng,
      lat: hit.lat,
      zoom: hit.suggestedZoom,
      pitch: 38,
      bearing: -8,
      duration: 2100,
    });
  }, []);

  const handleStrategistSend = useCallback(async (text: string) => {
    if (!selected) return;
    const userMsg: StrategistMessage = { role: "user", content: text };
    const thread = [...strategistMessagesRef.current, userMsg];
    setStrategistMessages(thread);
    strategistMessagesRef.current = thread;
    setStrategistSending(true);
    setStrategistError(null);
    try {
      const { reply } = await strategistFollowUp({
        lead: leadToPayload(selected),
        messages: thread,
        vaultLeadId: vaultLeadIdRef.current,
      });
      setStrategistMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply },
      ]);
    } catch (e) {
      setStrategistError(messageFromUnknown(e));
    } finally {
      setStrategistSending(false);
    }
  }, [selected]);

  const onSaveVault = useCallback(async () => {
    if (!selected || !analysis) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const created = await saveLeadToVault({
        name: selected.name,
        type: selected.type,
        website: selected.website,
        phone: selected.phone,
        vulnerabilityScore: analysis.vulnerabilityScore,
        lat: selected.lat,
        lng: selected.lng,
        osmMetadata: selected.osmMetadata as Record<string, unknown>,
        strategistThread: strategistMessagesRef.current,
      });
      setVaultLeadId(created.id);
      vaultLeadIdRef.current = created.id;
      setSaveMessage("Lead secured to your vault (thread persisted).");
    } catch (e) {
      setSaveMessage(messageFromUnknown(e));
    } finally {
      setSaving(false);
    }
  }, [analysis, selected]);

  const stableOnLeads = useMemo(
    () => (next: SovereignLeadHarvest[]) => setLeads(next),
    [],
  );

  return (
    <div className="flex min-h-0 w-full max-w-full flex-1 flex-col overflow-hidden bg-[#030303]">
      <div className="relative flex min-h-0 w-full flex-1 flex-col">
        <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <div className="rounded border border-white/10 bg-black/50 px-3 py-1.5 font-mono text-[10px] text-slate-400 backdrop-blur-md">
            GHOST-OPS // TERMINAL
          </div>
          <div className="pointer-events-auto flex w-fit rounded border border-white/10 bg-black/70 font-mono text-[9px] uppercase tracking-wide backdrop-blur-md">
            <button
              type="button"
              onClick={() => setHudMode("intel")}
              className={`px-2.5 py-1.5 transition-colors ${
                hudMode === "intel"
                  ? "bg-lime-500/20 text-lime-100"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              Mode // Intel
            </button>
            <button
              type="button"
              onClick={() => setHudMode("pilot")}
              className={`border-l border-white/10 px-2.5 py-1.5 transition-colors ${
                hudMode === "pilot"
                  ? "bg-lime-500/20 text-lime-100"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              Mode // Pilot
            </button>
          </div>
        </div>
        <OverwatchMap
          hudMode={hudMode}
          pilotAudits={pilotAudits}
          onLeads={stableOnLeads}
          onSelect={handleSelect}
          selectedId={selectedId}
          leadVulnerabilityById={leadVulnerabilityById}
          onBoundsBusy={setHarvesting}
          onHarvestError={setHarvestError}
          focusRequest={mapFocus}
          onFocusApplied={clearMapFocus}
        />
      </div>
      <WolfSidebar
        leads={leads}
        hudMode={hudMode}
        onSelectLead={handleSelect}
        onCityFocus={handleCityFocus}
        selected={selected}
        analysis={analysis}
        analyzing={analyzing}
        harvestError={harvestError}
        harvesting={harvesting}
        feed={feed}
        onSaveVault={onSaveVault}
        saving={saving}
        saveMessage={saveMessage}
        strategistMessages={strategistMessages}
        strategistSending={strategistSending}
        strategistError={strategistError}
        onDismissStrategistError={() => setStrategistError(null)}
        onStrategistSend={handleStrategistSend}
        vaultLinked={Boolean(vaultLeadId)}
        onSearchNavigate={handleSearchNavigate}
      />
    </div>
  );
}
