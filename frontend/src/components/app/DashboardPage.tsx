import {
  Activity02Icon,
  Alert01Icon,
} from "@hugeicons/core-free-icons"
import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"

import { ClimateContextPanel } from "@/components/app/ClimateContextPanel"
import { OperationsMapSkeleton } from "@/components/app/DashboardSkeletons"
import { ForecastOutlookPanel } from "@/components/app/ForecastOutlookPanel"
import { GermanyStateMap } from "@/components/app/GermanyStateMap"
import { ProductIcon } from "@/components/app/ProductIcon"
import { ReadModelFreshnessPanel } from "@/components/app/ReadModelFreshnessPanel"
import { RegionDetailPanel } from "@/components/app/RegionDetailPanel"
import { RegionalFilterBar } from "@/components/app/RegionalFilterBar"
import {
  panelErrorMessage,
  retryReadModels,
  useDashboardData,
} from "@/components/app/dashboard-data"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import {
  buildGermanyStateMetrics,
  homeLayerConfigs,
  type GermanyStateMetric,
} from "@/services/germany-state-map"
import {
  freshnessLabel,
  snapshotFreshnessStatus,
  snapshotSourceTags,
} from "@/services/snapshot-freshness"
import type {
  ForecastOutlook,
  Region,
  RegionClimate,
  ReservoirSnapshot,
} from "@/services/types"
import { useAppStore } from "@/stores/app-store"

export function DashboardPage() {
  const {
    accessError,
    activeRegion,
    activeSnapshot,
    allRegions,
    climateContextQuery,
    filterCounts,
    filteredRegions,
    forecastOutlookQuery,
    freshnessItems,
    homeLayer,
    operationalError,
    regionReadModelLoading,
    regions,
    selectedRegionId,
    setRegionalFilter,
    setSelectedRegionId,
  } = useDashboardData()
  const queryClient = useQueryClient()
  const regionalFilter = useAppStore((state) => state.regionalFilter)
  const setHomeLayer = useAppStore((state) => state.setHomeLayer)
  const mobileRailOpen = useAppStore((state) => state.mobileRailOpen)
  const setMobileRailOpen = useAppStore((state) => state.setMobileRailOpen)
  const [online, setOnline] = useState(currentOnlineState)
  const [now, setNow] = useState(0)
  const forecastOutlook = forecastOutlookQuery.data ?? null
  const mapRegions = filteredRegions.length ? filteredRegions : allRegions
  const noFilterMatches = filteredRegions.length === 0 && allRegions.length > 0
  const climateContextLoading =
    climateContextQuery.isPending && !climateContextQuery.data
  const forecastOutlookLoading =
    forecastOutlookQuery.isPending && !forecastOutlookQuery.data
  const stateMetrics = useMemo(
    () => buildGermanyStateMetrics(allRegions, homeLayer, forecastOutlook),
    [allRegions, forecastOutlook, homeLayer]
  )
  const selectedStateMetric =
    selectedRegionId === null
      ? null
      : Object.values(stateMetrics).find((state) =>
          state.regions.some(({ region }) => region.id === selectedRegionId)
        ) ?? null

  useEffect(() => {
    const updateOnlineState = () => setOnline(currentOnlineState())

    window.addEventListener("online", updateOnlineState)
    window.addEventListener("offline", updateOnlineState)

    return () => {
      window.removeEventListener("online", updateOnlineState)
      window.removeEventListener("offline", updateOnlineState)
    }
  }, [])

  useEffect(() => {
    const updateNow = () => setNow(Date.now())
    updateNow()

    const intervalId = window.setInterval(updateNow, 60_000)

    return () => window.clearInterval(intervalId)
  }, [])

  const retryLiveData = () => retryReadModels(queryClient)

  return (
    <main className="grid min-h-[calc(100svh-3rem)] gap-3 p-3 pb-24 md:min-h-svh md:p-4 xl:grid-cols-[minmax(0,1fr)_410px] xl:pb-4">
      <div className="grid min-w-0 content-start gap-3">
        {!online ? <OfflineCachedDataNotice /> : null}

        {accessError ? (
          <WorkspaceNotice tone="warning" title="Access limited">
            {accessError}
          </WorkspaceNotice>
        ) : null}

        {operationalError ? (
          <WorkspaceNotice tone="error" title="Core read model unavailable">
            {operationalError}
          </WorkspaceNotice>
        ) : null}

        <RegionalFilterBar
          activeFilter={regionalFilter}
          counts={filterCounts}
          onChange={setRegionalFilter}
        />

        {noFilterMatches ? (
          <WorkspaceNotice tone="warning" title="No filter matches">
            Showing all observed states for map context.
          </WorkspaceNotice>
        ) : null}

        {regionReadModelLoading ? (
          <OperationsMapSkeleton />
        ) : (
          <GermanyStateMap
            activeLayer={homeLayer}
            forecastOutlook={forecastOutlook}
            mapRegions={mapRegions}
            selectedRegionId={activeRegion?.id ?? selectedRegionId}
            onLayerChange={setHomeLayer}
            onOpenDetails={() => setMobileRailOpen(true)}
            onSelectRegion={setSelectedRegionId}
          />
        )}
      </div>

      <aside className="hidden min-w-0 xl:block">
        <div className="sticky top-4 max-h-[calc(100svh-2rem)] overflow-y-auto">
          <SelectedStateRail
            climate={climateContextQuery.data ?? null}
            climateErrorMessage={panelErrorMessage(climateContextQuery.error)}
            climateLoading={climateContextLoading}
            forecastErrorMessage={panelErrorMessage(forecastOutlookQuery.error)}
            forecastOutlook={forecastOutlook}
            forecastLoading={forecastOutlookLoading}
            freshnessItems={freshnessItems}
            now={now}
            region={activeRegion}
            regions={regions}
            selectedStateMetric={selectedStateMetric}
            snapshot={activeSnapshot}
            onRetry={retryLiveData}
          />
        </div>
      </aside>

      <MobileSelectedStateAction
        region={activeRegion}
        snapshot={activeSnapshot}
        onOpen={() => setMobileRailOpen(true)}
      />

      <Sheet open={mobileRailOpen} onOpenChange={setMobileRailOpen}>
        <SheetContent
          className="max-h-[88svh] overflow-y-auto p-0 xl:hidden"
          side="bottom"
        >
          <SheetHeader className="border-b p-3 text-left">
            <SheetTitle>{activeRegion?.name ?? "State details"}</SheetTitle>
            <SheetDescription>
              Selected-state water, climate, forecast, and freshness
            </SheetDescription>
          </SheetHeader>
          <div className="p-3">
            <SelectedStateRail
              climate={climateContextQuery.data ?? null}
              climateErrorMessage={panelErrorMessage(climateContextQuery.error)}
              climateLoading={climateContextLoading}
              forecastErrorMessage={panelErrorMessage(forecastOutlookQuery.error)}
              forecastOutlook={forecastOutlook}
              forecastLoading={forecastOutlookLoading}
              freshnessItems={freshnessItems}
              now={now}
              region={activeRegion}
              regions={regions}
              selectedStateMetric={selectedStateMetric}
              snapshot={activeSnapshot}
              onRetry={retryLiveData}
            />
          </div>
        </SheetContent>
      </Sheet>
    </main>
  )
}

