import type {
  AiAnalysisResult,
  AnalyticsSummary,
  ForecastOutlook,
  IngestionStatus,
  Region,
  RegionClimate,
  ReservoirSnapshot,
  SourceHealth,
} from "@/services/types"

const timestamp = new Date().toISOString()
const dayMs = 86_400_000

const demoRegionDefinitions: Array<
  Region & {
    confidenceScore: number
    evaporationPressure: number
    rainfallIndex: number
    trend: ReservoirSnapshot["trend"]
    visibilityScore: number
    waterLevel: number
  }
> = [
  {
    basin: "Rhine",
    code: "DE-BW",
    confidenceScore: 86,
    evaporationPressure: 38,
    federalState: "Baden-Wurttemberg",
    id: "baden-wurttemberg",
    name: "Baden-Wurttemberg",
    rainfallIndex: 42,
    riskProfile: "stable",
    sortIndex: 10,
    trend: "stable",
    visibilityScore: 80,
    waterLevel: 63,
  },
  {
    basin: "Danube",
    code: "DE-BY",
    confidenceScore: 83,
    evaporationPressure: 33,
    federalState: "Bavaria",
    id: "bavaria",
    name: "Bavaria",
    rainfallIndex: 48,
    riskProfile: "stable",
    sortIndex: 20,
    trend: "stable",
    visibilityScore: 79,
    waterLevel: 64,
  },
  {
    basin: "Spree",
    code: "DE-BE",
    confidenceScore: 78,
    evaporationPressure: 48,
    federalState: "Berlin",
    id: "berlin",
    name: "Berlin",
    rainfallIndex: 36,
    riskProfile: "volatile",
    sortIndex: 30,
    trend: "falling",
    visibilityScore: 69,
    waterLevel: 52,
  },
  {
    basin: "Oder",
    code: "DE-BB",
    confidenceScore: 72,
    evaporationPressure: 58,
    federalState: "Brandenburg",
    id: "brandenburg",
    name: "Brandenburg",
    rainfallIndex: 37,
    riskProfile: "volatile",
    sortIndex: 40,
    trend: "falling",
    visibilityScore: 64,
    waterLevel: 46,
  },
  {
    basin: "Weser",
    code: "DE-HB",
    confidenceScore: 81,
    evaporationPressure: 35,
    federalState: "Bremen",
    id: "bremen",
    name: "Bremen",
    rainfallIndex: 54,
    riskProfile: "flood",
    sortIndex: 50,
    trend: "rising",
    visibilityScore: 76,
    waterLevel: 62,
  },
  {
    basin: "Elbe",
    code: "DE-HH",
    confidenceScore: 84,
    evaporationPressure: 32,
    federalState: "Hamburg",
    id: "hamburg",
    name: "Hamburg",
    rainfallIndex: 61,
    riskProfile: "flood",
    sortIndex: 60,
    trend: "rising",
    visibilityScore: 78,
    waterLevel: 67,
  },
  {
    basin: "Main",
    code: "DE-HE",
    confidenceScore: 82,
    evaporationPressure: 43,
    federalState: "Hesse",
    id: "hesse",
    name: "Hesse",
    rainfallIndex: 45,
    riskProfile: "stable",
    sortIndex: 70,
    trend: "stable",
    visibilityScore: 75,
    waterLevel: 59,
  },
  {
    basin: "Weser",
    code: "DE-NI",
    confidenceScore: 73,
    evaporationPressure: 66,
    federalState: "Lower Saxony",
    id: "lower-saxony",
    name: "Lower Saxony",
    rainfallIndex: 29,
    riskProfile: "drying",
    sortIndex: 80,
    trend: "falling",
    visibilityScore: 61,
    waterLevel: 41,
  },
  {
    basin: "Warnow",
    code: "DE-MV",
    confidenceScore: 70,
    evaporationPressure: 62,
    federalState: "Mecklenburg-Vorpommern",
    id: "mecklenburg-vorpommern",
    name: "Mecklenburg-Vorpommern",
    rainfallIndex: 31,
    riskProfile: "drying",
    sortIndex: 90,
    trend: "falling",
    visibilityScore: 62,
    waterLevel: 44,
  },
  {
    basin: "Rhine",
    code: "DE-NW",
    confidenceScore: 88,
    evaporationPressure: 31,
    federalState: "North Rhine-Westphalia",
    id: "north-rhine-westphalia",
    name: "North Rhine-Westphalia",
    rainfallIndex: 72,
    riskProfile: "flood",
    sortIndex: 100,
    trend: "rising",
    visibilityScore: 84,
    waterLevel: 76,
  },
  {
    basin: "Rhine",
    code: "DE-RP",
    confidenceScore: 85,
    evaporationPressure: 36,
    federalState: "Rhineland-Palatinate",
    id: "rhineland-palatinate",
    name: "Rhineland-Palatinate",
    rainfallIndex: 59,
    riskProfile: "volatile",
    sortIndex: 110,
    trend: "rising",
    visibilityScore: 80,
    waterLevel: 69,
  },
  {
    basin: "Saar",
    code: "DE-SL",
    confidenceScore: 79,
    evaporationPressure: 44,
    federalState: "Saarland",
    id: "saarland",
    name: "Saarland",
    rainfallIndex: 47,
    riskProfile: "stable",
    sortIndex: 120,
    trend: "stable",
    visibilityScore: 72,
    waterLevel: 61,
  },
  {
    basin: "Elbe",
    code: "DE-SN",
    confidenceScore: 82,
    evaporationPressure: 41,
    federalState: "Saxony",
    id: "saxony",
    name: "Saxony",
    rainfallIndex: 61,
    riskProfile: "volatile",
    sortIndex: 130,
    trend: "rising",
    visibilityScore: 78,
    waterLevel: 68,
  },
  {
    basin: "Elbe",
    code: "DE-ST",
    confidenceScore: 76,
    evaporationPressure: 55,
    federalState: "Saxony-Anhalt",
    id: "saxony-anhalt",
    name: "Saxony-Anhalt",
    rainfallIndex: 39,
    riskProfile: "drying",
    sortIndex: 140,
    trend: "falling",
    visibilityScore: 68,
    waterLevel: 50,
  },
  {
    basin: "Elbe",
    code: "DE-SH",
    confidenceScore: 80,
    evaporationPressure: 34,
    federalState: "Schleswig-Holstein",
    id: "schleswig-holstein",
    name: "Schleswig-Holstein",
    rainfallIndex: 56,
    riskProfile: "flood",
    sortIndex: 150,
    trend: "rising",
    visibilityScore: 74,
    waterLevel: 65,
  },
  {
    basin: "Saale",
    code: "DE-TH",
    confidenceScore: 81,
    evaporationPressure: 46,
    federalState: "Thuringia",
    id: "thuringia",
    name: "Thuringia",
    rainfallIndex: 40,
    riskProfile: "stable",
    sortIndex: 160,
    trend: "stable",
    visibilityScore: 73,
    waterLevel: 58,
  },
]

