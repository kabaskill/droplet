import {
  Activity02Icon,
  Alert01Icon,
  Cancel01Icon,
  DatabaseSyncIcon,
  DropletIcon,
  MapsIcon,
} from "@hugeicons/core-free-icons"
import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useId, useMemo, useRef, useState } from "react"

import { AiAnalysisPanel } from "@/components/app/AiAnalysisPanel"
import { AppShell } from "@/components/app/AppShell"
import {
  MetricTileSkeleton,
  OperationsMapSkeleton,
  RegionalFilterSkeleton,
  RegionDetailSkeleton,
} from "@/components/app/DashboardSkeletons"
import { ForecastOutlookPanel } from "@/components/app/ForecastOutlookPanel"
import { MetricTile } from "@/components/app/MetricTile"
import { ProductIcon } from "@/components/app/ProductIcon"
import { RegionComparisonPanel } from "@/components/app/RegionComparisonPanel"
import { RegionDetailPanel } from "@/components/app/RegionDetailPanel"
import { RegionOperationsMap } from "@/components/app/RegionOperationsMap"
import { RegionQuickSwitcher } from "@/components/app/RegionQuickSwitcher"
import { RegionalFilterBar } from "@/components/app/RegionalFilterBar"
import { SourceHealthPanel } from "@/components/app/SourceHealthPanel"
import { Button } from "@/components/ui/button"
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
import {
  filterRegions,
  regionalFilterCounts,
} from "@/services/regional-filters"
import { useAppStore } from "@/stores/app-store"
import type {
  RefreshSnapshotsResult,
  Region,
  ReservoirSnapshot,
} from "@/services/types"

const emptyRegions: Region[] = []
const emptySnapshots: ReservoirSnapshot[] = []

export function DashboardPage() {
  const activeLayer = useAppStore((state) => state.activeLayer)
  const comparisonMode = useAppStore((state) => state.comparisonMode)
  const regionalFilter = useAppStore((state) => state.regionalFilter)
  const selectedRegionId = useAppStore((state) => state.selectedRegionId)
  const setRegionalFilter = useAppStore((state) => state.setRegionalFilter)
  const setSelectedRegionId = useAppStore((state) => state.setSelectedRegionId)
  const regionsQuery = useRegions()
  const snapshotsQuery = useLatestSnapshots()
  const analyticsQuery = useAnalyticsSummary()
  const sourceHealthQuery = useSourceHealth()
  const ingestionStatusQuery = useIngestionStatus()
  const forecastOutlookQuery = useForecastOutlook()
  const refreshSnapshots = useRefreshSnapshots()
  const queryClient = useQueryClient()
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)
  const [now, setNow] = useState(0)

  const regions = regionsQuery.data ?? emptyRegions
  const snapshots = snapshotsQuery.data ?? emptySnapshots
  const metricsLoading = analyticsQuery.isPending && !analyticsQuery.data
  const regionReadModelLoading =
    (regionsQuery.isPending && regions.length === 0) ||
    (snapshotsQuery.isPending && snapshots.length === 0)
  const sourceHealthLoading = sourceHealthQuery.isPending && !sourceHealthQuery.data
  const ingestionStatusLoading =
    ingestionStatusQuery.isPending && !ingestionStatusQuery.data
  const forecastOutlookLoading =
    forecastOutlookQuery.isPending && !forecastOutlookQuery.data
  const filteredRegions = useMemo(
    () => filterRegions(regions, snapshots, regionalFilter),
    [regions, snapshots, regionalFilter]
  )
  const filterCounts = useMemo(
    () => regionalFilterCounts(regions, snapshots),
    [regions, snapshots]
  )

  useEffect(() => {
    const updateNow = () => setNow(Date.now())
    updateNow()

    const intervalId = window.setInterval(updateNow, 60_000)

    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    if (!regions[0]) {
      return
    }

    if (!selectedRegionId) {
      setSelectedRegionId(regions[0].id)
      return
    }

    if (
      filteredRegions.length > 0 &&
      !filteredRegions.some(({ region }) => region.id === selectedRegionId)
    ) {
      setSelectedRegionId(filteredRegions[0].region.id)
    }
  }, [filteredRegions, regions, selectedRegionId, setSelectedRegionId])

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
  const handleSelectRegion = (regionId: string) => {
    setSelectedRegionId(regionId)
  }

  return (
    <AppShell
      refreshMessage={refreshMessage}
      refreshing={refreshSnapshots.isPending}
      stale={stale}
      syncing={syncing}
      onRefresh={handleRefresh}
    >
      <main className="mx-auto grid max-w-7xl gap-4 p-4 pb-28 md:p-6 xl:pb-6">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metricsLoading ? (
            Array.from({ length: 4 }, (_, index) => (
              <MetricTileSkeleton key={index} />
            ))
          ) : (
            <>
              <MetricTile
                icon={MapsIcon}
                label="States"
                tone="blue"
                value={
                  regionalFilter === "all"
                    ? `${summary?.regionsObserved ?? regions.length}`
                    : `${filteredRegions.length}/${regions.length}`
                }
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
            </>
          )}
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
            {regionReadModelLoading ? (
              <>
                <RegionalFilterSkeleton />
                <OperationsMapSkeleton />
              </>
            ) : (
              <>
                <RegionQuickSwitcher
                  regions={filteredRegions}
                  selectedRegionId={activeRegion?.id ?? null}
                  onSelectRegion={handleSelectRegion}
                />
                <RegionalFilterBar
                  activeFilter={regionalFilter}
                  counts={filterCounts}
                  onChange={setRegionalFilter}
                />
                <RegionOperationsMap
                  activeLayer={activeLayer}
                  filteredRegions={filteredRegions}
                  selectedRegionId={activeRegion?.id ?? null}
                  onSelectRegion={handleSelectRegion}
                />
              </>
            )}
            {comparisonMode && !regionReadModelLoading ? (
              <RegionComparisonPanel
                activeLayer={activeLayer}
                filteredRegions={filteredRegions}
                selectedRegionId={activeRegion?.id ?? null}
                onSelectRegion={handleSelectRegion}
              />
            ) : null}
            <SourceHealthPanel
              errorMessage={panelErrorMessage(sourceHealthQuery.error)}
              ingestionStatus={ingestionStatusQuery.data ?? null}
              ingestionStatusLoading={ingestionStatusLoading}
              loading={sourceHealthLoading}
              regions={regions}
              sourceHealth={sourceHealthQuery.data ?? null}
            />
            <ForecastOutlookPanel
              errorMessage={panelErrorMessage(forecastOutlookQuery.error)}
              loading={forecastOutlookLoading}
              outlook={forecastOutlookQuery.data ?? null}
              regions={regions}
              selectedRegionId={activeRegion?.id ?? null}
            />
            <AiAnalysisPanel
              snapshot={activeSnapshot}
              snapshotLoading={regionReadModelLoading}
            />
          </div>

          {regionReadModelLoading ? (
            <div className="hidden xl:block">
              <RegionDetailSkeleton />
            </div>
          ) : activeRegion && activeSnapshot ? (
            <div className="hidden xl:block">
              <RegionDetailPanel
                history={historyQuery.data ?? []}
                region={activeRegion}
                snapshot={activeSnapshot}
              />
            </div>
          ) : (
            <section className="hidden rounded-md border bg-card p-4 text-sm text-muted-foreground shadow-sm xl:block">
              Waiting for snapshot data
            </section>
          )}
        </div>

        {activeRegion && activeSnapshot ? (
          <>
            <MobileRegionActionBar
              region={activeRegion}
              snapshot={activeSnapshot}
              onOpen={() => setMobileDetailOpen(true)}
            />
            <MobileRegionDetailSheet
              history={historyQuery.data ?? []}
              open={mobileDetailOpen}
              region={activeRegion}
              snapshot={activeSnapshot}
              onClose={() => setMobileDetailOpen(false)}
            />
          </>
        ) : null}
      </main>
    </AppShell>
  )
}

