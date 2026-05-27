import {
  snapshotFreshnessStatus,
  snapshotSourceTags,
} from "@/services/snapshot-freshness"
import type { Region, ReservoirSnapshot } from "@/services/types"
import type { RegionalFilter } from "@/stores/app-store"

export type RegionWithSnapshot = {
  region: Region
  snapshot: ReservoirSnapshot | undefined
}

export const regionalFilterLabels: Record<RegionalFilter, string> = {
  all: "All",
  elevated: "Elevated",
  fallback: "Fallback",
  "low-confidence": "Low confidence",
  stale: "Stale",
}

export const regionalFilterOrder: RegionalFilter[] = [
  "all",
  "elevated",
  "stale",
  "fallback",
  "low-confidence",
]

export function regionMatchesFilter(
  snapshot: ReservoirSnapshot | undefined,
  filter: RegionalFilter
) {
  if (filter === "all") {
    return true
  }

  if (!snapshot) {
    return false
  }

  if (filter === "elevated") {
    return snapshot.waterLevel >= 72 || snapshot.evaporationPressure >= 62
  }

  if (filter === "fallback") {
    return snapshotSourceTags(snapshot).some((source) => source.kind === "fallback")
  }

  if (filter === "low-confidence") {
    return snapshot.confidenceScore < 74 || snapshot.visibilityScore < 64
  }

  return snapshotFreshnessStatus(snapshot) !== "current"
}

export function filterRegions(
  regions: Region[],
  snapshots: ReservoirSnapshot[],
  filter: RegionalFilter
): RegionWithSnapshot[] {
  return regions
    .map((region) => ({
      region,
      snapshot: snapshots.find((snapshot) => snapshot.regionId === region.id),
    }))
    .filter(({ snapshot }) => regionMatchesFilter(snapshot, filter))
}

export function regionalFilterCounts(
  regions: Region[],
  snapshots: ReservoirSnapshot[]
) {
  return regionalFilterOrder.reduce(
    (counts, filter) => ({
      ...counts,
      [filter]: filterRegions(regions, snapshots, filter).length,
    }),
    {} as Record<RegionalFilter, number>
  )
}
