import {
  Activity02Icon,
  CloudMidRainIcon,
  DatabaseSyncIcon,
  ThermometerIcon,
} from "@hugeicons/core-free-icons"

import { MetricTile } from "@/components/app/MetricTile"
import { cn } from "@/lib/utils"
import {
  freshnessLabel,
  snapshotFreshnessStatus,
  snapshotSourceTags,
} from "@/services/snapshot-freshness"
import type { Region, ReservoirSnapshot } from "@/services/types"

type RegionDetailPanelProps = {
  region: Region
  snapshot: ReservoirSnapshot
}

export function RegionDetailPanel({
  region,
  snapshot,
}: RegionDetailPanelProps) {
  const freshnessStatus = snapshotFreshnessStatus(snapshot)
  const sources = snapshotSourceTags(snapshot)

  return (
    <aside className="grid min-w-0 gap-4 xl:grid-cols-1">
      <section className="min-w-0 rounded-md border bg-card p-4 shadow-sm">
        <div className="mb-4 space-y-3">
          <div className="min-w-0">
            <div className="text-xs font-medium uppercase text-muted-foreground">
              {region.federalState}
            </div>
            <div className="mt-1 flex flex-col gap-3 min-[460px]:flex-row min-[460px]:items-start min-[460px]:justify-between">
              <h2 className="min-w-0 break-words text-lg font-semibold">
                {region.name}
              </h2>
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
            <p className="mt-1 break-words text-sm text-muted-foreground">
              {region.basin} water system ·{" "}
              {new Date(snapshot.timestamp).toLocaleString("en-DE")}
            </p>
          </div>

          <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(8rem,1fr))] gap-1.5">
            {sources.map((source) => (
              <span
                className={cn(
                  "max-w-full break-words rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground",
                  source.kind === "water" && "border-sky-200 text-sky-800 dark:text-sky-200",
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
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-3 min-[380px]:grid-cols-2">
          <MetricTile
            icon={CloudMidRainIcon}
            label="Rainfall"
            tone={availabilityTone(snapshot.rainfallIndex)}
            value={`${snapshot.rainfallIndex}%`}
          />
          <MetricTile
            icon={Activity02Icon}
            label="Water level"
            tone={availabilityTone(snapshot.waterLevel)}
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

        <div className="mt-4 rounded-md border bg-background p-3">
          <div className="mb-2 flex items-center justify-between gap-3 text-xs">
            <span className="font-medium text-muted-foreground">Reservoir fill</span>
            <span className="font-semibold">{snapshot.waterLevel}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full",
                snapshot.waterLevel >= 70
                  ? "bg-emerald-500"
                  : snapshot.waterLevel <= 35
                    ? "bg-red-500"
                    : snapshot.waterLevel <= 50
                      ? "bg-amber-500"
                      : "bg-sky-500"
              )}
              style={{ width: `${snapshot.waterLevel}%` }}
            />
          </div>
          <div className="mt-2 grid grid-cols-[repeat(auto-fit,minmax(7rem,1fr))] gap-2 text-xs text-muted-foreground">
            <span className="min-w-0 break-words">Rain {snapshot.rainfallIndex}%</span>
            <span className="min-w-0 break-words">
              Evap. {snapshot.evaporationPressure}%
            </span>
            <span className="min-w-0 break-words">
              Visibility {snapshot.visibilityScore}%
            </span>
          </div>
        </div>
      </section>
    </aside>
  )
}

function availabilityTone(value: number) {
  if (value >= 70) {
    return "green"
  }

  if (value <= 35) {
    return "red"
  }

  if (value <= 50) {
    return "amber"
  }

  return "blue"
}
