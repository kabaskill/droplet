import type { ReservoirSnapshot } from "@/services/types"

type HistoricalTrendProps = {
  history: ReservoirSnapshot[]
}

export function HistoricalTrend({ history }: HistoricalTrendProps) {
  const points = history.slice(-30)
  const observationLabel =
    points.length === 1 ? "1 observation" : `${points.length} observations`

  return (
    <div className="min-w-0 overflow-hidden rounded-md border bg-background p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-medium">Historical trend</h3>
          <p className="text-xs text-muted-foreground">
            Water level and confidence
          </p>
        </div>
        <span className="shrink-0 rounded-md border bg-card px-2 py-1 text-xs text-muted-foreground">
          {observationLabel}
        </span>
      </div>

      {points.length ? (
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <div className="flex h-36 min-w-max items-end gap-2">
            {points.map((point, index) => (
              <div
                className="flex w-7 flex-none flex-col items-center gap-1"
                key={point.id ?? `${point.regionId}-${point.timestamp}-${index}`}
              >
                <div className="flex h-28 w-full items-end rounded-sm bg-muted">
                  <div
                    className="w-full rounded-sm bg-primary"
                    style={{
                      height: `${point.waterLevel}%`,
                      opacity: Math.max(0.35, point.confidenceScore / 100),
                    }}
                  />
                </div>
                <span className="text-[0.6rem] text-muted-foreground">
                  {new Date(point.timestamp).toLocaleDateString("en-DE", {
                    day: "2-digit",
                    month: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground">
          Waiting for historical observations
        </div>
      )}
    </div>
  )
}
