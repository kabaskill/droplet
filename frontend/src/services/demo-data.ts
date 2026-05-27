import type {
  AiAnalysisResult,
  AnalyticsSummary,
  Region,
  ReservoirSnapshot,
  SourceHealth,
} from "@/services/types"

const timestamp = new Date().toISOString()

export const demoRegions: Region[] = [
  {
    basin: "Elbe",
    code: "DE-ELB",
    federalState: "Saxony / Brandenburg",
    id: "elbe-upper",
    name: "Upper Elbe",
    riskProfile: "volatile",
    sortIndex: 10,
  },
  {
    basin: "Rhine",
    code: "DE-RHN",
    federalState: "North Rhine-Westphalia",
    id: "rhine-lower",
    name: "Lower Rhine",
    riskProfile: "flood",
    sortIndex: 20,
  },
  {
    basin: "Danube",
    code: "DE-DAN",
    federalState: "Bavaria",
    id: "danube-south",
    name: "South Danube",
    riskProfile: "stable",
    sortIndex: 30,
  },
  {
    basin: "Weser",
    code: "DE-WES",
    federalState: "Lower Saxony",
    id: "weser-central",
    name: "Central Weser",
    riskProfile: "drying",
    sortIndex: 40,
  },
  {
    basin: "Oder",
    code: "DE-ODE",
    federalState: "Brandenburg",
    id: "oder-east",
    name: "East Oder",
    riskProfile: "volatile",
    sortIndex: 50,
  },
]

export const demoSnapshots: ReservoirSnapshot[] = [
  {
    confidenceScore: 82,
    evaporationPressure: 44,
    rainfallIndex: 61,
    regionId: "elbe-upper",
    source: "DWD, Pegelonline, Open-Meteo",
    timestamp,
    trend: "rising",
    visibilityScore: 78,
    waterLevel: 68,
  },
  {
    confidenceScore: 88,
    evaporationPressure: 31,
    rainfallIndex: 72,
    regionId: "rhine-lower",
    source: "DWD, Pegelonline",
    timestamp,
    trend: "rising",
    visibilityScore: 84,
    waterLevel: 76,
  },
  {
    confidenceScore: 91,
    evaporationPressure: 28,
    rainfallIndex: 48,
    regionId: "danube-south",
    source: "DWD, Pegelonline, Open-Meteo",
    timestamp,
    trend: "stable",
    visibilityScore: 87,
    waterLevel: 63,
  },
  {
    confidenceScore: 73,
    evaporationPressure: 66,
    rainfallIndex: 29,
    regionId: "weser-central",
    source: "DWD, Open-Meteo",
    timestamp,
    trend: "falling",
    visibilityScore: 61,
    waterLevel: 41,
  },
  {
    confidenceScore: 69,
    evaporationPressure: 58,
    rainfallIndex: 37,
    regionId: "oder-east",
    source: "Pegelonline, Open-Meteo",
    timestamp,
    trend: "falling",
    visibilityScore: 57,
    waterLevel: 46,
  },
]

export function getDemoSnapshotHistory(regionId: string): ReservoirSnapshot[] {
  const latest = demoSnapshots.find((snapshot) => snapshot.regionId === regionId)

  if (!latest) {
    return []
  }

  return Array.from({ length: 9 }, (_, index) => {
    const offset = 8 - index
    const wave = Math.sin(index / 1.7) * 7

    return {
      ...latest,
      confidenceScore: Math.max(45, Math.min(96, latest.confidenceScore - offset + wave)),
      rainfallIndex: Math.max(12, Math.min(92, latest.rainfallIndex - offset * 2 + wave)),
      timestamp: new Date(Date.now() - offset * 86_400_000).toISOString(),
      visibilityScore: Math.max(35, Math.min(95, latest.visibilityScore - offset + wave)),
      waterLevel: Math.max(20, Math.min(92, latest.waterLevel - offset + wave)),
    }
  })
}

export function getDemoAnalyticsSummary(): AnalyticsSummary {
  return {
    averageConfidence: 81,
    averageVisibility: 73,
    elevatedRiskRegions: 2,
    lastUpdated: timestamp,
    regionsObserved: demoRegions.length,
    trendMix: {
      falling: 2,
      rising: 2,
      stable: 1,
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
        regions: 4,
      },
      {
        kind: "weather",
        label: "DWD",
        regions: 4,
      },
      {
        kind: "weather",
        label: "Open-Meteo",
        regions: 3,
      },
    ],
    regionsObserved: demoSnapshots.length,
    staleRegions: [],
    waterCoverage: 80,
    weatherCoverage: 100,
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
