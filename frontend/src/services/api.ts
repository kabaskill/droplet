import { useAuthStore } from "@/features/auth/auth-store"
import {
  demoRegions,
  demoSnapshots,
  getDemoAiAnalysis,
  getDemoAnalyticsSummary,
  getDemoSnapshotHistory,
} from "@/services/demo-data"
import type {
  AiAnalysisResult,
  AnalyticsSummary,
  Region,
  ReservoirSnapshot,
} from "@/services/types"

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api"
const demoFallback = import.meta.env.VITE_DEMO_FALLBACK !== "false"

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const token = useAuthStore.getState().token
  const headers = new Headers(init?.headers)
  headers.set("Accept", "application/json")

  if (init?.body) {
    headers.set("Content-Type", "application/json")
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers,
  })

  if (!response.ok) {
    throw new Error(`Droplet API returned ${response.status}`)
  }

  return response.json() as Promise<T>
}

async function withFallback<T>(
  request: () => Promise<T>,
  fallback: () => T
): Promise<T> {
  try {
    return await request()
  } catch (error) {
    if (!demoFallback) {
      throw error
    }

    return fallback()
  }
}

export function fetchRegions() {
  return withFallback(
    () => requestJson<Region[]>("/regions"),
    () => demoRegions
  )
}

export function fetchLatestSnapshots() {
  return withFallback(
    () => requestJson<ReservoirSnapshot[]>("/snapshots"),
    () => demoSnapshots
  )
}

export function fetchSnapshotHistory(regionId: string) {
  return withFallback(
    () => requestJson<ReservoirSnapshot[]>(`/snapshots/${regionId}`),
    () => getDemoSnapshotHistory(regionId)
  )
}

export function fetchAnalyticsSummary() {
  return withFallback(
    () => requestJson<AnalyticsSummary>("/analytics/summary"),
    getDemoAnalyticsSummary
  )
}

export function analyzeSnapshot(snapshot: ReservoirSnapshot) {
  return withFallback(
    () =>
      requestJson<AiAnalysisResult>("/ai/analyze", {
        body: JSON.stringify({ snapshot }),
        method: "POST",
      }),
    () => getDemoAiAnalysis(snapshot)
  )
}
