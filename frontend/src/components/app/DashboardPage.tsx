import { Activity02Icon, Alert01Icon } from "@hugeicons/core-free-icons"
import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useState, type CSSProperties } from "react"

import { ClimateContextPanel } from "@/components/app/ClimateContextPanel"
import { ForecastOutlookPanel } from "@/components/app/ForecastOutlookPanel"
import { GermanyStateMap } from "@/components/app/GermanyStateMap"
import { ProductIcon } from "@/components/app/ProductIcon"
import { ReadModelFreshnessPanel } from "@/components/app/ReadModelFreshnessPanel"
import { RegionDetailPanel } from "@/components/app/RegionDetailPanel"
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
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
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
    forecastOutlookQuery,
    freshnessItems,
    homeLayer,
    operationalError,
    regionReadModelLoading,
    regions,
    selectedRegionId,
    setSelectedRegionId,
  } = useDashboardData({ selectionScope: "all" })
  const queryClient = useQueryClient()
  const setHomeLayer = useAppStore((state) => state.setHomeLayer)
  const mobileRailOpen = useAppStore((state) => state.mobileRailOpen)
  const setMobileRailOpen = useAppStore((state) => state.setMobileRailOpen)
  const rightRailOpen = useAppStore((state) => state.rightRailOpen)
  const setRightRailOpen = useAppStore((state) => state.setRightRailOpen)
  const [online, setOnline] = useState(currentOnlineState)
  const [now, setNow] = useState(() => Date.now())
  const forecastOutlook = forecastOutlookQuery.data ?? null
  const mapRegions = allRegions
  const climateContextLoading =
    climateContextQuery.isPending && !climateContextQuery.data
  const forecastOutlookLoading =
    forecastOutlookQuery.isPending && !forecastOutlookQuery.data
  const stateMetrics = buildGermanyStateMetrics(
    allRegions,
    homeLayer,
    forecastOutlook
  )
  const selectedStateMetric =
    selectedRegionId === null
      ? null
      : (Object.values(stateMetrics).find((state) =>
          state.regions.some(({ region }) => region.id === selectedRegionId)
        ) ?? null)

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
    const intervalId = window.setInterval(() => setNow(Date.now()), 60_000)

    return () => window.clearInterval(intervalId)
  }, [])

  const retryLiveData = () => retryReadModels(queryClient)

  return (
    <SidebarProvider
      className="relative h-[calc(100svh-3rem)] !min-h-0 overflow-hidden bg-background md:h-svh"
      open={rightRailOpen}
      style={
        {
          "--sidebar-width": "31rem",
          "--sidebar-width-icon": "3rem",
        } as CSSProperties
      }
      onOpenChange={setRightRailOpen}
    >
      <main className="absolute inset-0 overflow-hidden">
        {regionReadModelLoading ? (
          <HomeMapLoading />
        ) : (
          <GermanyStateMap
            activeLayer={homeLayer}
            className="absolute inset-0"
            forecastOutlook={forecastOutlook}
            mapRegions={mapRegions}
            selectedRegionId={activeRegion?.id ?? selectedRegionId}
            onLayerChange={setHomeLayer}
            onSelectRegion={setSelectedRegionId}
          />
        )}

        <div className="pointer-events-none absolute top-3 right-3 left-3 z-30 grid max-w-2xl gap-2 md:top-4 md:right-auto md:left-4">
          {!online ? (
            <div className="pointer-events-auto">
              <OfflineCachedDataNotice />
            </div>
          ) : null}

          {accessError ? (
            <div className="pointer-events-auto">
              <WorkspaceNotice tone="warning" title="Access limited">
                {accessError}
              </WorkspaceNotice>
            </div>
          ) : null}

          {operationalError ? (
            <div className="pointer-events-auto">
              <WorkspaceNotice tone="error" title="Core read model unavailable">
                {operationalError}
              </WorkspaceNotice>
            </div>
          ) : null}
        </div>

        {!rightRailOpen ? (
          <Button
            className="absolute top-3 right-3 z-50 hidden shadow-lg xl:inline-flex"
            size="sm"
            variant="secondary"
            onClick={() => setRightRailOpen(true)}
          >
            <ProductIcon icon={Activity02Icon} />
            State details
          </Button>
        ) : null}

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
                climateErrorMessage={panelErrorMessage(
                  climateContextQuery.error
                )}
                climateLoading={climateContextLoading}
                forecastErrorMessage={panelErrorMessage(
                  forecastOutlookQuery.error
                )}
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

      <Sidebar
        className="z-40 max-xl:hidden"
        collapsible="offcanvas"
        side="right"
        variant="floating"
      >
        <SidebarHeader className="min-w-0 border-b p-3">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-sm leading-5 font-semibold break-words">
                {activeRegion?.name ?? "State details"}
              </div>
              <div className="mt-0.5 text-xs leading-5 text-sidebar-foreground/70">
                Water, climate, forecast, and source freshness
              </div>
            </div>
            <SidebarTrigger className="shrink-0" />
          </div>
        </SidebarHeader>
        <SidebarContent className="min-w-0 p-2">
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
        </SidebarContent>
        <SidebarRail />
      </Sidebar>
    </SidebarProvider>
  )
}

