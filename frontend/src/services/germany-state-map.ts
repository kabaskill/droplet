import {
  snapshotFreshnessStatus,
  snapshotSourceTags,
} from "@/services/snapshot-freshness"
import type { RegionWithSnapshot } from "@/services/regional-filters"
import type {
  ForecastOutlook,
  ForecastRegionOutlook,
  ReservoirSnapshot,
} from "@/services/types"
import type { HomeLayer } from "@/stores/app-store"

export type GermanyStateStatus = "critical" | "healthy" | "stale" | "watch"

export type GermanyStateMetric = {
  code: string
  layerValues: Record<HomeLayer, number>
  metric: number
  primaryRegionId: string
  regions: RegionWithSnapshot[]
  status: GermanyStateStatus
  title: string
  warnings: string[]
}

export type HomeLayerConfig = {
  description: string
  id: HomeLayer
  label: string
  shortLabel: string
}

export const homeLayerConfigs: HomeLayerConfig[] = [
  {
    description: "Blended water, climate, forecast, and data quality score",
    id: "overview",
    label: "Overview",
    shortLabel: "All",
  },
  {
    description: "Latest normalized water availability",
    id: "water",
    label: "Water",
    shortLabel: "Water",
  },
  {
    description: "Rainfall availability balanced against evaporation pressure",
    id: "climate",
    label: "Climate",
    shortLabel: "Climate",
  },
  {
    description: "Short-term outlook converted from pressure into resilience",
    id: "forecast",
    label: "Forecast",
    shortLabel: "Forecast",
  },
  {
    description: "Confidence, visibility, source, and cache freshness",
    id: "quality",
    label: "Data quality",
    shortLabel: "Quality",
  },
]

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
  activeLayer: HomeLayer,
  forecastOutlook: ForecastOutlook | null
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
      [code]: buildStateMetric(code, stateRegions, activeLayer, forecastOutlook),
    }),
    {} as Record<string, GermanyStateMetric>
  )
}

export function homeLayerLabel(layer: HomeLayer) {
  return homeLayerConfigs.find((config) => config.id === layer)?.label ?? "Overview"
}

function buildStateMetric(
  code: string,
  regions: RegionWithSnapshot[],
  activeLayer: HomeLayer,
  forecastOutlook: ForecastOutlook | null
): GermanyStateMetric {
  const regionScores = regions.map((regionWithSnapshot) =>
    regionLayerValues(regionWithSnapshot.snapshot, forecastForRegion(forecastOutlook, regionWithSnapshot.region.id))
  )
  const layerValues = averageLayerValues(regionScores)
  const metric = layerValues[activeLayer]
  const primaryRegion =
    [...regions].sort((first, second) => {
      const firstForecast = forecastForRegion(forecastOutlook, first.region.id)
      const secondForecast = forecastForRegion(forecastOutlook, second.region.id)

      return (
        regionLayerValues(first.snapshot, firstForecast)[activeLayer] -
        regionLayerValues(second.snapshot, secondForecast)[activeLayer]
      )
    })[0] ?? regions[0]

  return {
    code,
    layerValues,
    metric,
    primaryRegionId: primaryRegion.region.id,
    regions,
    status: stateStatus(regions, metric, activeLayer),
    title: germanyStateTitles[code] ?? code,
    warnings: stateWarnings(regions, forecastOutlook),
  }
}

function averageLayerValues(values: Array<Record<HomeLayer, number>>) {
  if (!values.length) {
    return {
      climate: 0,
      forecast: 0,
      overview: 0,
      quality: 0,
      water: 0,
    }
  }

  const totals = values.reduce(
    (currentTotals, value) => ({
      climate: currentTotals.climate + value.climate,
      forecast: currentTotals.forecast + value.forecast,
      overview: currentTotals.overview + value.overview,
      quality: currentTotals.quality + value.quality,
      water: currentTotals.water + value.water,
    }),
    {
      climate: 0,
      forecast: 0,
      overview: 0,
      quality: 0,
      water: 0,
    }
  )

  return {
    climate: Math.round(totals.climate / values.length),
    forecast: Math.round(totals.forecast / values.length),
    overview: Math.round(totals.overview / values.length),
    quality: Math.round(totals.quality / values.length),
    water: Math.round(totals.water / values.length),
  }
}

