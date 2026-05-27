import { useMutation, useQuery } from "@tanstack/react-query"

import {
  analyzeSnapshot,
  fetchAnalyticsSummary,
  fetchLatestSnapshots,
  fetchRegions,
  fetchSourceHealth,
  fetchSnapshotHistory,
  refreshSnapshots,
} from "@/services/api"
import type { ReservoirSnapshot } from "@/services/types"

export function useRegions() {
  return useQuery({
    queryFn: fetchRegions,
    queryKey: ["regions"],
  })
}

export function useLatestSnapshots() {
  return useQuery({
    queryFn: fetchLatestSnapshots,
    queryKey: ["snapshots", "latest"],
  })
}

export function useSnapshotHistory(regionId: string | null) {
  return useQuery({
    enabled: Boolean(regionId),
    queryFn: () => fetchSnapshotHistory(regionId ?? ""),
    queryKey: ["snapshots", "history", regionId],
  })
}

export function useAnalyticsSummary() {
  return useQuery({
    queryFn: fetchAnalyticsSummary,
    queryKey: ["analytics", "summary"],
  })
}

export function useSourceHealth() {
  return useQuery({
    queryFn: fetchSourceHealth,
    queryKey: ["sources", "health"],
  })
}

export function useAiAnalysis() {
  return useMutation({
    mutationFn: (snapshot: ReservoirSnapshot) => analyzeSnapshot(snapshot),
  })
}

export function useRefreshSnapshots() {
  return useMutation({
    mutationFn: refreshSnapshots,
  })
}
