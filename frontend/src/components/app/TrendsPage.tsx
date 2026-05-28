import { Activity02Icon } from "@hugeicons/core-free-icons"
import { useState } from "react"

import { HistoricalTrend } from "@/components/app/HistoricalTrend"
import { ProductIcon } from "@/components/app/ProductIcon"
import { RegionComparisonPanel } from "@/components/app/RegionComparisonPanel"
import { useDashboardData } from "@/components/app/dashboard-data"
import type { MapLayer } from "@/stores/app-store"

export function TrendsPage() {
  const [comparisonLayer, setComparisonLayer] = useState<MapLayer>("water-level")
  const {
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

      <div className="grid gap-4">
        <HistoricalTrend history={historyQuery.data ?? []} />
        <RegionComparisonPanel
          activeLayer={comparisonLayer}
          filteredRegions={filteredRegions}
          selectedRegionId={selectedRegionId}
          onLayerChange={setComparisonLayer}
          onSelectRegion={setSelectedRegionId}
        />
      </div>
    </main>
  )
}