export const demoRegions: Region[] = demoRegionDefinitions.map((region) => ({
  basin: region.basin,
  code: region.code,
  federalState: region.federalState,
  id: region.id,
  name: region.name,
  riskProfile: region.riskProfile,
  sortIndex: region.sortIndex,
}))

export const demoSnapshots: ReservoirSnapshot[] = demoRegionDefinitions.map((region) => ({
  confidenceScore: region.confidenceScore,
  evaporationPressure: region.evaporationPressure,
  rainfallIndex: region.rainfallIndex,
  regionId: region.id,
  source: "DWD, Pegelonline, Open-Meteo",
  sources: [
    { kind: "water", label: "Pegelonline" },
    { kind: "weather", label: "DWD CDC" },
  ],
  timestamp,
  trend: region.trend,
  visibilityScore: region.visibilityScore,
  waterLevel: region.waterLevel,
}))

export function getDemoSnapshotHistory(
  regionId: string,
  limit = 365
): ReservoirSnapshot[] {
  const latest = demoSnapshots.find((snapshot) => snapshot.regionId === regionId)

  if (!latest) {
    return []
  }

  return Array.from({ length: limit }, (_, index) => {
    const offset = limit - 1 - index
    const phase = regionPhase(regionId)
    const seasonalWave = Math.sin(((index + phase) / 365) * Math.PI * 2)
    const shorterWave = Math.sin(((index * 3 + phase) / 31) * Math.PI * 2)
    const rainfallPulse = Math.max(
      0,
      Math.sin(((index * 5 + phase) / 17) * Math.PI * 2)
    )
    const waterLevel = clampMetric(
      latest.waterLevel + seasonalWave * 12 + rainfallPulse * 8 + shorterWave * 4,
      18,
      94
    )
    const previousWaterLevel =
      index > 0
        ? clampMetric(
            latest.waterLevel
              + Math.sin(((index - 1 + phase) / 365) * Math.PI * 2) * 12
              + Math.max(
                0,
                Math.sin((((index - 1) * 5 + phase) / 17) * Math.PI * 2)
              ) *
                8
              + Math.sin((((index - 1) * 3 + phase) / 31) * Math.PI * 2) * 4,
            18,
            94
          )
        : waterLevel
    const delta = waterLevel - previousWaterLevel

    return {
      ...latest,
      confidenceScore: clampMetric(
        latest.confidenceScore + shorterWave * 6 - rainfallPulse * 2,
        45,
        96
      ),
      rainfallIndex: clampMetric(
        latest.rainfallIndex + seasonalWave * 10 + rainfallPulse * 18,
        8,
        96
      ),
      timestamp: new Date(Date.now() - offset * dayMs).toISOString(),
      trend: delta >= 3 ? "rising" : delta <= -3 ? "falling" : "stable",
      visibilityScore: clampMetric(
        latest.visibilityScore + shorterWave * 5 - Math.max(0, -seasonalWave) * 6,
        35,
        96
      ),
      waterLevel,
    }
  })
}

