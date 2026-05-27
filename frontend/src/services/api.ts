import { useAuthStore } from "@/features/auth/auth-store"
import { refreshKeycloakToken } from "@/features/auth/keycloak"
import {
  demoRegions,
  demoSnapshots,
  getDemoAiAnalysis,
  getDemoAnalyticsSummary,
  getDemoForecastOutlook,
  getDemoIngestionStatus,
  getDemoSnapshotHistory,
  getDemoSourceHealth,
} from "@/services/demo-data"
import type {
  AiAnalysisResult,
  AnalyticsSummary,
  ForecastOutlook,
  IngestionStatus,
  RefreshSnapshotsResult,
  Region,
  ReservoirSnapshot,
  SourceHealth,
} from "@/services/types"

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api"
const demoFallback = import.meta.env.VITE_DEMO_FALLBACK !== "false"
const refreshPollIntervalMs = 1_500
const refreshPollMaxAttempts = 40

class DropletApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = "DropletApiError"
    this.status = status
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await activeAccessToken()
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
    const message = await responseErrorMessage(response)

    if (response.status === 401) {
      useAuthStore.getState().rejectSession(message)
    }

    throw new DropletApiError(response.status, message)
  }

  return response.json() as Promise<T>
}

async function activeAccessToken() {
  const auth = useAuthStore.getState()

  if (auth.mode !== "keycloak") {
    return auth.token
  }

  try {
    const token = await refreshKeycloakToken()

    if (token) {
      useAuthStore.setState({ token })
    }

    return token
  } catch {
    auth.rejectSession("Authentication session expired")
    return null
  }
}

async function withFallback<T>(
  request: () => Promise<T>,
  fallback: () => T
): Promise<T> {
  try {
    return await request()
  } catch (error) {
    if (!demoFallback || isAuthError(error)) {
      throw error
    }

    return fallback()
  }
}

async function responseErrorMessage(response: Response) {
  try {
    const payload = await response.json()

    if (typeof payload?.error === "string") {
      return payload.error
    }
  } catch {
    return `Droplet API returned ${response.status}`
  }

  return `Droplet API returned ${response.status}`
}

function isAuthError(error: unknown) {
  return error instanceof DropletApiError && [401, 403].includes(error.status)
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

export function fetchSourceHealth() {
  return withFallback(
    () => requestJson<SourceHealth>("/sources/health"),
    getDemoSourceHealth
  )
}

export function fetchIngestionStatus() {
  return withFallback(
    () => requestJson<IngestionStatus>("/ingestion/status"),
    getDemoIngestionStatus
  )
}

export function fetchForecastOutlook() {
  return withFallback(
    () => requestJson<ForecastOutlook>("/forecasts/outlook"),
    getDemoForecastOutlook
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

export function refreshSnapshots() {
  return withFallback(
    async () => {
      const refresh = await requestJson<RefreshSnapshotsResult>("/snapshots/refresh", {
        method: "POST",
      })

      if (refresh.status !== "queued" || !refresh.taskId) {
        return refresh
      }

      return pollSnapshotRefresh(refresh.taskId)
    },
    () => ({
      snapshotRefresh: {
        created: demoSnapshots.length,
        deleted: 0,
        processed: demoSnapshots.length,
        skipped: 0,
        updated: 0,
      },
      snapshotsCreated: demoSnapshots.length,
      snapshotsDeleted: 0,
      snapshotsProcessed: demoSnapshots.length,
      snapshotsSkipped: 0,
      snapshotsUpdated: 0,
      status: "completed" as const,
    })
  )
}

async function pollSnapshotRefresh(taskId: string): Promise<RefreshSnapshotsResult> {
  for (let attempt = 0; attempt < refreshPollMaxAttempts; attempt += 1) {
    await delay(refreshPollIntervalMs)

    const result = await requestJson<RefreshSnapshotsResult>(
      `/snapshots/refresh/${taskId}`
    )

    if (result.status === "completed") {
      return result
    }

    if (result.status === "failed") {
      throw new Error(result.error ?? "Snapshot refresh failed")
    }
  }

  throw new Error("Snapshot refresh did not complete in time")
}

function delay(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds))
}
