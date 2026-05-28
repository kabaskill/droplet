import { FilterHorizontalIcon } from "@hugeicons/core-free-icons"
import { useMemo, useState, useTransition } from "react"

import { GermanyStateMap } from "@/components/app/GermanyStateMap"
import { ProductIcon } from "@/components/app/ProductIcon"
import { cn } from "@/lib/utils"
import {
  regionalFilterLabels,
  regionalFilterOrder,
  type RegionWithSnapshot,
} from "@/services/regional-filters"
import type { ReservoirSnapshot } from "@/services/types"
import {
  regionBelongsToWaterSystem,
  waterSystems,
  waterSystemStateCount,
} from "@/services/water-systems"
import type { MapLayer } from "@/stores/app-store"
import type { RegionalFilter } from "@/stores/app-store"

type RegionOperationsMapProps = {
  activeFilter: RegionalFilter
  activeLayer: MapLayer
  allRegions: RegionWithSnapshot[]
  filterCounts: Record<RegionalFilter, number>
  filteredRegions: RegionWithSnapshot[]
  onFilterChange: (filter: RegionalFilter) => void
  onLayerChange: (layer: MapLayer) => void
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
    description: "Rainfall availability across observed states",
    label: "Rainfall",
    metric: (snapshot) => snapshot.rainfallIndex,
    shortLabel: "Rain",
  },
  "water-level": {
    description: "Normalized river and reservoir availability by state",
    label: "Water level",
    metric: (snapshot) => snapshot.waterLevel,
    shortLabel: "Water",
  },
}

const layers: { id: MapLayer; label: string }[] = [
  { id: "water-level", label: "Water" },
  { id: "rainfall", label: "Rain" },
  { id: "confidence", label: "Confidence" },
]

export function RegionOperationsMap({
  activeFilter,
  activeLayer,
  allRegions,
  filterCounts,
  filteredRegions,
  onFilterChange,
  onLayerChange,
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
            allRegions.map(({ region }) => region)
          ),
        }))
        .filter((system) => system.visibleStateCount > 0),
    [allRegions]
  )
  const selectedWaterSystem =
    availableWaterSystems.find((system) => system.id === selectedWaterSystemId) ??
    null
  const visibleFilteredRegions = selectedWaterSystem
    ? filteredRegions.filter(({ region }) =>
        regionBelongsToWaterSystem(region, selectedWaterSystem)
      )
    : filteredRegions
  const fallbackMapRegions = selectedWaterSystem
    ? allRegions.filter(({ region }) =>
        regionBelongsToWaterSystem(region, selectedWaterSystem)
      )
    : allRegions
  const visibleRegions = visibleFilteredRegions.length
    ? visibleFilteredRegions
    : fallbackMapRegions

  return (
    <section className="flex h-full flex-col rounded-md border bg-card p-4 shadow-sm">
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

      <div className="flex min-h-0 flex-1 flex-col gap-3">
        {!visibleFilteredRegions.length ? (
          <div className="rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
            No states match the active filter. Showing the full map for context.
          </div>
        ) : null}
        <GermanyStateMap
          activeLayer={activeLayer}
          filteredRegions={visibleRegions}
          selectedRegionId={selectedRegionId}
          onSelectRegion={onSelectRegion}
          controls={
            <MapControlPanel
              activeFilter={activeFilter}
              activeLayer={activeLayer}
              filterCounts={filterCounts}
              selectedSystem={selectedWaterSystem}
              selectedSystemId={selectedWaterSystem?.id ?? null}
              systems={availableWaterSystems}
              totalCount={allRegions.length}
              onFilterChange={onFilterChange}
              onLayerChange={onLayerChange}
              onSelectSystem={(systemId) => {
                const nextSystem =
                  availableWaterSystems.find((system) => system.id === systemId) ?? null

                setSelectedWaterSystemId(systemId)

                if (nextSystem) {
                  const firstRegion = allRegions.find(({ region }) =>
                    regionBelongsToWaterSystem(region, nextSystem)
                  )

                  if (firstRegion) {
                    startTransition(() => onSelectRegion(firstRegion.region.id))
                  }
                }
              }}
            />
          }
        />
      </div>
    </section>
  )
}

type VisibleWaterSystem = (typeof waterSystems)[number] & {
  visibleStateCount: number
}