export function getDemoAnalyticsSummary(): AnalyticsSummary {
  const averageConfidence = average(
    demoSnapshots.map((snapshot) => snapshot.confidenceScore)
  )
  const averageVisibility = average(
    demoSnapshots.map((snapshot) => snapshot.visibilityScore)
  )
  const elevatedRiskRegions = demoSnapshots.filter(
    (snapshot) => snapshot.waterLevel >= 72 || snapshot.evaporationPressure >= 62
  ).length

  return {
    averageConfidence,
    averageVisibility,
    elevatedRiskRegions,
    lastUpdated: timestamp,
    regionsObserved: demoRegions.length,
    trendMix: {
      falling: demoSnapshots.filter((snapshot) => snapshot.trend === "falling").length,
      rising: demoSnapshots.filter((snapshot) => snapshot.trend === "rising").length,
      stable: demoSnapshots.filter((snapshot) => snapshot.trend === "stable").length,
    },
  }
}

export function getDemoSourceHealth(): SourceHealth {
  return {
    fallbackRegions: [],
    freshnessMix: {
      current: demoSnapshots.length,
      old: 0,
      stale: 0,
    },
    generatedAt: timestamp,
    providerCoverage: [
      {
        kind: "water",
        label: "Pegelonline",
        regions: demoSnapshots.length,
      },
      {
        kind: "weather",
        label: "DWD",
        regions: demoSnapshots.length,
      },
      {
        kind: "weather",
        label: "Open-Meteo",
        regions: demoSnapshots.length,
      },
    ],
    regionsObserved: demoSnapshots.length,
    staleRegions: [],
    waterCoverage: 100,
    weatherCoverage: 100,
  }
}

export function getDemoIngestionStatus(): IngestionStatus {
  return {
    completedAt: timestamp,
    durationMs: 1200,
    error: "",
    snapshotRefresh: {
      created: demoSnapshots.length,
      deleted: 0,
      processed: demoSnapshots.length,
      skipped: 0,
      updated: 0,
    },
    startedAt: timestamp,
    status: "completed",
    trigger: "manual",
  }
}

export function getDemoAiAnalysis(snapshot: ReservoirSnapshot): AiAnalysisResult {
  const elevated = snapshot.evaporationPressure > 55 || snapshot.waterLevel > 72

  return {
    recommendations: elevated
      ? [
          "Keep the region on the analyst watch list for the next ingestion cycle.",
          "Compare Pegelonline changes against DWD rainfall before escalation.",
          "Flag visibility below 65 percent for municipal review.",
        ]
      : [
          "Maintain normal monitoring cadence.",
          "Recheck confidence if one source remains stale after the next refresh.",
        ],
    riskLevel: elevated ? "medium" : "low",
    summary: elevated
      ? "The current snapshot shows elevated pressure and needs analyst review."
      : "The current snapshot is broadly stable with acceptable confidence.",
  }
}

export function getDemoForecastOutlook(): ForecastOutlook {
  return {
    coverage: 100,
    generatedAt: timestamp,
    horizonHours: 48,
    regions: demoSnapshots.map((snapshot) => {
      const pressureScore = Math.max(
        snapshot.rainfallIndex,
        snapshot.evaporationPressure
      )

      return {
        evaporationPressure: snapshot.evaporationPressure,
        forecastRainfallMm: Math.round((snapshot.rainfallIndex / 100) * 180) / 10,
        maxTemperatureC: null,
        minHumidityPercent: null,
        pressureScore,
        regionId: snapshot.regionId,
        riskLevel: pressureScore >= 70 ? "high" : pressureScore >= 45 ? "medium" : "low",
        source: "Demo forecast estimate",
        sourceKind: "forecast",
        summary:
          pressureScore >= 45
            ? "Moderate forecast pressure; keep this state in normal review cadence."
            : "Forecast pressure is low for the next operating window.",
        trend: snapshot.trend,
      }
    }),
  }
}

