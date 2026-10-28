import { refreshKeycloakToken } from "@/features/auth/keycloak"
import { useAuthStore } from "@/features/auth/auth-store"

export type Station = {
  id: string
  name: string
  latitude: number
  longitude: number
  waterBody?: string
}
export type WaterRegion = {
  discoveryRegion: { id: string; name: string; code: string }
  water: {
    status: "current" | "stale" | "unavailable"
    levelCm: number | null
    observedAt: string | null
    condition: "low" | "normal" | "high" | "unknown"
    station: Station | null
    source: { name: string; url: string } | null
    tidal?: boolean
    meanComparison?: {
      meanCm: number
      differenceCm: number
      periodStart: string | null
      periodEnd: string | null
    } | null
  }
  rainfall: {
    status: "current" | "stale" | "unavailable"
    totalMm: number | null
    windowStart: string | null
    windowEnd: string | null
    station: Station | null
    source: { name: string; url: string } | null
  }
  change24h: {
    deltaCm: number
    from: string
    to: string
    elapsedHours: number
  } | null
}
export type WaterHistory = {
  interval: "hour" | "day"
  start: string
  end: string
  water: {
    bucketStart: string
    lastObservedAt: string
    lastCm: number
    minCm: number
    maxCm: number
    seriesId: string
    station: Station
  }[]
  rainfall: {
    bucketStart: string
    rainfall24hMm: number
    windowStart: string
    windowEnd: string
    station: Station
  }[]
}
export type SavedPlace = { regionId: string; isDefault: boolean }

export class WaterApiError extends Error {
  readonly status: number
  constructor(
    status: number,
    message: string
  ) {
    super(message)
    this.status = status
  }
}

export async function waterRequest<T>(
  path: string,
  privateRequest = false,
  init?: RequestInit,
  signal?: AbortSignal
): Promise<T> {
  const headers = new Headers({ Accept: "application/json", ...init?.headers })
  if (privateRequest) {
    const auth = useAuthStore.getState()
    let token = auth.token
    if (auth.mode === "keycloak") {
      try {
        token = await refreshKeycloakToken()
      } catch {
        token = null
      }
    }
    if (!token) throw new Error("Please sign in to continue.")
    headers.set("Authorization", `Bearer ${token}`)
  }
  if (init?.body) headers.set("Content-Type", "application/json")
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL ?? "/api"}/water${path}`,
    { ...init, headers, signal, cache: "no-store" }
  )
  if (!response.ok) {
    if (response.status === 401 && privateRequest)
      useAuthStore
        .getState()
        .rejectSession("Your session expired. Please sign in again.")
    throw new WaterApiError(
      response.status,
      response.status === 401
        ? "Please sign in to continue."
        : "Could not load observations. Please try again."
    )
  }
  return response.json() as Promise<T>
}

export const conditionLabel = (water: WaterRegion["water"]) => {
  if (water.status === "unavailable") return "Water unavailable"
  if (water.status === "stale") return "Last known reading"
  return {
    low: "Low water",
    normal: "Within reference range",
    high: "High water",
    unknown: water.tidal ? "Tidal gauge" : "No condition reference",
  }[water.condition]
}
export const number = (value: number) =>
  new Intl.NumberFormat("en", { maximumFractionDigits: 1 }).format(value)
export const time = (value: string | null) =>
  value
    ? new Date(value).toLocaleString([], {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Unavailable"
