import {
  Alert01Icon,
  DatabaseSyncIcon,
  DropletIcon,
  MapsIcon,
} from "@hugeicons/core-free-icons"
import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"

import { AiAnalysisPanel } from "@/components/app/AiAnalysisPanel"
import { AppShell } from "@/components/app/AppShell"
import { ForecastOutlookPanel } from "@/components/app/ForecastOutlookPanel"
import { MetricTile } from "@/components/app/MetricTile"
import { RegionDetailPanel } from "@/components/app/RegionDetailPanel"
import { RegionOperationsMap } from "@/components/app/RegionOperationsMap"
import { SourceHealthPanel } from "@/components/app/SourceHealthPanel"
import {
  useAnalyticsSummary,
  useForecastOutlook,
  useIngestionStatus,
  useLatestSnapshots,
  useRegions,
  useRefreshSnapshots,
  useSourceHealth,
  useSnapshotHistory,
} from "@/hooks/use-droplet-data"
import { isDropletApiError } from "@/services/api"
import { useAppStore } from "@/stores/app-store"
import type {
  RefreshSnapshotsResult,
  Region,
  ReservoirSnapshot,
} from "@/services/types"

const emptyRegions: Region[] = []
const emptySnapshots: ReservoirSnapshot[] = []

export function DashboardPage() {
  const selectedRegionId = useAppStore((state) => state.selectedRegionId)
  const setSelectedRegionId = useAppStore((state) => state.setSelectedRegionId)
  const regionsQuery = useRegions()
  const snapshotsQuery = useLatestSnapshots()
  const analyticsQuery = useAnalyticsSummary()
  const sourceHealthQuery = useSourceHealth()
  const ingestionStatusQuery = useIngestionStatus()
  const forecastOutlookQuery = useForecastOutlook()
  const refreshSnapshots = useRefreshSnapshots()
  const queryClient = useQueryClient()
  const [now, setNow] = useState(0)

  const regions = regionsQuery.data ?? emptyRegions
  const snapshots = snapshotsQuery.data ?? emptySnapshots

  useEffect(() => {
    const updateNow = () => setNow(Date.now())
    updateNow()

    const intervalId = window.setInterval(updateNow, 60_000)

    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    if (!selectedRegionId && regions[0]) {
      setSelectedRegionId(regions[0].id)
    }
  }, [regions, selectedRegionId, setSelectedRegionId])

  const activeRegion =
    regions.find((region) => region.id === selectedRegionId) ?? regions[0] ?? null
  const activeSnapshot =
    snapshots.find((snapshot) => snapshot.regionId === activeRegion?.id) ??
    snapshots[0] ??
    null
  const historyQuery = useSnapshotHistory(activeRegion?.id ?? null)
  const summary = analyticsQuery.data
  const stale =
    !navigator.onLine ||
    (snapshotsQuery.dataUpdatedAt > 0 &&
      now > 0 &&
      now - snapshotsQuery.dataUpdatedAt > 1000 * 60 * 5)
  const syncing =
    regionsQuery.isFetching ||
    snapshotsQuery.isFetching ||
    analyticsQuery.isFetching ||
    sourceHealthQuery.isFetching ||
    ingestionStatusQuery.isFetching ||
    forecastOutlookQuery.isFetching
  const refreshMessage = refreshSnapshots.isError
    ? refreshErrorMessage(refreshSnapshots.error)
    : refreshResultMessage(refreshSnapshots.data)
  const accessError = firstAccessError([
    analyticsQuery.error,
    sourceHealthQuery.error,
    ingestionStatusQuery.error,
    forecastOutlookQuery.error,
    refreshSnapshots.error,
  ])
  const operationalError = firstOperationalError([
    regionsQuery.error,
    snapshotsQuery.error,
    historyQuery.error,
    analyticsQuery.error,
    sourceHealthQuery.error,
    ingestionStatusQuery.error,
    forecastOutlookQuery.error,
  ])
  const handleRefresh = () => {
    refreshSnapshots.mutate(undefined, {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ["snapshots"] })
        void queryClient.invalidateQueries({ queryKey: ["analytics"] })
        void queryClient.invalidateQueries({ queryKey: ["forecasts"] })
        void queryClient.invalidateQueries({ queryKey: ["sources"] })
        void queryClient.invalidateQueries({ queryKey: ["ingestion"] })
      },
    })
  }

  return (
    <AppShell
      refreshMessage={refreshMessage}
      refreshing={refreshSnapshots.isPending}
      stale={stale}
      syncing={syncing}
      onRefresh={handleRefresh}
    >
      <main className="mx-auto grid max-w-7xl gap-4 p-4 md:p-6">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            icon={MapsIcon}
            label="Regions"
            tone="blue"
            value={`${summary?.regionsObserved ?? regions.length}`}
          />
          <MetricTile
            icon={DropletIcon}
            label="Visibility"
            tone="green"
            value={`${summary?.averageVisibility ?? 0}%`}
          />
          <MetricTile
            icon={DatabaseSyncIcon}
            label="Confidence"
            tone="green"
            value={`${summary?.averageConfidence ?? 0}%`}
          />
          <MetricTile
            icon={Alert01Icon}
            label="Elevated"
            tone={(summary?.elevatedRiskRegions ?? 0) > 0 ? "amber" : "green"}
            value={`${summary?.elevatedRiskRegions ?? 0}`}
          />
        </section>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="grid gap-4">
            {accessError ? (
              <section className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 shadow-sm dark:bg-amber-950/30 dark:text-amber-200">
                {accessError}
              </section>
            ) : null}
            {operationalError ? (
              <section className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-900 shadow-sm dark:bg-red-950/30 dark:text-red-200">
                <div className="font-medium">Live read model unavailable</div>
                <div className="mt-1">{operationalError}</div>
              </section>
            ) : null}
            <RegionOperationsMap
              regions={regions}
              selectedRegionId={activeRegion?.id ?? null}
              snapshots={snapshots}
              onSelectRegion={setSelectedRegionId}
            />
            <SourceHealthPanel
              ingestionStatus={ingestionStatusQuery.data ?? null}
              sourceHealth={sourceHealthQuery.data ?? null}
            />
            <ForecastOutlookPanel
              outlook={forecastOutlookQuery.data ?? null}
              regions={regions}
              selectedRegionId={activeRegion?.id ?? null}
            />
            <AiAnalysisPanel snapshot={activeSnapshot} />
          </div>

          {activeRegion && activeSnapshot ? (
            <RegionDetailPanel
              history={historyQuery.data ?? []}
              region={activeRegion}
              snapshot={activeSnapshot}
            />
          ) : (
            <section className="rounded-md border bg-card p-4 text-sm text-muted-foreground shadow-sm">
              Waiting for snapshot data
            </section>
          )}
        </div>
      </main>
    </AppShell>
  )
}

function refreshResultMessage(result: RefreshSnapshotsResult | undefined) {
  if (!result?.snapshotRefresh || result.status !== "completed") {
    return null
  }

  const { created, deleted, skipped, updated } = result.snapshotRefresh

  return `Created ${created} · Updated ${updated} · Skipped ${skipped} · Deleted ${deleted}`
}

function refreshErrorMessage(error: Error | null) {
  return error?.message ?? "Refresh failed"
}

function firstAccessError(errors: unknown[]) {
  for (const error of errors) {
    if (!(error instanceof Error)) {
      continue
    }

    if (error.message === "insufficient role") {
      return "Your current role can view regions, but analyst or municipality access is required for this operation."
    }
  }

  return null
}

function firstOperationalError(errors: unknown[]) {
  for (const error of errors) {
    if (!(error instanceof Error)) {
      continue
    }

    if (isDropletApiError(error) && [401, 403].includes(error.status)) {
      continue
    }

    if (error.message === "insufficient role") {
      continue
    }

    if (isDropletApiError(error)) {
      return `${error.message} (${error.status})`
    }

    return error.message
  }

  return null
}