type WaterSystemSelectorProps = {
  onSelectSystem: (systemId: string | null) => void
  selectedSystem: VisibleWaterSystem | null
  selectedSystemId: string | null
  systems: VisibleWaterSystem[]
  totalCount: number
}

type MapControlPanelProps = WaterSystemSelectorProps & {
  activeFilter: RegionalFilter
  activeLayer: MapLayer
  filterCounts: Record<RegionalFilter, number>
  onFilterChange: (filter: RegionalFilter) => void
  onLayerChange: (layer: MapLayer) => void
}

function MapControlPanel({
  activeFilter,
  activeLayer,
  filterCounts,
  onFilterChange,
  onLayerChange,
  ...selectorProps
}: MapControlPanelProps) {
  const [open, setOpen] = useState(false)
  const activeLayerConfig = layers.find((layer) => layer.id === activeLayer)

  return (
    <div className="w-fit max-w-full">
      <button
        aria-expanded={open}
        className={cn(
          "flex h-9 items-center gap-2 rounded-md border bg-background/95 px-3 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur transition-colors hover:bg-accent hover:text-foreground",
          open && "bg-accent text-foreground"
        )}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <ProductIcon icon={FilterHorizontalIcon} size={14} />
        Map controls
        <span className="hidden text-muted-foreground sm:inline">
          {activeLayerConfig?.label ?? "Layer"} · {regionalFilterLabels[activeFilter]}
        </span>
      </button>

      {open ? (
        <div className="mt-2 grid max-h-[68svh] w-[min(320px,calc(100vw-2rem))] gap-2 overflow-y-auto rounded-md border bg-background/95 p-2 shadow-lg backdrop-blur">
          <div
            aria-label="Map layer"
            className="flex flex-wrap gap-1 rounded-md border bg-card p-0.5"
            role="group"
          >
            {layers.map((layer) => (
              <button
                aria-pressed={activeLayer === layer.id}
                className={cn(
                  "h-8 rounded-sm px-2 text-xs font-medium text-muted-foreground transition-colors",
                  activeLayer === layer.id && "bg-primary text-primary-foreground"
                )}
                key={layer.id}
                onClick={() => onLayerChange(layer.id)}
                type="button"
              >
                {layer.label}
              </button>
            ))}
          </div>
          <div className="rounded-md border bg-card p-2">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <ProductIcon icon={FilterHorizontalIcon} size={14} />
              Filters
            </div>
            <div className="flex flex-wrap gap-1">
              {regionalFilterOrder.map((filter) => (
                <button
                  aria-label={`Show ${regionalFilterLabels[filter]} states, ${filterCounts[filter]} matches`}
                  aria-pressed={activeFilter === filter}
                  className={cn(
                    "rounded-md border bg-background px-2 py-1 text-[0.7rem] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                    activeFilter === filter &&
                      "border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                  )}
                  key={filter}
                  onClick={() => onFilterChange(filter)}
                  type="button"
                >
                  {regionalFilterLabels[filter]}
                  <span className="ml-1 opacity-75">{filterCounts[filter]}</span>
                </button>
              ))}
            </div>
          </div>
          <WaterSystemSelector {...selectorProps} />
          <button
            className="h-8 rounded-md border bg-card px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            onClick={() => setOpen(false)}
            type="button"
          >
            Close controls
          </button>
        </div>
      ) : null}
    </div>
  )
}

function WaterSystemSelector({
  onSelectSystem,
  selectedSystem,
  selectedSystemId,
  systems,
  totalCount,
}: WaterSystemSelectorProps) {
  return (
    <div className="rounded-md border bg-card p-2">
      <div className="mb-2 flex flex-col gap-2 px-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 text-xs font-medium text-muted-foreground">
          Water system view
          {selectedSystem ? (
            <span className="ml-1 text-foreground">
              · Viewing {selectedSystem.name} · {selectedSystem.visibleStateCount} states
            </span>
          ) : null}
        </div>
        {selectedSystem ? (
          <button
            className="w-fit rounded-md border bg-card px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            onClick={() => onSelectSystem(null)}
            type="button"
          >
            Clear
          </button>
        ) : (
          <div className="text-xs text-muted-foreground">All states</div>
        )}
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
