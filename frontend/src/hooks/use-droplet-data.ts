import { useMutation, useQuery } from "@tanstack/react-query"

import {
  analyzeSnapshot,
  analyzeWaterState,
  fetchAiAnalyses,
  fetchAnalyticsSummary,
  fetchForecastOutlook,
  fetchIngestionStatus,
  fetchLatestSnapshots,
  fetchRegionClimate,
  fetchRegions,
  fetchSourceHealth,
  fetchSnapshotHistory,
  refreshSnapshots,
} from "@/services/api"
import { useAuthStore } from "@/features/auth/auth-store"
import type { AiAnalysisRequest, ReservoirSnapshot } from "@/services/types"
import { queryClient } from "@/app/query-client"

const readModelVersion = "state-model-v2"
const climateReadModelVersion = "climate-model-v2"
const climateReadModelFreshSeconds = positiveIntEnv(
  import.meta.env.VITE_CLIMATE_CONTEXT_FRESH_TTL_SECONDS,
  300
)
const climateReadModelCacheSeconds = Math.max(
  positiveIntEnv(import.meta.env.VITE_CLIMATE_CONTEXT_STALE_TTL_SECONDS, 3600),
  climateReadModelFreshSeconds
)
const climateReadModelCacheMs = climateReadModelCacheSeconds * 1000
const climateReadModelFreshMs = climateReadModelFreshSeconds * 1000

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

export function useRegionClimate(regionId: string | null) {
  return useQuery({
    gcTime: climateReadModelCacheMs,
    enabled: Boolean(regionId),
    queryFn: () => fetchRegionClimate(regionId ?? ""),
    queryKey: ["climate", climateReadModelVersion, "region", regionId],
    staleTime: climateReadModelFreshMs,
  })
}

export function useAiAnalysis() {
  return useMutation({
    mutationFn: (request: AiAnalysisRequest | ReservoirSnapshot) =>
      "snapshots" in request ? analyzeWaterState(request) : analyzeSnapshot(request),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["ai-analyses", readModelVersion],
      })
    },
  })
}

export function useAiAnalyses() {
  return useQuery({
    queryFn: fetchAiAnalyses,
    queryKey: ["ai-analyses", readModelVersion],
  })
}

export function useRefreshSnapshots() {
  return useMutation({
    mutationFn: refreshSnapshots,
  })
}

function positiveIntEnv(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? `${fallback}`, 10)

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}