type MobileRegionActionBarProps = {
  onOpen: () => void
  region: Region
  snapshot: ReservoirSnapshot
}

function MobileRegionActionBar({
  onOpen,
  region,
  snapshot,
}: MobileRegionActionBarProps) {
  return (
    <div className="fixed inset-x-3 bottom-3 z-20 rounded-md border bg-background/95 p-2 shadow-lg backdrop-blur xl:hidden">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{region.name}</div>
          <div className="truncate text-xs text-muted-foreground">
            {region.basin} system · Water {snapshot.waterLevel}% · Confidence{" "}
            {snapshot.confidenceScore}%
          </div>
        </div>
        <Button size="lg" onClick={onOpen}>
          <ProductIcon icon={Activity02Icon} />
          Details
        </Button>
      </div>
    </div>
  )
}

type MobileRegionDetailSheetProps = {
  history: ReservoirSnapshot[]
  onClose: () => void
  open: boolean
  region: Region
  snapshot: ReservoirSnapshot
}

function MobileRegionDetailSheet({
  history,
  onClose,
  open,
  region,
  snapshot,
}: MobileRegionDetailSheetProps) {
  if (!open) {
    return null
  }

  return (
    <MobileRegionDetailDialog
      history={history}
      region={region}
      snapshot={snapshot}
      onClose={onClose}
    />
  )
}

type MobileRegionDetailDialogProps = {
  history: ReservoirSnapshot[]
  onClose: () => void
  region: Region
  snapshot: ReservoirSnapshot
}

function MobileRegionDetailDialog({
  history,
  onClose,
  region,
  snapshot,
}: MobileRegionDetailDialogProps) {
  const titleId = useId()
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeButtonRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-30 bg-background/70 backdrop-blur-sm xl:hidden">
      <button
        aria-label="Close state details"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        type="button"
      />
      <section
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute inset-x-0 bottom-0 max-h-[86svh] min-w-0 overflow-x-hidden overflow-y-auto rounded-t-md border bg-background p-3 shadow-xl"
        role="dialog"
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-medium" id={titleId}>
              {region.name}
            </h2>
            <div className="truncate text-xs text-muted-foreground">
              {region.basin} system
            </div>
          </div>
          <Button
            aria-label="Close state details"
            ref={closeButtonRef}
            size="icon"
            variant="ghost"
            onClick={onClose}
          >
            <ProductIcon icon={Cancel01Icon} />
          </Button>
        </div>
        <div className="min-w-0 overflow-hidden">
          <RegionDetailPanel history={history} region={region} snapshot={snapshot} />
        </div>
      </section>
    </div>
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
      return "Your current role can view states, but analyst or municipality access is required for this operation."
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

function panelErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return null
  }

  if (error.message === "insufficient role") {
    return null
  }

  if (isDropletApiError(error) && [401, 403].includes(error.status)) {
    return null
  }

  if (isDropletApiError(error)) {
    return `${error.message} (${error.status})`
  }

  return error.message
}
