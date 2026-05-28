import {
  Activity02Icon,
  Alert01Icon,
  Cancel01Icon,
  DatabaseSyncIcon,
  MapsIcon,
} from "@hugeicons/core-free-icons"
import { useEffect, useId, useMemo, useRef, useState } from "react"

import {
  MetricTileSkeleton,
  OperationsMapSkeleton,
  RegionDetailSkeleton,
} from "@/components/app/DashboardSkeletons"
import { ForecastOutlookPanel } from "@/components/app/ForecastOutlookPanel"
import { ProductIcon } from "@/components/app/ProductIcon"
import { RegionDetailPanel } from "@/components/app/RegionDetailPanel"
import { RegionOperationsMap } from "@/components/app/RegionOperationsMap"
import { Button } from "@/components/ui/button"
import { useDashboardData, panelErrorMessage } from "@/components/app/dashboard-data"
import { useAppStore } from "@/stores/app-store"
import type {
  AnalyticsSummary,
  Region,
  ReservoirSnapshot,
  TrendDirection,
} from "@/services/types"

export function DashboardPage() {
  const {
    accessError,
    activeLayer,
    activeRegion,
    activeSnapshot,
    analyticsQuery,
    allRegions,
    filterCounts,
    filteredRegions,
    forecastOutlookQuery,
    operationalError,
    regionReadModelLoading,
    regions,
    selectedRegionId,
    setRegionalFilter,
    setSelectedRegionId,
  } = useDashboardData()
  const regionalFilter = useAppStore((state) => state.regionalFilter)
  const setActiveLayer = useAppStore((state) => state.setActiveLayer)
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)
  const [online, setOnline] = useState(currentOnlineState)
  const summary = analyticsQuery.data
  const metricsLoading = analyticsQuery.isPending && !analyticsQuery.data
  const forecastOutlookLoading =
    forecastOutlookQuery.isPending && !forecastOutlookQuery.data
  const dominantTrend = useMemo(
    () => dominantTrendDirection(summary?.trendMix),
    [summary?.trendMix]
  )
  const latestSnapshotTime = activeSnapshot?.timestamp
    ? new Date(activeSnapshot.timestamp).toLocaleString("en-DE")
    : "Waiting for snapshots"

  useEffect(() => {
    const updateOnlineState = () => setOnline(currentOnlineState())

    window.addEventListener("online", updateOnlineState)
    window.addEventListener("offline", updateOnlineState)

    return () => {
      window.removeEventListener("online", updateOnlineState)
      window.removeEventListener("offline", updateOnlineState)
    }
  }, [])

  return (
    <main className="mx-auto grid max-w-7xl gap-4 p-4 pb-28 md:p-6 xl:pb-6">
      {!online ? <OfflineCachedDataNotice /> : null}

      <section className="grid gap-3 lg:grid-cols-3">
        {metricsLoading ? (
          Array.from({ length: 3 }, (_, index) => <MetricTileSkeleton key={index} />)
        ) : (
          <>
            <SummaryCard
              icon={MapsIcon}
              label="Map outlook"
              value={`${summary?.regionsObserved ?? regions.length}/${regions.length || 0}`}
              detail={`${summary?.elevatedRiskRegions ?? 0} elevated · ${activeLayerLabel(activeLayer)} layer`}
            />
            <SummaryCard
              icon={Activity02Icon}
              label="Trends"
              value={dominantTrend.label}
              detail={`${dominantTrend.count} states · ${dominantTrend.description}`}
            />
            <SummaryCard
              icon={DatabaseSyncIcon}
              label="Freshness"
              value={online ? "Online" : "Offline"}
              detail={latestSnapshotTime}
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
              <div className="font-medium">Core read model unavailable</div>
              <div className="mt-1">{operationalError}</div>
            </section>
          ) : null}
          {panelErrorMessage(analyticsQuery.error) ? (
            <section className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 shadow-sm dark:bg-amber-950/30 dark:text-amber-200">
              <div className="font-medium">Analytics summary unavailable</div>
              <div className="mt-1 text-xs leading-5">
                State map and snapshot details remain available from the latest
                snapshot read model.
              </div>
            </section>
          ) : null}

          {regionReadModelLoading ? (
            <OperationsMapSkeleton />
          ) : (
            <RegionOperationsMap
              activeFilter={regionalFilter}
              activeLayer={activeLayer}
              allRegions={allRegions}
              filterCounts={filterCounts}
              filteredRegions={filteredRegions}
              selectedRegionId={activeRegion?.id ?? selectedRegionId}
              onFilterChange={setRegionalFilter}
              onLayerChange={setActiveLayer}
              onSelectRegion={setSelectedRegionId}
            />
          )}
        </div>

        <div className="grid gap-4">
          {regionReadModelLoading ? (
            <div className="hidden xl:block">
              <RegionDetailSkeleton />
            </div>
          ) : activeRegion && activeSnapshot ? (
            <div className="hidden xl:block">
              <RegionDetailPanel region={activeRegion} snapshot={activeSnapshot} />
            </div>
          ) : (
            <section className="hidden rounded-md border bg-card p-4 text-sm text-muted-foreground shadow-sm xl:block">
              Waiting for snapshot data
            </section>
          )}

          <ForecastOutlookPanel
            errorMessage={panelErrorMessage(forecastOutlookQuery.error)}
            loading={forecastOutlookLoading}
            outlook={forecastOutlookQuery.data ?? null}
            regions={regions}
            selectedRegionId={activeRegion?.id ?? null}
          />
        </div>
      </div>

      {activeRegion && activeSnapshot ? (
        <>
          <MobileRegionActionBar
            region={activeRegion}
            snapshot={activeSnapshot}
            onOpen={() => setMobileDetailOpen(true)}
          />
          <MobileRegionDetailSheet
            open={mobileDetailOpen}
            region={activeRegion}
            snapshot={activeSnapshot}
            onClose={() => setMobileDetailOpen(false)}
          />
        </>
      ) : null}
    </main>
  )
}

