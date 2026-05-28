import { AiBrain01Icon, MapsGlobal01Icon } from "@hugeicons/core-free-icons"
import { useMemo, useState } from "react"

import { AiAnalysisPanel } from "@/components/app/AiAnalysisPanel"
import { useDashboardData } from "@/components/app/dashboard-data"
import { ProductIcon } from "@/components/app/ProductIcon"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/features/auth/auth-store"
import type { AuthUser, DropletRole } from "@/features/auth/types"
import { useAiAnalyses, useAiAnalysis } from "@/hooks/use-droplet-data"
import type { AiAnalysisRecord, AiAnalysisRequest, Region } from "@/services/types"
import { waterSystems } from "@/services/water-systems"

type AiScopeType = "region" | "state"

export function AiPage() {
  const { regionReadModelLoading, regions, snapshots } = useDashboardData()
  const [scopeType, setScopeType] = useState<AiScopeType>("state")
  const [selectedStateId, setSelectedStateId] = useState("")
  const [selectedRegionId, setSelectedRegionId] = useState(waterSystems[0]?.id ?? "")
  const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(null)
  const analysis = useAiAnalysis()
  const analysisHistory = useAiAnalyses()
  const user = useAuthStore((state) => state.user)
  const activeRole = activePersonaRole(user) ?? "citizen"
  const effectiveStateId = selectedStateId || regions[0]?.id || ""
  const selectedWaterSystem =
    waterSystems.find((system) => system.id === selectedRegionId) ?? waterSystems[0]
  const selectedRegions = useMemo(() => {
    if (scopeType === "state") {
      return regions.filter((region) => region.id === effectiveStateId)
    }

    return regions.filter((region) => selectedWaterSystem?.stateIds.includes(region.id))
  }, [effectiveStateId, regions, scopeType, selectedWaterSystem])
  const selectedSnapshots = useMemo(
    () =>
      selectedRegions
        .map((region) => snapshots.find((snapshot) => snapshot.regionId === region.id))
        .filter((snapshot): snapshot is NonNullable<typeof snapshot> =>
          Boolean(snapshot)
        ),
    [selectedRegions, snapshots]
  )
  const analysisRequest = buildAnalysisRequest(
    scopeType,
    selectedRegions,
    selectedSnapshots,
    selectedWaterSystem,
    effectiveStateId,
    activeRole
  )
  const canAnalyze =
    Boolean(analysisRequest) && !regionReadModelLoading && !analysis.isPending
  const historyItems = analysisHistory.data ?? []
  const selectedHistory =
    historyItems.find((item) => item.id === selectedHistoryId) ?? null

  return (
    <main className="mx-auto grid max-w-7xl gap-4 p-4 pb-24 md:p-6 lg:pb-6">
      <section className="rounded-md border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <ProductIcon icon={AiBrain01Icon} size={18} />
            </span>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold">AI</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Select one state or a full water region. Droplet will package the
                latest water-source, rainfall, evaporation, confidence, and weather
                signals, then ask Gemini for a short role-aware analysis.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="grid h-fit gap-4">
          <section className="grid gap-4 rounded-md border bg-card p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <ProductIcon icon={MapsGlobal01Icon} size={18} />
              </span>
              <div className="min-w-0">
                <h2 className="font-medium">Analysis scope</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedSnapshots.length} state snapshot
                  {selectedSnapshots.length === 1 ? "" : "s"} ready
                </p>
              </div>
            </div>

            <div
              aria-label="AI analysis scope"
              className="grid gap-2 rounded-md border bg-background p-1"
              role="group"
            >
              {(["state", "region"] as const).map((type) => (
                <button
                  aria-pressed={scopeType === type}
                  className={[
                    "rounded-sm px-3 py-2 text-sm font-medium text-muted-foreground transition-colors",
                    scopeType === type
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent hover:text-foreground",
                  ].join(" ")}
                  key={type}
                  onClick={() => setScopeType(type)}
                  type="button"
                >
                  {type === "state" ? "Single state" : "Water region"}
                </button>
              ))}
            </div>

            {scopeType === "state" ? (
              <label className="grid gap-2 text-sm font-medium">
                State
                <select
                  className="h-11 rounded-md border bg-background px-3 text-sm font-normal"
                  value={effectiveStateId}
                  onChange={(event) => setSelectedStateId(event.target.value)}
                >
                  {regions.map((region) => (
                    <option key={region.id} value={region.id}>
                      {region.name} · {region.basin}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="grid gap-2 text-sm font-medium">
                Water region
                <select
                  className="h-11 rounded-md border bg-background px-3 text-sm font-normal"
                  value={selectedWaterSystem?.id ?? ""}
                  onChange={(event) => setSelectedRegionId(event.target.value)}
                >
                  {waterSystems.map((system) => (
                    <option key={system.id} value={system.id}>
                      {system.name} · {system.stateIds.length} states
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="rounded-md border bg-background p-3">
              <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                Included states
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedRegions.map((region) => (
                  <span
                    className="rounded-md border bg-card px-2 py-1 text-xs font-medium"
                    key={region.id}
                  >
                    {region.name}
                  </span>
                ))}
              </div>
            </div>

            <Button
              className="h-14 w-full text-base font-semibold shadow-md shadow-primary/20"
              disabled={!canAnalyze}
              onClick={() => {
                setSelectedHistoryId(null)
                if (analysisRequest) {
                  analysis.mutate(analysisRequest)
                }
              }}
            >
              <ProductIcon icon={AiBrain01Icon} size={19} />
              {analysis.isPending ? "Analyzing water state" : "Start AI analysis"}
            </Button>
          </section>

          <section className="grid gap-3 rounded-md border bg-card p-4 shadow-sm">
            <div>
              <h2 className="font-medium">Earlier analyses</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Saved Gemini results for this user
              </p>
            </div>

            <label className="grid gap-2 text-sm font-medium">
              History
              <select
                className="h-11 rounded-md border bg-background px-3 text-sm font-normal"
                disabled={analysisHistory.isPending || historyItems.length === 0}
                value={selectedHistoryId ?? ""}
                onChange={(event) =>
                  setSelectedHistoryId(
                    event.target.value ? Number(event.target.value) : null
                  )
                }
              >
                <option value="">Current analysis</option>
                {historyItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {historyLabel(item)}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid max-h-[420px] gap-2 overflow-y-auto">
              {analysisHistory.isPending ? (
                <div className="rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
                  Loading history
                </div>
              ) : historyItems.length ? (
                historyItems.map((item) => (
                  <button
                    aria-pressed={selectedHistoryId === item.id}
                    className={[
                      "rounded-md border bg-background px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                      selectedHistoryId === item.id ? "border-primary bg-accent" : "",
                    ].join(" ")}
                    key={item.id}
                    onClick={() => setSelectedHistoryId(item.id)}
                    type="button"
                  >
                    <span className="block truncate font-medium">
                      {item.scope.label}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {formatHistoryDate(item.createdAt)} · {item.regionCount} state
                      {item.regionCount === 1 ? "" : "s"}
                    </span>
                  </button>
                ))
              ) : (
                <div className="rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
                  No saved analyses yet
                </div>
              )}
            </div>
          </section>
        </aside>

        <div className="min-w-0">
          {selectedHistory ? (
            <div className="mb-3 rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground">
              Viewing saved analysis from {formatHistoryDate(selectedHistory.createdAt)}
            </div>
          ) : null}
          <AiAnalysisPanel
            analysis={analysis}
            request={analysisRequest}
            showAction={false}
            snapshotLoading={regionReadModelLoading}
            storedAnalysis={selectedHistory?.analysis ?? null}
          />
        </div>
      </div>
    </main>
  )
}

function historyLabel(item: AiAnalysisRecord) {
  return `${item.scope.label} · ${formatHistoryDate(item.createdAt)}`
}

function formatHistoryDate(timestamp: string) {
  return new Date(timestamp).toLocaleString("en-DE", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  })
}

function activePersonaRole(user: AuthUser | null): DropletRole | null {
  if (!user) {
    return null
  }

  const identity = `${user.email ?? ""} ${user.name}`.toLowerCase()

  if (identity.includes("municipality") && user.roles.includes("municipality")) {
    return "municipality"
  }

  if (identity.includes("analyst") && user.roles.includes("analyst")) {
    return "analyst"
  }

  if (user.roles.includes("municipality")) {
    return "municipality"
  }

  if (user.roles.includes("analyst")) {
    return "analyst"
  }

  if (user.roles.includes("citizen")) {
    return "citizen"
  }

  return null
}

function buildAnalysisRequest(
  scopeType: AiScopeType,
  selectedRegions: Region[],
  selectedSnapshots: AiAnalysisRequest["snapshots"],
  selectedWaterSystem: (typeof waterSystems)[number] | undefined,
  selectedStateId: string,
  activeRole: DropletRole
): AiAnalysisRequest | null {
  if (!selectedRegions.length || !selectedSnapshots.length) {
    return null
  }

  const selectedState = selectedRegions.find((region) => region.id === selectedStateId)
  const scope =
    scopeType === "state"
      ? {
          id: selectedState?.id ?? selectedRegions[0].id,
          label: selectedState?.name ?? selectedRegions[0].name,
          type: "state" as const,
        }
      : {
          id: selectedWaterSystem?.id ?? "region",
          label: `${selectedWaterSystem?.name ?? "Selected"} water region`,
          type: "region" as const,
        }

  return {
    generatedAt: new Date().toISOString(),
    requestedRole: activeRole,
    regions: selectedRegions.map((region) => ({
      basin: region.basin,
      federalState: region.federalState,
      id: region.id,
      name: region.name,
      riskProfile: region.riskProfile,
    })),
    scope,
    snapshots: selectedSnapshots,
  }
}
