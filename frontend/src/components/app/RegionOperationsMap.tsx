import { useMemo, useState, useTransition } from "react"

import { GermanyStateMap } from "@/components/app/GermanyStateMap"
import { cn } from "@/lib/utils"
import {
  freshnessLabel,
  snapshotFreshnessStatus,
} from "@/services/snapshot-freshness"
import type { RegionWithSnapshot } from "@/services/regional-filters"
import type { ReservoirSnapshot } from "@/services/types"
import {
  regionBelongsToWaterSystem,
  waterSystems,
  waterSystemStateCount,
} from "@/services/water-systems"
import type { MapLayer } from "@/stores/app-store"

type RegionOperationsMapProps = {
  activeLayer: MapLayer
  filteredRegions: RegionWithSnapshot[]
  onSelectRegion: (regionId: string) => void
  selectedRegionId: string | null
}

type LayerConfig = {
  description: string
  label: string
  metric: (snapshot: ReservoirSnapshot) => number
  shortLabel: string
}

const layerConfigs: Record<MapLayer, LayerConfig> = {
  confidence: {
    description: "Confidence and visibility quality across observed states",
    label: "Confidence",
    metric: (snapshot) => snapshot.confidenceScore,
    shortLabel: "Conf.",
  },
  rainfall: {
    description: "Rainfall pressure contribution across observed states",
    label: "Rainfall",
    metric: (snapshot) => snapshot.rainfallIndex,
    shortLabel: "Rain",
  },
  "water-level": {
    description: "Normalized river and reservoir level pressure by state",
    label: "Water level",
    metric: (snapshot) => snapshot.waterLevel,
    shortLabel: "Water",
  },
}

function layerStatus(snapshot: ReservoirSnapshot, activeLayer: MapLayer) {
  if (activeLayer === "confidence") {
    if (snapshot.confidenceScore < 70 || snapshot.visibilityScore < 58) {
      return "critical"
    }

    if (snapshot.confidenceScore < 82 || snapshot.visibilityScore < 68) {
      return "watch"
    }

    return "healthy"
  }

  if (activeLayer === "rainfall") {
    if (snapshot.rainfallIndex >= 70) {
      return "critical"
    }

    if (snapshot.rainfallIndex >= 45) {
      return "watch"
    }

    return "healthy"
  }

  if (snapshot.waterLevel >= 72) {
    return "critical"
  }

  if (snapshot.waterLevel <= 42 || snapshot.evaporationPressure >= 62) {
    return "watch"
  }

  return "healthy"
}

function riskClass(snapshot: ReservoirSnapshot | undefined, activeLayer: MapLayer) {
  if (!snapshot) {
    return "border-border bg-muted"
  }

  if (snapshotFreshnessStatus(snapshot) === "old") {
    return "border-amber-300 bg-amber-50 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100"
  }

  if (layerStatus(snapshot, activeLayer) === "critical") {
    return "border-red-300 bg-red-50 text-red-950 dark:bg-red-950/30 dark:text-red-100"
  }

  if (layerStatus(snapshot, activeLayer) === "watch") {
    return "border-amber-300 bg-amber-50 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100"
  }

  return "border-emerald-300 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-100"
}