export function getDemoRegionClimate(regionId: string): RegionClimate {
  const phase = regionPhase(regionId)
  const snapshot =
    demoSnapshots.find((candidate) => candidate.regionId === regionId) ??
    demoSnapshots[0]
  const solarScore = clampMetric(38 + (phase % 45), 12, 92)
  const airRiskScore = clampMetric(
    (snapshot?.evaporationPressure ?? 42) - 14 + (phase % 18),
    8,
    78
  )
  const pm25 = Math.round((6 + (airRiskScore / 100) * 18) * 10) / 10
  const pm10 = Math.round((14 + (airRiskScore / 100) * 34) * 10) / 10
  const no2 = Math.round((18 + (phase % 28)) * 10) / 10
  const shortwave = Math.round(150 + (solarScore / 100) * 620)
  const clearSkyRatio = Math.round((0.35 + (solarScore / 100) * 0.55) * 100) / 100
  const directLightShare = Math.round((0.28 + (solarScore / 100) * 0.5) * 100) / 100

  return {
    air: {
      ageMinutes: 34,
      observedAt: timestamp,
      pollutants: {
        co: Math.round((220 + airRiskScore * 12) * 10) / 10,
        no2,
        o3: Math.round((42 + (phase % 35)) * 10) / 10,
        pm10,
        pm25,
        so2: Math.round((2 + (phase % 8)) * 10) / 10,
      },
      riskLabel: airRiskLabel(airRiskScore),
      riskScore: airRiskScore,
      source: "German Environment Agency UBA Air Data API",
      station: {
        id: `demo-${regionId}`,
        name: `${regionIdToLabel(regionId)} reference station`,
        network: "Demo air network",
        setting: "urban",
        stationType: "background",
      },
      status: "ok",
      warnings: [],
    },
    co2: {
      blockers: ["credentials", "dataset choice", "variable/unit verification"],
      datasetCandidates: [
        "cams-global-atmospheric-composition-forecasts",
        "cams-global-ghg-reanalysis-egg4",
      ],
      requiredConfig: [
        "CAMS_ADS_URL",
        "CAMS_ADS_KEY",
        "CAMS_DATASET",
        "regional grid extraction settings",
        "unit conversion rules for selected variable",
      ],
      source: "Copernicus Atmosphere Monitoring Service",
      status: "candidate_requires_dataset_workflow",
      warnings: [
        "CO2 source candidate requires dataset workflow setup",
      ],
    },
    generatedAt: timestamp,
    regionId,
    sunlight: {
      ageMinutes: 42,
      clearSkyRatio,
      directLightShare,
      irradiance: {
        diffuseRadiation: Math.round(shortwave * (1 - directLightShare)),
        directNormalIrradiance: Math.round(shortwave * 1.15),
        directRadiation: Math.round(shortwave * directLightShare),
        shortwaveRadiation: shortwave,
      },
      label: sunlightLabel(solarScore),
      observedAt: timestamp,
      score: solarScore,
      source: "Open-Meteo Satellite Radiation API",
      status: "ok",
      warnings: [],
    },
  }
}

function average(values: number[]) {
  if (!values.length) {
    return 0
  }

  return Math.round(values.reduce((total, value) => total + value, 0) / values.length)
}

function clampMetric(value: number, minimum: number, maximum: number) {
  return Math.round(Math.max(minimum, Math.min(maximum, value)))
}

function regionPhase(regionId: string) {
  return Array.from(regionId).reduce(
    (total, character) => total + character.charCodeAt(0),
    0
  ) % 365
}

function sunlightLabel(score: number) {
  if (score >= 75) {
    return "strong"
  }

  if (score >= 45) {
    return "moderate"
  }

  if (score >= 15) {
    return "limited"
  }

  return "low"
}

function airRiskLabel(score: number) {
  if (score >= 75) {
    return "high"
  }

  if (score >= 45) {
    return "elevated"
  }

  if (score >= 20) {
    return "moderate"
  }

  return "low"
}

function regionIdToLabel(regionId: string) {
  return (
    demoRegions.find((region) => region.id === regionId)?.name ??
    regionId
      .split("-")
      .map((part) => part[0]?.toUpperCase() + part.slice(1))
      .join(" ")
  )
}