function HomeMapLoading() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-muted/30">
      <div className="absolute inset-8 animate-pulse rounded-md bg-muted/50" />
      <div className="absolute bottom-20 left-4 flex gap-2 rounded-md border bg-background/90 p-1 shadow-sm backdrop-blur xl:bottom-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="size-8 rounded-md bg-muted" key={index} />
        ))}
      </div>
      <div className="absolute bottom-20 left-1/2 flex w-[min(34rem,calc(100%-8rem))] -translate-x-1/2 gap-1 rounded-md border bg-background/90 p-1 shadow-sm backdrop-blur xl:bottom-4">
        {Array.from({ length: 5 }, (_, index) => (
          <div className="h-8 flex-1 rounded-md bg-muted" key={index} />
        ))}
      </div>
    </div>
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
      <section className="min-w-0 rounded-md border bg-card p-4 text-sm text-muted-foreground shadow-sm">
        Waiting for selected-state snapshot data
      </section>
    )
  }

  return (
    <div className="grid min-w-0 gap-3">
      <SelectedStateSummary
        region={region}
        selectedStateMetric={selectedStateMetric}
        snapshot={snapshot}
      />

      {selectedStateMetric?.warnings.length ? (
        <section className="min-w-0 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 shadow-sm dark:bg-amber-950/30 dark:text-amber-200">
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

      <ReadModelFreshnessPanel
        items={freshnessItems}
        now={now}
        onRetry={onRetry}
      />
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
    <section className="min-w-0 rounded-md border bg-card p-4 shadow-sm">
      <div className="flex min-w-0 flex-col gap-3 min-[460px]:flex-row min-[460px]:items-start min-[460px]:justify-between">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-muted-foreground uppercase">
            {region.federalState}
          </div>
          <h2 className="mt-1 text-lg font-semibold break-words">
            {region.name}
          </h2>
          <p className="mt-1 text-sm break-words text-muted-foreground">
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
        {homeLayerConfigs.flatMap((layer) =>
          layer.id === "overview"
            ? []
            : [
                <div
                  className="min-w-0 rounded-md border bg-background p-3"
                  key={layer.id}
                >
                  <div className="text-xs break-words text-muted-foreground uppercase">
                    {layer.label}
                  </div>
                  <div className="mt-1 text-xl font-semibold">
                    {selectedStateMetric?.layerValues[layer.id] ?? 0}%
                  </div>
                </div>,
              ]
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {sources.map((source) => (
          <span
            className={cn(
              "max-w-full rounded-md border bg-background px-2 py-1 text-xs break-words text-muted-foreground",
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
            Water {snapshot.waterLevel}% · Confidence {snapshot.confidenceScore}
            %
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
