import {
  Alert01Icon,
  DatabaseSyncIcon,
  DropletIcon,
  MapsIcon,
} from "@hugeicons/core-free-icons"
import { useEffect, useState } from "react"

import { AiAnalysisPanel } from "@/components/app/AiAnalysisPanel"
import { AppShell } from "@/components/app/AppShell"
import { MetricTile } from "@/components/app/MetricTile"
import { RegionDetailPanel } from "@/components/app/RegionDetailPanel"
import { RegionOperationsMap } from "@/components/app/RegionOperationsMap"
import {
  useAnalyticsSummary,
  useLatestSnapshots,
  useRegions,
  useSnapshotHistory,
} from "@/hooks/use-droplet-data"
import { useAppStore } from "@/stores/app-store"
import type { Region, ReservoirSnapshot } from "@/services/types"

const emptyRegions: Region[] = []
const emptySnapshots: ReservoirSnapshot[] = []

export function DashboardPage() {
  const selectedRegionId = useAppStore((state) => state.selectedRegionId)
  const setSelectedRegionId = useAppStore((state) => state.setSelectedRegionId)
  const regionsQuery = useRegions()
  const snapshotsQuery = useLatestSnapshots()
  const analyticsQuery = useAnalyticsSummary()
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
    regionsQuery.isFetching || snapshotsQuery.isFetching || analyticsQuery.isFetching

  return (
    <AppShell stale={stale} syncing={syncing}>
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
            <RegionOperationsMap
              regions={regions}
              selectedRegionId={activeRegion?.id ?? null}
              snapshots={snapshots}
              onSelectRegion={setSelectedRegionId}
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
