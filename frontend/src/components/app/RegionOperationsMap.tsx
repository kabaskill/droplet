import { useTransition } from "react"

import { cn } from "@/lib/utils"
import {
  freshnessLabel,
  snapshotFreshnessStatus,
} from "@/services/snapshot-freshness"
import type { Region, ReservoirSnapshot } from "@/services/types"

type RegionOperationsMapProps = {
  onSelectRegion: (regionId: string) => void
  regions: Region[]
  selectedRegionId: string | null
  snapshots: ReservoirSnapshot[]
}

function riskClass(snapshot?: ReservoirSnapshot) {
  if (!snapshot) {
    return "border-border bg-muted"
  }

  if (snapshotFreshnessStatus(snapshot) === "old") {
    return "border-amber-300 bg-amber-50 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100"
  }

  if (snapshot.waterLevel > 72 || snapshot.evaporationPressure > 62) {
    return "border-red-300 bg-red-50 text-red-950 dark:bg-red-950/30 dark:text-red-100"
  }

  if (snapshot.confidenceScore < 74 || snapshot.visibilityScore < 64) {
    return "border-amber-300 bg-amber-50 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100"
  }

  return "border-emerald-300 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-100"
}

export function RegionOperationsMap({
  onSelectRegion,
  regions,
  selectedRegionId,
  snapshots,
}: RegionOperationsMapProps) {
  const [isPending, startTransition] = useTransition()

  return (
    <section className="rounded-md border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-medium">Regional state</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Basin snapshots grouped for operational review
          </p>
        </div>
        <span className="rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground">
          {isPending ? "Selecting" : `${regions.length} regions`}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {regions.map((region) => {
          const snapshot = snapshots.find((item) => item.regionId === region.id)
          const selected = selectedRegionId === region.id
          const freshnessStatus = snapshot ? snapshotFreshnessStatus(snapshot) : null

          return (
            <button
              aria-pressed={selected}
              className={cn(
                "min-h-36 rounded-md border p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring/30",
                riskClass(snapshot),
                selected && "ring-2 ring-primary/40"
              )}
              key={region.id}
              onClick={() => {
                startTransition(() => onSelectRegion(region.id))
              }}
              type="button"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{region.name}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs opacity-75">
                    <span className="truncate">{region.basin}</span>
                    {snapshot && freshnessStatus ? (
                      <span className="rounded-sm bg-background/70 px-1.5 py-0.5 text-[0.65rem] font-medium capitalize">
                        {freshnessStatus} · {freshnessLabel(snapshot)}
                      </span>
                    ) : null}
                  </div>
                </div>
                <span className="shrink-0 rounded-sm bg-background/70 px-1.5 py-0.5 text-[0.65rem] font-medium">
                  {region.code}
                </span>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="opacity-70">Water</div>
                  <div className="font-semibold">{snapshot?.waterLevel ?? 0}%</div>
                </div>
                <div>
                  <div className="opacity-70">Rain</div>
                  <div className="font-semibold">{snapshot?.rainfallIndex ?? 0}%</div>
                </div>
                <div>
                  <div className="opacity-70">Conf.</div>
                  <div className="font-semibold">{snapshot?.confidenceScore ?? 0}%</div>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
