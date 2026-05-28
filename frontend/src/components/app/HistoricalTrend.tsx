import { useState } from "react"

import { cn } from "@/lib/utils"
import {
  freshnessLabel,
  snapshotFreshnessStatus,
} from "@/services/snapshot-freshness"
import type { ReservoirSnapshot } from "@/services/types"

type HistoricalTrendProps = {
  history: ReservoirSnapshot[]
}

type HistoryMetric = "confidenceScore" | "rainfallIndex" | "waterLevel"

const metrics: {
  key: HistoryMetric
  label: string
  tone: string
}[] = [
  {
    key: "waterLevel",
    label: "Water",
    tone: "bg-primary",
  },
  {
    key: "rainfallIndex",
    label: "Rain",
    tone: "bg-sky-500",
  },
  {
    key: "confidenceScore",
    label: "Confidence",
    tone: "bg-emerald-500",
  },
]

export function HistoricalTrend({ history }: HistoricalTrendProps) {
  const [metric, setMetric] = useState<HistoryMetric>("waterLevel")
  const points = history
  const activeMetric = metrics.find((item) => item.key === metric) ?? metrics[0]
  const latestPoint = points.at(-1)
  const observationLabel =
    points.length === 1 ? "1 observation" : `${points.length} observations`
  const rangeLabel = points.length
    ? `${formatShortDate(points[0].timestamp)} - ${formatShortDate(points.at(-1)?.timestamp)}`
    : "No range"

  return (
    <div className="min-w-0 overflow-hidden rounded-md border bg-background p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-medium">Historical trend</h3>
          <p className="truncate text-xs text-muted-foreground">
            {activeMetric.label} history · {rangeLabel}
          </p>
        </div>
        <span className="shrink-0 rounded-md border bg-card px-2 py-1 text-xs text-muted-foreground">
          {observationLabel}
        </span>
      </div>

      {points.length ? (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex rounded-md border bg-card p-0.5">
              {metrics.map((item) => (
                <button
                  aria-pressed={metric === item.key}
                  className={cn(
                    "h-7 rounded-sm px-2 text-xs font-medium text-muted-foreground transition-colors",
                    metric === item.key && "bg-primary text-primary-foreground"
                  )}
                  key={item.key}
                  onClick={() => setMetric(item.key)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="rounded-md border bg-card px-2 py-1 text-xs text-muted-foreground">
              Latest{" "}
              <span className="font-medium text-foreground">
                {latestPoint?.[metric] ?? 0}%
              </span>
            </div>
          </div>

          <div className="-mx-1 overflow-x-auto px-1 pb-1">
            <div className="flex h-48 min-w-max items-end gap-2 lg:h-64">
              {points.map((point, index) => {
                const freshness = snapshotFreshnessStatus(point)
                const value = point[metric]

                return (
                  <div
                    className="flex w-7 flex-none flex-col items-center gap-1"
                    key={point.id ?? `${point.regionId}-${point.timestamp}-${index}`}
                    title={`${activeMetric.label}: ${value}% · ${freshnessLabel(point)}`}
                  >
                    <div className="relative flex h-36 w-full items-end rounded-sm bg-muted lg:h-52">
                      <div
                        className={cn(
                          "w-full rounded-sm",
                          activeMetric.tone,
                          freshness !== "current" && "opacity-60"
                        )}
                        style={{
                          height: `${value}%`,
                          opacity:
                            freshness === "current"
                              ? Math.max(0.42, point.confidenceScore / 100)
                              : 0.5,
                        }}
                      />
                      {freshness !== "current" ? (
                        <span className="absolute -top-1 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-amber-500" />
                      ) : null}
                    </div>
                    <span className="text-[0.6rem] text-muted-foreground">
                      {formatShortDate(point.timestamp)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span className={cn("size-2 rounded-full", activeMetric.tone)} />
              {activeMetric.label}
            </span>
            {points.some((point) => snapshotFreshnessStatus(point) !== "current") ? (
              <span className="inline-flex items-center gap-1">
                <span className="size-2 rounded-full bg-amber-500" />
                Stale marker
              </span>
            ) : null}
          </div>
        </>
      ) : (
        <div className="rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground">
          Waiting for historical observations
        </div>
      )}
    </div>
  )
}

function formatShortDate(timestamp: string | undefined) {
  if (!timestamp) {
    return "n/a"
  }

  return new Date(timestamp).toLocaleDateString("en-DE", {
    day: "2-digit",
    month: "2-digit",
  })
}
