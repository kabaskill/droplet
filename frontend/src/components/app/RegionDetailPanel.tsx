import {
  Activity02Icon,
  CloudMidRainIcon,
  DatabaseSyncIcon,
  ThermometerIcon,
} from "@hugeicons/core-free-icons"

import { HistoricalTrend } from "@/components/app/HistoricalTrend"
import { MetricTile } from "@/components/app/MetricTile"
import { ReservoirState } from "@/components/app/ReservoirState"
import type { Region, ReservoirSnapshot } from "@/services/types"

type RegionDetailPanelProps = {
  history: ReservoirSnapshot[]
  region: Region
  snapshot: ReservoirSnapshot
}

export function RegionDetailPanel({
  history,
  region,
  snapshot,
}: RegionDetailPanelProps) {
  return (
    <aside className="grid gap-4 xl:grid-cols-1">
      <section className="rounded-md border bg-card p-4 shadow-sm">
        <div className="mb-4">
          <div className="text-xs font-medium uppercase text-muted-foreground">
            {region.federalState}
          </div>
          <h2 className="mt-1 text-lg font-semibold">{region.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {snapshot.source} · {new Date(snapshot.timestamp).toLocaleString("en-DE")}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <MetricTile
            icon={CloudMidRainIcon}
            label="Rainfall"
            tone="blue"
            value={`${snapshot.rainfallIndex}%`}
          />
          <MetricTile
            icon={Activity02Icon}
            label="Water level"
            tone="green"
            value={`${snapshot.waterLevel}%`}
          />
          <MetricTile
            icon={ThermometerIcon}
            label="Evaporation"
            tone={snapshot.evaporationPressure > 55 ? "amber" : "blue"}
            value={`${snapshot.evaporationPressure}%`}
          />
          <MetricTile
            icon={DatabaseSyncIcon}
            label="Confidence"
            tone={snapshot.confidenceScore > 80 ? "green" : "amber"}
            value={`${snapshot.confidenceScore}%`}
          />
        </div>
      </section>

      <ReservoirState snapshot={snapshot} />
      <HistoricalTrend history={history} />
    </aside>
  )
}