export function RegionOperationsMap({
  activeLayer,
  filteredRegions,
  onSelectRegion,
  selectedRegionId,
}: RegionOperationsMapProps) {
  const [isPending, startTransition] = useTransition()
  const [selectedWaterSystemId, setSelectedWaterSystemId] = useState<string | null>(null)
  const activeLayerConfig = layerConfigs[activeLayer]
  const availableWaterSystems = useMemo(
    () =>
      waterSystems
        .map((system) => ({
          ...system,
          visibleStateCount: waterSystemStateCount(
            system,
            filteredRegions.map(({ region }) => region)
          ),
        }))
        .filter((system) => system.visibleStateCount > 0),
    [filteredRegions]
  )
  const selectedWaterSystem =
    availableWaterSystems.find((system) => system.id === selectedWaterSystemId) ??
    null
  const visibleRegions = selectedWaterSystem
    ? filteredRegions.filter(({ region }) =>
        regionBelongsToWaterSystem(region, selectedWaterSystem)
      )
    : filteredRegions

  return (
    <section className="rounded-md border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-medium">State overview</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeLayerConfig.description}
          </p>
        </div>
        <span className="rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground">
          {isPending ? "Selecting" : `${activeLayerConfig.label} layer`}
        </span>
      </div>

      {filteredRegions.length ? (
        <div className="grid gap-3">
          <WaterSystemSelector
            systems={availableWaterSystems}
            selectedSystemId={selectedWaterSystem?.id ?? null}
            totalCount={filteredRegions.length}
            onSelectSystem={(systemId) => {
              const nextSystem =
                availableWaterSystems.find((system) => system.id === systemId) ?? null

              setSelectedWaterSystemId(systemId)

              if (nextSystem) {
                const firstRegion = filteredRegions.find(({ region }) =>
                  regionBelongsToWaterSystem(region, nextSystem)
                )

                if (firstRegion) {
                  startTransition(() => onSelectRegion(firstRegion.region.id))
                }
              }
            }}
          />

          <GermanyStateMap
            activeLayer={activeLayer}
            filteredRegions={visibleRegions}
            selectedRegionId={selectedRegionId}
            onSelectRegion={onSelectRegion}
          />

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {visibleRegions.map(({ region, snapshot }) => {
              const selected = selectedRegionId === region.id
              const freshnessStatus = snapshot ? snapshotFreshnessStatus(snapshot) : null
              const primaryValue = snapshot ? activeLayerConfig.metric(snapshot) : 0

              return (
                <button
                  aria-label={`Select ${region.name}; ${activeLayerConfig.label} ${primaryValue} percent; ${region.basin}`}
                  aria-pressed={selected}
                  className={cn(
                    "min-h-36 rounded-md border p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring/30",
                    riskClass(snapshot, activeLayer),
                    selected && "ring-2 ring-primary/40"
                  )}
                  key={region.id}
                  onClick={() => {
                    startTransition(() => onSelectRegion(region.id))
                  }}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{region.name}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs opacity-75">
                        <span className="truncate">{region.basin} system</span>
                        {snapshot && freshnessStatus ? (
                          <span className="rounded-sm bg-background/70 px-1.5 py-0.5 text-[0.65rem] font-medium capitalize">
                            {freshnessStatus} · {freshnessLabel(snapshot)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-sm bg-background/70 px-1.5 py-0.5 text-[0.65rem] font-medium">
                      {region.code}
                    </span>
                  </div>

                  <div className="mt-5">
                    <div className="flex items-end justify-between gap-2">
                      <div className="text-xs opacity-75">
                        {activeLayerConfig.shortLabel}
                      </div>
                      <div className="text-2xl font-semibold">{primaryValue}%</div>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-background/70">
                      <div
                        className="h-full rounded-full bg-current"
                        style={{ width: `${primaryValue}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-1.5 text-xs">
                    <MetricPill
                      active={activeLayer === "water-level"}
                      label="Water"
                      value={snapshot?.waterLevel ?? 0}
                    />
                    <MetricPill
                      active={activeLayer === "rainfall"}
                      label="Rain"
                      value={snapshot?.rainfallIndex ?? 0}
                    />
                    <MetricPill
                      active={activeLayer === "confidence"}
                      label="Conf."
                      value={snapshot?.confidenceScore ?? 0}
                    />
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
          No states match the active filter
        </div>
      )}
    </section>
  )
}

type VisibleWaterSystem = (typeof waterSystems)[number] & {
  visibleStateCount: number
}

type WaterSystemSelectorProps = {
  onSelectSystem: (systemId: string | null) => void
  selectedSystemId: string | null
  systems: VisibleWaterSystem[]
  totalCount: number
}

function WaterSystemSelector({
  onSelectSystem,
  selectedSystemId,
  systems,
  totalCount,
}: WaterSystemSelectorProps) {
  return (
    <div className="rounded-md border bg-background p-2">
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <div className="text-xs font-medium text-muted-foreground">
          Water system view
        </div>
        <div className="text-xs text-muted-foreground">
          {selectedSystemId ? "Subset" : "All states"}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button
          aria-pressed={!selectedSystemId}
          className={cn(
            "rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-accent",
            !selectedSystemId
              ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-card text-muted-foreground hover:text-foreground"
          )}
          onClick={() => onSelectSystem(null)}
          type="button"
        >
          All
          <span className="ml-1 opacity-75">{totalCount}</span>
        </button>
        {systems.map((system) => (
          <button
            aria-label={`Show ${system.name} water system, ${system.visibleStateCount} states`}
            aria-pressed={selectedSystemId === system.id}
            className={cn(
              "rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-accent",
              selectedSystemId === system.id
                ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-card text-muted-foreground hover:text-foreground"
            )}
            key={system.id}
            onClick={() => onSelectSystem(system.id)}
            type="button"
          >
            {system.name}
            <span className="ml-1 opacity-75">{system.visibleStateCount}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

type MetricPillProps = {
  active: boolean
  label: string
  value: number
}

function MetricPill({ active, label, value }: MetricPillProps) {
  return (
    <div
      className={cn(
        "rounded-sm bg-background/50 px-1.5 py-1",
        active && "bg-background/80"
      )}
    >
      <div className="opacity-70">{label}</div>
      <div className="font-semibold">{value}%</div>
    </div>
  )
}
