export type TrendDirection = "falling" | "rising" | "stable"

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
  confidenceScore: number
  evaporationPressure: number
  id?: number
  rainfallIndex: number
  regionId: string
  source: string
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

export type AiAnalysisResult = {
  recommendations: string[]
  riskLevel: "high" | "low" | "medium"
  summary: string
}

export type RefreshSnapshotsResult = {
  error?: string
  snapshotRefresh?: {
    created: number
    processed: number
    skipped: number
    updated: number
  }
  snapshotsCreated?: number
  snapshotsProcessed?: number
  snapshotsSkipped?: number
  snapshotsUpdated?: number
  status: "completed" | "failed" | "queued" | "running"
  taskId?: string
}