function currentOnlineState() {
  return typeof navigator === "undefined" ? true : navigator.onLine
}

type SelectedStateRailProps = {
  climate: RegionClimate | null
  climateErrorMessage?: string | null
  climateLoading: boolean
  forecastErrorMessage?: string | null
  forecastOutlook: ForecastOutlook | null
  forecastLoading: boolean
  freshnessItems: Array<{
    error?: boolean
    isFetching: boolean
    label: string
    updatedAt: number
  }>
  now: number
  onRetry: () => void
  region: Region | null
  regions: Region[]
  selectedStateMetric: GermanyStateMetric | null
  snapshot: ReservoirSnapshot | null
}

function SelectedStateRail({
  climate,
  climateErrorMessage,
  climateLoading,
  forecastErrorMessage,
  forecastOutlook,
  forecastLoading,
  freshnessItems,
  now,
  onRetry,
  region,
  regions,
  selectedStateMetric,
  snapshot,
}: SelectedStateRailProps) {
  if (!region || !snapshot) {
    return (
      <section className="rounded-md border bg-card p-4 text-sm text-muted-foreground shadow-sm">
        Waiting for selected-state snapshot data
      </section>
    )
  }

  return (
    <div className="grid gap-3">
      <SelectedStateSummary
        region={region}
        selectedStateMetric={selectedStateMetric}
        snapshot={snapshot}
      />

      {selectedStateMetric?.warnings.length ? (
        <section className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 shadow-sm dark:bg-amber-950/30 dark:text-amber-200">
          <div className="mb-2 flex items-center gap-2 font-medium">
            <ProductIcon icon={Alert01Icon} size={16} />
            Warnings
          </div>
          <div className="grid gap-1 text-xs">
            {selectedStateMetric.warnings.map((warning) => (
              <div className="break-words" key={warning}>
                {warning}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <RegionDetailPanel region={region} snapshot={snapshot} />

      <ClimateContextPanel
        climate={climate}
        errorMessage={climateErrorMessage}
        loading={climateLoading}
      />

      <ForecastOutlookPanel
        errorMessage={forecastErrorMessage}
        loading={forecastLoading}
        outlook={forecastOutlook}
        regions={regions}
        selectedRegionId={region.id}
      />

      <ReadModelFreshnessPanel items={freshnessItems} now={now} onRetry={onRetry} />
    </div>
  )
}

function SelectedStateSummary({
  region,
  selectedStateMetric,
  snapshot,
}: {
  region: Region
  selectedStateMetric: GermanyStateMetric | null
  snapshot: ReservoirSnapshot
}) {
  const freshnessStatus = snapshotFreshnessStatus(snapshot)
  const sources = snapshotSourceTags(snapshot)

  return (
    <section className="rounded-md border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase text-muted-foreground">
            {region.federalState}
          </div>
          <h2 className="mt-1 break-words text-lg font-semibold">{region.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {region.basin} system · {region.code} · {region.riskProfile}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-md px-2 py-1 text-xs font-medium capitalize",
            freshnessStatus === "current" &&
              "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
            freshnessStatus === "stale" &&
              "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
            freshnessStatus === "old" &&
              "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200"
          )}
        >
          {freshnessStatus} · {freshnessLabel(snapshot)}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {homeLayerConfigs
          .filter((layer) => layer.id !== "overview")
          .map((layer) => (
            <div className="rounded-md border bg-background p-3" key={layer.id}>
              <div className="text-xs uppercase text-muted-foreground">
                {layer.label}
              </div>
              <div className="mt-1 text-xl font-semibold">
                {selectedStateMetric?.layerValues[layer.id] ?? 0}%
              </div>
            </div>
          ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {sources.map((source) => (
          <span
            className={cn(
              "max-w-full truncate rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground",
              source.kind === "water" &&
                "border-sky-200 text-sky-800 dark:text-sky-200",
              source.kind === "weather" &&
                "border-emerald-200 text-emerald-800 dark:text-emerald-200",
              source.kind === "fallback" &&
                "border-amber-200 text-amber-800 dark:text-amber-200"
            )}
            key={`${source.kind}-${source.label}`}
          >
            {source.label}
          </span>
        ))}
      </div>
    </section>
  )
}

function MobileSelectedStateAction({
  onOpen,
  region,
  snapshot,
}: {
  onOpen: () => void
  region: Region | null
  snapshot: ReservoirSnapshot | null
}) {
  if (!region || !snapshot) {
    return null
  }

  return (
    <div className="fixed inset-x-3 bottom-3 z-30 rounded-md border bg-background/95 p-2 shadow-lg backdrop-blur xl:hidden">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{region.name}</div>
          <div className="truncate text-xs text-muted-foreground">
            Water {snapshot.waterLevel}% · Confidence {snapshot.confidenceScore}%
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

function WorkspaceNotice({
  children,
  title,
  tone,
}: {
  children: string
  title: string
  tone: "error" | "warning"
}) {
  return (
    <section
      className={cn(
        "rounded-md border p-3 text-sm shadow-sm",
        tone === "warning" &&
          "border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200",
        tone === "error" &&
          "border-red-300 bg-red-50 text-red-900 dark:bg-red-950/30 dark:text-red-200"
      )}
    >
      <div className="font-medium">{title}</div>
      <div className="mt-1 text-xs leading-5">{children}</div>
    </section>
  )
}

function OfflineCachedDataNotice() {
  return (
    <section className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 shadow-sm dark:bg-amber-950/30 dark:text-amber-200">
      <div className="flex items-start gap-2">
        <ProductIcon icon={Alert01Icon} size={16} />
        <div className="min-w-0">
          <div className="font-medium">Offline mode</div>
          <div className="mt-0.5 text-xs leading-5">
            Showing cached reservoir snapshots and read models until the network
            connection is restored.
          </div>
        </div>
      </div>
    </section>
  )
}
