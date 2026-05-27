import { ChartBarLineIcon } from "@hugeicons/core-free-icons"

import { ProductIcon } from "@/components/app/ProductIcon"
import { cn } from "@/lib/utils"
import type { Region, ReservoirSnapshot } from "@/services/types"
import type { MapLayer } from "@/stores/app-store"

type RegionComparisonPanelProps = {
  activeLayer: MapLayer
  onSelectRegion: (regionId: string) => void
  regions: Region[]
  selectedRegionId: string | null
  snapshots: ReservoirSnapshot[]
}

type LayerComparator = {
  description: string
  label: string
  metric: (snapshot: ReservoirSnapshot) => number
}

const layerComparators: Record<MapLayer, LayerComparator> = {
  confidence: {
    description: "Ranks regions by confidence quality in the latest read model.",
    label: "Confidence",
    metric: (snapshot) => snapshot.confidenceScore,
  },
  rainfall: {
    description: "Ranks regions by rainfall pressure in the latest read model.",
    label: "Rainfall",
    metric: (snapshot) => snapshot.rainfallIndex,
  },
  "water-level": {
    description: "Ranks regions by normalized water level in the latest read model.",
    label: "Water level",
    metric: (snapshot) => snapshot.waterLevel,
  },
}

export function RegionComparisonPanel({
  activeLayer,
  onSelectRegion,
  regions,
  selectedRegionId,
  snapshots,
}: RegionComparisonPanelProps) {
  const comparator = layerComparators[activeLayer]
  const rows = regions
    .map((region) => {
      const snapshot = snapshots.find((item) => item.regionId === region.id)

      return {
        metric: snapshot ? comparator.metric(snapshot) : 0,
        region,
        snapshot,
      }
    })
    .sort((first, second) => second.metric - first.metric)

  return (
    <section className="rounded-md border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-medium">Region comparison</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {comparator.description}
          </p>
        </div>
        <span className="flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground">
          <ProductIcon icon={ChartBarLineIcon} size={14} />
          {comparator.label}
        </span>
      </div>

      <div className="grid gap-2">
        {rows.map(({ metric, region, snapshot }, index) => (
          <button
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
                {region.basin} · {region.federalState}
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
    return "bg-red-500"
  }

  if (metric >= 45) {
    return "bg-amber-500"
  }

  return "bg-emerald-500"
}
