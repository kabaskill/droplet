import { Outlet } from "@tanstack/react-router"
import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"

import { AppShell } from "@/components/app/AppShell"
import { ProtectedRoute } from "@/features/auth/ProtectedRoute"
import {
  useAnalyticsSummary,
  useForecastOutlook,
  useIngestionStatus,
  useLatestSnapshots,
  useRefreshSnapshots,
  useRegions,
  useSourceHealth,
} from "@/hooks/use-droplet-data"
import { filterRegions } from "@/services/regional-filters"
import { useAppStore } from "@/stores/app-store"
import type { RefreshSnapshotsResult } from "@/services/types"
import { retryReadModels } from "@/components/app/dashboard-data"

function currentOnlineState() {
  return typeof navigator === "undefined" ? true : navigator.onLine
}

export function WorkspaceLayout() {
  const regionalFilter = useAppStore((state) => state.regionalFilter)
  const regionsQuery = useRegions()
  const snapshotsQuery = useLatestSnapshots()
  const analyticsQuery = useAnalyticsSummary()
  const sourceHealthQuery = useSourceHealth()
  const ingestionStatusQuery = useIngestionStatus()
  const forecastOutlookQuery = useForecastOutlook()
  const refreshSnapshots = useRefreshSnapshots()
  const queryClient = useQueryClient()
  const [now, setNow] = useState(0)
  const [online, setOnline] = useState(currentOnlineState)

  useEffect(() => {
    const updateNow = () => setNow(Date.now())
    updateNow()

    const intervalId = window.setInterval(updateNow, 60_000)

    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    const updateOnlineState = () => setOnline(currentOnlineState())

    window.addEventListener("online", updateOnlineState)
    window.addEventListener("offline", updateOnlineState)

    return () => {
      window.removeEventListener("online", updateOnlineState)
      window.removeEventListener("offline", updateOnlineState)
    }
  }, [])

  const searchRegions = useMemo(
    () => filterRegions(regionsQuery.data ?? [], snapshotsQuery.data ?? [], regionalFilter),
    [regionalFilter, regionsQuery.data, snapshotsQuery.data]
  )
  const stale =
    !online ||
    (snapshotsQuery.dataUpdatedAt > 0 &&
      now > 0 &&
      now - snapshotsQuery.dataUpdatedAt > 1000 * 60 * 5)
  const syncing =
    regionsQuery.isFetching ||
    snapshotsQuery.isFetching ||
    analyticsQuery.isFetching ||
    sourceHealthQuery.isFetching ||
    ingestionStatusQuery.isFetching ||
    forecastOutlookQuery.isFetching
  const refreshMessage = refreshSnapshots.isError
    ? refreshErrorMessage(refreshSnapshots.error)
    : refreshResultMessage(refreshSnapshots.data)

  const handleRefresh = () => {
    refreshSnapshots.mutate(undefined, {
      onSuccess: () => {
        retryReadModels(queryClient)
      },
    })
  }

  return (
    <ProtectedRoute>
      <AppShell
        refreshMessage={refreshMessage}
        refreshing={refreshSnapshots.isPending}
        searchRegions={searchRegions}
        stale={stale}
        syncing={syncing}
        onRefresh={handleRefresh}
      >
        <Outlet />
      </AppShell>
    </ProtectedRoute>
  )
}

function refreshResultMessage(result: RefreshSnapshotsResult | undefined) {
  if (!result?.snapshotRefresh || result.status !== "completed") {
    return null
  }

  const { created, deleted, skipped, updated } = result.snapshotRefresh

  return `Created ${created} · Updated ${updated} · Skipped ${skipped} · Deleted ${deleted}`
}

function refreshErrorMessage(error: Error | null) {
  return error?.message ?? "Refresh failed"
}
