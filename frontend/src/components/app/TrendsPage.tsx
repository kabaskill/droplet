import { Activity02Icon } from "@hugeicons/core-free-icons"
import { useState } from "react"

import { HistoricalTrend } from "@/components/app/HistoricalTrend"
import { ProductIcon } from "@/components/app/ProductIcon"
import { RegionComparisonPanel } from "@/components/app/RegionComparisonPanel"
import { useDashboardData } from "@/components/app/dashboard-data"
import { cn } from "@/lib/utils"
import type { MapLayer } from "@/stores/app-store"

const comparisonLayers: { id: MapLayer; label: string }[] = [
  { id: "water-level", label: "Water" },
  { id: "rainfall", label: "Rainfall" },
  { id: "confidence", label: "Confidence" },
]

export function TrendsPage() {
  const [comparisonLayer, setComparisonLayer] = useState<MapLayer>("water-level")
  const {
    activeRegion,
    filteredRegions,
    historyQuery,
    selectedRegionId,
    setSelectedRegionId,
  } = useDashboardData()

  return (
    <main className="mx-auto grid max-w-7xl gap-4 p-4 pb-24 md:p-6 lg:pb-6">
      <section className="rounded-md border bg-card p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <ProductIcon icon={Activity02Icon} size={18} />
          </span>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold">Trends</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Historical observations and state ranking for the selected layer.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
        <HistoricalTrend history={historyQuery.data ?? []} />
        <div className="grid gap-3">
          <div
            aria-label="Comparison metric"
            className="flex w-fit rounded-md border bg-card p-0.5"
            role="group"
          >
            {comparisonLayers.map((layer) => (
              <button
                aria-pressed={comparisonLayer === layer.id}
                className={cn(
                  "h-8 rounded-sm px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                  comparisonLayer === layer.id &&
                    "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                )}
                key={layer.id}
                onClick={() => setComparisonLayer(layer.id)}
                type="button"
              >
                {layer.label}
              </button>
            ))}
          </div>
          <RegionComparisonPanel
            activeLayer={comparisonLayer}
            filteredRegions={filteredRegions}
            selectedRegionId={selectedRegionId}
            onSelectRegion={setSelectedRegionId}
          />
        </div>
      </div>

      {activeRegion ? (
        <section className="rounded-md border bg-card p-4 text-sm text-muted-foreground shadow-sm">
          Selected state:{" "}
          <span className="font-medium text-foreground">{activeRegion.name}</span> ·{" "}
          {activeRegion.basin} water system
        </section>
      ) : null}
    </main>
  )
}
