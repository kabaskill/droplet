import { cn } from "@/lib/utils"
import type { RegionWithSnapshot } from "@/services/regional-filters"
import type { MapLayer } from "@/stores/app-store"

type RegionComparisonPanelProps = {
  activeLayer: MapLayer
  filteredRegions: RegionWithSnapshot[]
  onLayerChange: (layer: MapLayer) => void
  onSelectRegion: (regionId: string) => void
  selectedRegionId: string | null
}

type LayerComparator = {
  description: string
  label: string
  metric: (region: RegionWithSnapshot) => number
}

const layerComparators: Record<MapLayer, LayerComparator> = {
  confidence: {
    description: "Ranks states by confidence quality in the latest read model.",
    label: "Confidence",
    metric: ({ snapshot }) => snapshot?.confidenceScore ?? 0,
  },
  rainfall: {
    description: "Ranks states by rainfall availability in the latest read model.",
    label: "Rainfall",
    metric: ({ snapshot }) => snapshot?.rainfallIndex ?? 0,
  },
  "water-level": {
    description: "Ranks states by normalized water level in the latest read model.",
    label: "Water level",
    metric: ({ snapshot }) => snapshot?.waterLevel ?? 0,
  },
}

const comparisonLayers: { id: MapLayer; label: string }[] = [
  { id: "water-level", label: "Water" },
  { id: "rainfall", label: "Rainfall" },
  { id: "confidence", label: "Confidence" },
]

export function RegionComparisonPanel({
  activeLayer,
  filteredRegions,
  onLayerChange,
  onSelectRegion,
  selectedRegionId,
}: RegionComparisonPanelProps) {
  const comparator = layerComparators[activeLayer]
  const rows = filteredRegions
    .map((regionWithSnapshot) => ({
      ...regionWithSnapshot,
      metric: comparator.metric(regionWithSnapshot),
    }))
    .sort((first, second) => second.metric - first.metric)

  return (
    <section className="rounded-md border bg-card p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h2 className="font-medium">State comparison</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {comparator.description}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            aria-label="Comparison metric"
            className="flex rounded-md border bg-background p-0.5"
            role="group"
          >
            {comparisonLayers.map((layer) => (
              <button
                aria-pressed={activeLayer === layer.id}
                className={cn(
                  "h-8 rounded-sm px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                  activeLayer === layer.id &&
                    "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                )}
                key={layer.id}
                onClick={() => onLayerChange(layer.id)}
                type="button"
              >
                {layer.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {rows.length ? (
        <div className="grid gap-2">
          {rows.map(({ metric, region, snapshot }, index) => (
            <button
              aria-label={`Select ${region.name}; rank ${index + 1}; ${comparator.label} ${metric} percent`}
              aria-pressed={selectedRegionId === region.id}
              className={cn(
                "grid gap-3 rounded-md border bg-background px-3 py-2 text-left text-sm transition-colors hover:bg-accent/60 sm:grid-cols-[40px_minmax(0,1fr)_72px_minmax(96px,160px)] sm:items-center",
                selectedRegionId === region.id && "border-primary/50 bg-accent"
              )}
              key={region.id}
              onClick={() => onSelectRegion(region.id)}
              type="button"
            >
              <span className="text-xs font-medium text-muted-foreground">
                #{index + 1}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium">{region.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {region.basin} system · {region.code}
                </span>
              </span>
              <span className="font-semibold">{metric}%</span>
              <span className="h-2 overflow-hidden rounded-full bg-muted">
                <span
                  className={cn(
                    "block h-full rounded-full",
                    comparisonTone(metric, activeLayer)
                  )}
                  style={{ width: `${metric}%` }}
                />
              </span>
              {snapshot ? null : (
                <span className="text-xs text-muted-foreground sm:col-start-2">
                  Waiting for snapshot
                </span>
              )}
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
          No states match the active filter
        </div>
      )}
    </section>
  )
}

function comparisonTone(metric: number, activeLayer: MapLayer) {
  if (activeLayer === "confidence") {
    if (metric < 70) {
      return "bg-red-500"
    }

    if (metric < 82) {
      return "bg-amber-500"
    }

    return "bg-emerald-500"
  }

  if (metric >= 70) {
    return "bg-emerald-500"
  }

  if (metric <= 35) {
    return "bg-red-500"
  }

  if (metric <= 50) {
    return "bg-amber-500"
  }

  return "bg-sky-500"
}
