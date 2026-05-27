import type {
  ReservoirSnapshot,
  SnapshotFreshnessStatus,
  SnapshotSourceKind,
} from "@/services/types"

export function snapshotFreshnessStatus(
  snapshot: ReservoirSnapshot
): SnapshotFreshnessStatus {
  return snapshot.freshnessStatus ?? statusFromAge(snapshotAgeMinutes(snapshot))
}

export function snapshotAgeMinutes(snapshot: ReservoirSnapshot) {
  if (typeof snapshot.ageMinutes === "number") {
    return snapshot.ageMinutes
  }

  const observedAt = new Date(snapshot.timestamp).getTime()

  if (Number.isNaN(observedAt)) {
    return 0
  }

  return Math.max(0, Math.round((Date.now() - observedAt) / 60_000))
}

export function freshnessLabel(snapshot: ReservoirSnapshot) {
  const ageMinutes = snapshotAgeMinutes(snapshot)

  if (ageMinutes < 60) {
    return `${ageMinutes}m`
  }

  return `${Math.round(ageMinutes / 60)}h`
}

export function snapshotSourceTags(snapshot: ReservoirSnapshot) {
  if (snapshot.sources?.length) {
    return snapshot.sources
  }

  return snapshot.source.split(",").map((label) => {
    const trimmedLabel = label.trim()

    return {
      kind: sourceKind(trimmedLabel),
      label: trimmedLabel,
    }
  })
}

function statusFromAge(ageMinutes: number): SnapshotFreshnessStatus {
  if (ageMinutes <= 120) {
    return "current"
  }

  if (ageMinutes <= 360) {
    return "stale"
  }

  return "old"
}

function sourceKind(source: string): SnapshotSourceKind {
  if (source.includes("Pegelonline")) {
    return "water"
  }

  if (source.startsWith("DWD") || source.startsWith("Open-Meteo")) {
    return "weather"
  }

  if (source.toLowerCase().includes("fallback")) {
    return "fallback"
  }

  return "model"
}