function currentOnlineState() {
  return typeof navigator === "undefined" ? true : navigator.onLine
}

type SummaryCardProps = {
  detail: string
  icon: typeof MapsIcon
  label: string
  value: string
}

function SummaryCard({ detail, icon, label, value }: SummaryCardProps) {
  return (
    <section className="rounded-md border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium text-muted-foreground">{label}</div>
          <div className="mt-2 truncate text-2xl font-semibold">{value}</div>
          <div className="mt-1 truncate text-xs text-muted-foreground">{detail}</div>
        </div>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <ProductIcon icon={icon} size={18} />
        </span>
      </div>
    </section>
  )
}

function activeLayerLabel(activeLayer: string) {
  if (activeLayer === "rainfall") {
    return "Rainfall"
  }

  if (activeLayer === "confidence") {
    return "Confidence"
  }

  return "Water"
}

function dominantTrendDirection(trendMix: AnalyticsSummary["trendMix"] | undefined) {
  const fallback = { count: 0, description: "waiting for trend mix", label: "Pending" }

  if (!trendMix) {
    return fallback
  }

  const entries = Object.entries(trendMix) as [TrendDirection, number][]
  const [direction, count] =
    entries.sort((first, second) => second[1] - first[1])[0] ?? []

  if (!direction) {
    return fallback
  }

  return {
    count,
    description:
      direction === "rising"
        ? "pressure rising"
        : direction === "falling"
          ? "pressure easing"
          : "conditions stable",
    label: direction[0].toUpperCase() + direction.slice(1),
  }
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
    <div className="fixed inset-x-3 bottom-16 z-20 rounded-md border bg-background/95 p-2 shadow-lg backdrop-blur xl:hidden">
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
  onClose: () => void
  open: boolean
  region: Region
  snapshot: ReservoirSnapshot
}

function MobileRegionDetailSheet({
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
      region={region}
      snapshot={snapshot}
      onClose={onClose}
    />
  )
}

type MobileRegionDetailDialogProps = {
  onClose: () => void
  region: Region
  snapshot: ReservoirSnapshot
}

function MobileRegionDetailDialog({
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
          <RegionDetailPanel region={region} snapshot={snapshot} />
        </div>
      </section>
    </div>
  )
}
