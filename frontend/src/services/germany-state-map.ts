import {
  snapshotFreshnessStatus,
  snapshotSourceTags,
} from "@/services/snapshot-freshness"
import type { RegionWithSnapshot } from "@/services/regional-filters"
import type { ReservoirSnapshot } from "@/services/types"
import type { MapLayer } from "@/stores/app-store"

export type GermanyStateStatus = "critical" | "healthy" | "stale" | "watch"

export type GermanyStateMetric = {
  code: string
  metric: number
  primaryRegionId: string
  regions: RegionWithSnapshot[]
  status: GermanyStateStatus
  title: string
}

const mapStatesByFederalState: Record<string, string[]> = {
  "Baden-Wurttemberg": ["DE-BW"],
  "Baden-Württemberg": ["DE-BW"],
  Bavaria: ["DE-BY"],
  Berlin: ["DE-BE"],
  Brandenburg: ["DE-BB"],
  Bremen: ["DE-HB"],
  Hamburg: ["DE-HH"],
  Hesse: ["DE-HE"],
  "Lower Saxony": ["DE-NI"],
  "Mecklenburg-Vorpommern": ["DE-MV"],
  "North Rhine-Westphalia": ["DE-NW"],
  "Rhineland-Palatinate": ["DE-RP"],
  Saarland: ["DE-SL"],
  Saxony: ["DE-SN"],
  "Saxony-Anhalt": ["DE-ST"],
  "Schleswig-Holstein": ["DE-SH"],
  Thuringia: ["DE-TH"],
}

export const germanyStateTitles: Record<string, string> = {
  "DE-BB": "Brandenburg",
  "DE-BE": "Berlin",
  "DE-BW": "Baden-Wurttemberg",
  "DE-BY": "Bavaria",
  "DE-HB": "Bremen",
  "DE-HE": "Hesse",
  "DE-HH": "Hamburg",
  "DE-MV": "Mecklenburg-Vorpommern",
  "DE-NI": "Lower Saxony",
  "DE-NW": "North Rhine-Westphalia",
  "DE-RP": "Rhineland-Palatinate",
  "DE-SH": "Schleswig-Holstein",
  "DE-SL": "Saarland",
  "DE-SN": "Saxony",
  "DE-ST": "Saxony-Anhalt",
  "DE-TH": "Thuringia",
}

export function buildGermanyStateMetrics(
  regions: RegionWithSnapshot[],
  activeLayer: MapLayer
) {
  const states = new Map<string, RegionWithSnapshot[]>()

  for (const regionWithSnapshot of regions) {
    for (const stateCode of stateCodesForRegion(regionWithSnapshot.region.federalState)) {
      states.set(stateCode, [...(states.get(stateCode) ?? []), regionWithSnapshot])
    }
  }

  return Array.from(states.entries()).reduce(
    (metrics, [code, stateRegions]) => ({
      ...metrics,
      [code]: buildStateMetric(code, stateRegions, activeLayer),
    }),
    {} as Record<string, GermanyStateMetric>
  )
}

function buildStateMetric(
  code: string,
  regions: RegionWithSnapshot[],
  activeLayer: MapLayer
): GermanyStateMetric {
  const snapshots = regions
    .map(({ snapshot }) => snapshot)
    .filter((snapshot): snapshot is ReservoirSnapshot => Boolean(snapshot))
  const metric = snapshots.length
    ? Math.round(
        snapshots.reduce((total, snapshot) => total + layerMetric(snapshot, activeLayer), 0) /
          snapshots.length
      )
    : 0

  return {
    code,
    metric,
    primaryRegionId: primaryRegion(regions, activeLayer)?.region.id ?? regions[0].region.id,
    regions,
    status: stateStatus(snapshots, activeLayer),
    title: germanyStateTitles[code] ?? code,
  }
}

function stateCodesForRegion(federalState: string) {
  return federalState
    .split("/")
    .map((state) => state.trim())
    .flatMap((state) => mapStatesByFederalState[state] ?? [])
}

function primaryRegion(regions: RegionWithSnapshot[], activeLayer: MapLayer) {
  return [...regions].sort(
    (first, second) =>
      layerMetric(second.snapshot, activeLayer) - layerMetric(first.snapshot, activeLayer)
  )[0]
}

function layerMetric(
  snapshot: ReservoirSnapshot | undefined,
  activeLayer: MapLayer
) {
  if (!snapshot) {
    return 0
  }

  if (activeLayer === "confidence") {
    return snapshot.confidenceScore
  }

  if (activeLayer === "rainfall") {
    return snapshot.rainfallIndex
  }

  return snapshot.waterLevel
}

function stateStatus(snapshots: ReservoirSnapshot[], activeLayer: MapLayer) {
  if (snapshots.some((snapshot) => snapshotFreshnessStatus(snapshot) !== "current")) {
    return "stale"
  }

  if (
    snapshots.some((snapshot) => snapshotSourceTags(snapshot).some((source) => source.kind === "fallback"))
  ) {
    return "watch"
  }

  if (activeLayer === "confidence") {
    if (snapshots.some((snapshot) => snapshot.confidenceScore < 70 || snapshot.visibilityScore < 58)) {
      return "critical"
    }

    if (snapshots.some((snapshot) => snapshot.confidenceScore < 82 || snapshot.visibilityScore < 68)) {
      return "watch"
    }

    return "healthy"
  }

  if (activeLayer === "rainfall") {
    if (snapshots.some((snapshot) => snapshot.rainfallIndex <= 35)) {
      return "critical"
    }

    if (snapshots.some((snapshot) => snapshot.rainfallIndex <= 50)) {
      return "watch"
    }

    return "healthy"
  }

  if (snapshots.some((snapshot) => snapshot.waterLevel <= 35)) {
    return "critical"
  }

  if (snapshots.some((snapshot) => snapshot.waterLevel <= 50 || snapshot.evaporationPressure >= 62)) {
    return "watch"
  }

  return "healthy"
}
