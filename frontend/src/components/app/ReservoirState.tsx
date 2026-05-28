import { cn } from "@/lib/utils"
import type { ReservoirSnapshot } from "@/services/types"

type ReservoirStateProps = {
  snapshot: ReservoirSnapshot
}

export function ReservoirState({ snapshot }: ReservoirStateProps) {
  return (
    <div className="min-w-0 overflow-hidden rounded-md border bg-background p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-medium">Reservoir state</h3>
          <p className="truncate text-xs text-muted-foreground">
            Visibility-weighted snapshot
          </p>
        </div>
        <span
          className={cn(
            "rounded-md px-2 py-1 text-xs font-medium capitalize",
            snapshot.trend === "rising" && "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
            snapshot.trend === "stable" && "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
            snapshot.trend === "falling" && "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
          )}
        >
          {snapshot.trend}
        </span>
      </div>

      <div className="relative h-44 overflow-hidden rounded-md border bg-muted">
        <div
          className="absolute inset-x-0 bottom-0 bg-primary/70 transition-all"
          style={{
            height: `${snapshot.waterLevel}%`,
            opacity: Math.max(0.35, snapshot.confidenceScore / 100),
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 border-t border-primary-foreground/70"
          style={{ height: `${snapshot.visibilityScore}%` }}
        />
        <div className="absolute inset-0 grid grid-rows-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div className="border-t border-background/60" key={index} />
          ))}
        </div>
        <div className="absolute bottom-3 left-3 rounded-md bg-background/85 px-2 py-1 text-xs font-medium backdrop-blur">
          {snapshot.waterLevel}% filled
        </div>
      </div>
    </div>
  )
}
