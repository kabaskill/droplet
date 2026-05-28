import { useMutation, useQuery } from "@tanstack/react-query"

import {
  analyzeSnapshot,
  analyzeWaterState,
  fetchAnalyticsSummary,
  fetchForecastOutlook,
  fetchIngestionStatus,
  fetchLatestSnapshots,
  fetchRegions,
  fetchSourceHealth,
  fetchSnapshotHistory,
  refreshSnapshots,
} from "@/services/api"
import { useAuthStore } from "@/features/auth/auth-store"
import type { AiAnalysisRequest, ReservoirSnapshot } from "@/services/types"

const readModelVersion = "state-model-v2"

export function useRegions() {
  return useQuery({
    queryFn: fetchRegions,
    queryKey: ["regions", readModelVersion],
  })
}

export function useLatestSnapshots() {
  return useQuery({
    queryFn: fetchLatestSnapshots,
    queryKey: ["snapshots", readModelVersion, "latest"],
  })
}

export function useSnapshotHistory(regionId: string | null) {
  const canViewExtendedHistory = useAuthStore((state) =>
    state.hasAnyRole(["municipality"])
  )
  const limit = canViewExtendedHistory ? 365 : 90

  return useQuery({
    enabled: Boolean(regionId),
    queryFn: () => fetchSnapshotHistory(regionId ?? "", limit),
    queryKey: ["snapshots", readModelVersion, "history", regionId, limit],
  })
}

export function useAnalyticsSummary() {
  return useQuery({
    queryFn: fetchAnalyticsSummary,
    queryKey: ["analytics", readModelVersion, "summary"],
  })
}

export function useSourceHealth() {
  return useQuery({
    queryFn: fetchSourceHealth,
    queryKey: ["sources", readModelVersion, "health"],
  })
}

export function useIngestionStatus() {
  return useQuery({
    queryFn: fetchIngestionStatus,
    queryKey: ["ingestion", readModelVersion, "status"],
  })
}

export function useForecastOutlook() {
  return useQuery({
    queryFn: fetchForecastOutlook,
    queryKey: ["forecasts", readModelVersion, "outlook"],
  })
}

export function useAiAnalysis() {
  return useMutation({
    mutationFn: (request: AiAnalysisRequest | ReservoirSnapshot) =>
      "snapshots" in request ? analyzeWaterState(request) : analyzeSnapshot(request),
  })
}

export function useRefreshSnapshots() {
  return useMutation({
    mutationFn: refreshSnapshots,
  })
}
