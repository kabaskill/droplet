import { Outlet, useRouterState } from "@tanstack/react-router"
import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"

import { AppShell } from "@/components/app/AppShell"
import {
  useAnalyticsSummary,
  useForecastOutlook,
  useIngestionStatus,
  useLatestSnapshots,
  useRegions,
  useSourceHealth,
} from "@/hooks/use-droplet-data"
import { filterRegions } from "@/services/regional-filters"
import { useAppStore } from "@/stores/app-store"
import { retryReadModels } from "@/components/app/dashboard-data"

function currentOnlineState() {
  return typeof navigator === "undefined" ? true : navigator.onLine
}

export function WorkspaceLayout() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  return pathname === "/account" ? (
    <AccountWorkspaceShell />
  ) : (
    <DataWorkspaceShell />
  )
}

function AccountWorkspaceShell() {
  return (
    <AppShell
      refreshing={false}
      searchRegions={[]}
      stale={false}
      syncing={false}
      onRefresh={() => undefined}
    >
      <Outlet />
    </AppShell>
  )
}

function DataWorkspaceShell() {
  const regionalFilter = useAppStore((state) => state.regionalFilter)
  const regionsQuery = useRegions()
  const snapshotsQuery = useLatestSnapshots()
  const analyticsQuery = useAnalyticsSummary()
  const sourceHealthQuery = useSourceHealth()
  const ingestionStatusQuery = useIngestionStatus()
  const forecastOutlookQuery = useForecastOutlook()
  const queryClient = useQueryClient()
  const [now, setNow] = useState(() => Date.now())
  const [online, setOnline] = useState(currentOnlineState)

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 60_000)

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

  const searchRegions = filterRegions(
    regionsQuery.data ?? [],
    snapshotsQuery.data ?? [],
    regionalFilter
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
  const handleRefresh = () => {
    retryReadModels(queryClient)
  }

  return (
    <AppShell
      refreshing={syncing}
      searchRegions={searchRegions}
      stale={stale}
      syncing={syncing}
      onRefresh={handleRefresh}
    >
      <Outlet />
    </AppShell>
  )
}