function regionLayerValues(
  snapshot: ReservoirSnapshot | undefined,
  forecast: ForecastRegionOutlook | null
): Record<HomeLayer, number> {
  if (!snapshot) {
    return {
      climate: 0,
      forecast: forecast ? clampScore(100 - forecast.pressureScore) : 0,
      overview: 0,
      quality: 0,
      water: 0,
    }
  }

  const water = clampScore(snapshot.waterLevel)
  const climate = clampScore(
    Math.round((snapshot.rainfallIndex + (100 - snapshot.evaporationPressure)) / 2)
  )
  const forecastScore = forecast
    ? clampScore(100 - forecast.pressureScore)
    : clampScore(Math.round((snapshot.rainfallIndex + water) / 2))
  const quality = clampScore(
    Math.round(
      (snapshot.confidenceScore +
        snapshot.visibilityScore +
        freshnessScore(snapshot) +
        sourceScore(snapshot)) /
        4
    )
  )
  const overview = clampScore(
    Math.round(water * 0.32 + climate * 0.24 + forecastScore * 0.24 + quality * 0.2)
  )

  return {
    climate,
    forecast: forecastScore,
    overview,
    quality,
    water,
  }
}

function stateCodesForRegion(federalState: string) {
  return federalState
    .split("/")
    .map((state) => state.trim())
    .flatMap((state) => mapStatesByFederalState[state] ?? [])
}

function forecastForRegion(
  forecastOutlook: ForecastOutlook | null,
  regionId: string
) {
  return (
    forecastOutlook?.regions.find((region) => region.regionId === regionId) ?? null
  )
}

function freshnessScore(snapshot: ReservoirSnapshot) {
  const status = snapshotFreshnessStatus(snapshot)

  if (status === "current") {
    return 100
  }

  if (status === "stale") {
    return 58
  }

  return 25
}

function sourceScore(snapshot: ReservoirSnapshot) {
  const sources = snapshotSourceTags(snapshot)

  if (sources.some((source) => source.kind === "fallback")) {
    return 45
  }

  if (
    sources.some((source) => source.kind === "water") &&
    sources.some((source) => source.kind === "weather")
  ) {
    return 100
  }

  return 72
}

function stateStatus(
  regions: RegionWithSnapshot[],
  metric: number,
  activeLayer: HomeLayer
): GermanyStateStatus {
  if (
    activeLayer === "quality" &&
    regions.some(
      ({ snapshot }) => snapshot && snapshotFreshnessStatus(snapshot) !== "current"
    )
  ) {
    return "stale"
  }

  if (metric <= 35) {
    return "critical"
  }

  if (metric <= 55) {
    return "watch"
  }

  return "healthy"
}

function stateWarnings(
  regions: RegionWithSnapshot[],
  forecastOutlook: ForecastOutlook | null
) {
  const warnings = new Set<string>()

  for (const { region, snapshot } of regions) {
    if (!snapshot) {
      warnings.add(`${region.name}: waiting for snapshot`)
      continue
    }

    if (snapshot.waterLevel <= 35) {
      warnings.add(`${region.name}: low water level`)
    }

    if (snapshot.evaporationPressure >= 70) {
      warnings.add(`${region.name}: high evaporation pressure`)
    }

    if (snapshotFreshnessStatus(snapshot) !== "current") {
      warnings.add(`${region.name}: stale snapshot`)
    }

    if (snapshotSourceTags(snapshot).some((source) => source.kind === "fallback")) {
      warnings.add(`${region.name}: fallback source active`)
    }

    const forecast = forecastForRegion(forecastOutlook, region.id)

    if (forecast?.riskLevel === "high") {
      warnings.add(`${region.name}: high forecast pressure`)
    }
  }

  return Array.from(warnings).slice(0, 4)
}

function clampScore(value: number) {
  return Math.min(100, Math.max(0, value))
}
