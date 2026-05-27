import type { ReservoirSnapshot } from "@/services/types"

type HistoricalTrendProps = {
  history: ReservoirSnapshot[]
}

export function HistoricalTrend({ history }: HistoricalTrendProps) {
  const points = history.slice(-9)

  return (
    <div className="rounded-md border bg-background p-4">
      <div className="mb-3">
        <h3 className="text-sm font-medium">Historical trend</h3>
        <p className="text-xs text-muted-foreground">Water level and confidence</p>
      </div>

      <div className="flex h-36 items-end gap-2">
        {points.map((point, index) => (
          <div
            className="flex min-w-0 flex-1 flex-col items-center gap-1"
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
  )
}
