export type TrendDirection = "falling" | "rising" | "stable"
export type SnapshotFreshnessStatus = "current" | "old" | "stale"
export type SnapshotSourceKind = "fallback" | "model" | "water" | "weather"

export type Region = {
  basin: string
  code: string
  federalState: string
  id: string
  name: string
  riskProfile: "drying" | "flood" | "stable" | "volatile"
  sortIndex: number
}

export type ReservoirSnapshot = {
  ageMinutes?: number
  confidenceScore: number
  evaporationPressure: number
  freshnessStatus?: SnapshotFreshnessStatus
  id?: number
  rainfallIndex: number
  regionId: string
  source: string
  sources?: {
    kind: SnapshotSourceKind
    label: string
  }[]
  timestamp: string
  trend: TrendDirection
  visibilityScore: number
  waterLevel: number
}

export type AnalyticsSummary = {
  averageConfidence: number
  averageVisibility: number
  elevatedRiskRegions: number
  lastUpdated: string
  regionsObserved: number
  trendMix: Record<TrendDirection, number>
}

export type SourceHealth = {
  fallbackRegions: string[]
  freshnessMix: Record<SnapshotFreshnessStatus, number>
  generatedAt: string
  providerCoverage: {
    kind: SnapshotSourceKind
    label: string
    regions: number
  }[]
  regionsObserved: number
  staleRegions: {
    ageMinutes: number
    freshnessStatus: SnapshotFreshnessStatus
    regionId: string
  }[]
  waterCoverage: number
  weatherCoverage: number
}

export type IngestionStatus = {
  completedAt: string
  durationMs: number
  error: string
  snapshotRefresh: {
    created: number
    deleted: number
    processed: number
    skipped: number
    updated: number
  }
  startedAt: string
  status: "completed" | "failed" | "running" | "unknown"
  trigger: "manual" | "scheduled" | "unknown"
}

export type AiAnalysisResult = {
  observations?: string[]
  recommendations: string[]
  riskLevel: "high" | "low" | "medium"
  scopeLabel?: string
  summary: string
}

export type AiAnalysisRequest = {
  generatedAt: string
  requestedRole?: "analyst" | "citizen" | "municipality"
  regions: Array<{
    basin: string
    federalState: string
    id: string
    name: string
    riskProfile: Region["riskProfile"]
  }>
  scope: {
    id: string
    label: string
    type: "region" | "state"
  }
  snapshots: ReservoirSnapshot[]
}

export type AiAnalysisRecord = {
  analysis: AiAnalysisResult
  createdAt: string
  id: number
  regionCount: number
  request: AiAnalysisRequest
  requestedRole: "analyst" | "citizen" | "municipality"
  scope: {
    id: string
    label: string
    type: "region" | "scope" | "state"
  }
  user: {
    email?: string | null
    name?: string | null
    subject: string
  }
}

export type ForecastRegionOutlook = {
  evaporationPressure: number
  forecastRainfallMm: number
  maxTemperatureC: number | null
  minHumidityPercent: number | null
  pressureScore: number
  regionId: string
  riskLevel: "high" | "low" | "medium"
  source: string
  sourceKind: "fallback" | "forecast"
  summary: string
  trend: TrendDirection
}

export type ForecastOutlook = {
  coverage: number
  generatedAt: string
  horizonHours: number
  regions: ForecastRegionOutlook[]
}

export type RegionClimate = {
  air: {
    ageMinutes: number | null
    observedAt: string | null
    pollutants: {
      co: number | null
      no2: number | null
      o3: number | null
      pm10: number | null
      pm25: number | null
      so2: number | null
    }
    riskLabel: string
    riskScore: number | null
    station: {
      id: string | null
      name: string | null
      network: string | null
      setting: string | null
      stationType: string | null
    } | null
    status: string
    warnings: string[]
  }
  co2: {
    blockers: string[]
    datasetCandidates: string[]
    requiredConfig: string[]
    source: string
    status: string
    warnings: string[]
  }
  generatedAt: string
  regionId: string
  sunlight: {
    ageMinutes: number | null
    clearSkyRatio: number | null
    directLightShare: number | null
    irradiance: {
      diffuseRadiation: number | null
      directNormalIrradiance: number | null
      directRadiation: number | null
      shortwaveRadiation: number | null
    }
    label: string
    observedAt: string | null
    score: number | null
    status: string
    warnings: string[]
  }
}

export type RefreshSnapshotsResult = {
  error?: string
  snapshotRefresh?: {
    created: number
    deleted: number
    processed: number
    skipped: number
    updated: number
  }
  snapshotsCreated?: number
  snapshotsDeleted?: number
  snapshotsProcessed?: number
  snapshotsSkipped?: number
  snapshotsUpdated?: number
  status: "completed" | "failed" | "queued" | "running"
  taskId?: string
}
