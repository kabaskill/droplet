import type { QueryClient } from "@tanstack/react-query"
import { useEffect, useMemo } from "react"

import {
  useAnalyticsSummary,
  useForecastOutlook,
  useIngestionStatus,
  useLatestSnapshots,
  useRegions,
  useSnapshotHistory,
  useSourceHealth,
} from "@/hooks/use-droplet-data"
import { isDropletApiError } from "@/services/api"
import {
  filterRegions,
  regionalFilterCounts,
} from "@/services/regional-filters"
import { useAppStore } from "@/stores/app-store"
import type { Region, ReservoirSnapshot } from "@/services/types"

const emptyRegions: Region[] = []
const emptySnapshots: ReservoirSnapshot[] = []

export function useDashboardData() {
  const activeLayer = useAppStore((state) => state.activeLayer)
  const comparisonMode = useAppStore((state) => state.comparisonMode)
  const regionalFilter = useAppStore((state) => state.regionalFilter)
  const selectedRegionId = useAppStore((state) => state.selectedRegionId)
  const setRegionalFilter = useAppStore((state) => state.setRegionalFilter)
  const setSelectedRegionId = useAppStore((state) => state.setSelectedRegionId)
  const regionsQuery = useRegions()
  const snapshotsQuery = useLatestSnapshots()
  const analyticsQuery = useAnalyticsSummary()
  const sourceHealthQuery = useSourceHealth()
  const ingestionStatusQuery = useIngestionStatus()
  const forecastOutlookQuery = useForecastOutlook()

  const regions = regionsQuery.data ?? emptyRegions
  const snapshots = snapshotsQuery.data ?? emptySnapshots
  const filteredRegions = useMemo(
    () => filterRegions(regions, snapshots, regionalFilter),
    [regions, snapshots, regionalFilter]
  )
  const allRegions = useMemo(
    () => filterRegions(regions, snapshots, "all"),
    [regions, snapshots]
  )
  const filterCounts = useMemo(
    () => regionalFilterCounts(regions, snapshots),
    [regions, snapshots]
  )

  useEffect(() => {
    if (!regions[0]) {
      return
    }

    if (!selectedRegionId) {
      setSelectedRegionId(regions[0].id)
      return
    }

    if (
      filteredRegions.length > 0 &&
      !filteredRegions.some(({ region }) => region.id === selectedRegionId)
    ) {
      setSelectedRegionId(filteredRegions[0].region.id)
    }
  }, [filteredRegions, regions, selectedRegionId, setSelectedRegionId])

  const activeRegion =
    regions.find((region) => region.id === selectedRegionId) ?? regions[0] ?? null
  const activeSnapshot =
    snapshots.find((snapshot) => snapshot.regionId === activeRegion?.id) ??
    snapshots[0] ??
    null
  const historyQuery = useSnapshotHistory(activeRegion?.id ?? null)
  const regionReadModelLoading =
    (regionsQuery.isPending && regions.length === 0) ||
    (snapshotsQuery.isPending && snapshots.length === 0)
  const freshnessItems = [
    {
      error: Boolean(regionsQuery.error),
      isFetching: regionsQuery.isFetching,
      label: "States",
      updatedAt: regionsQuery.dataUpdatedAt,
    },
    {
      error: Boolean(snapshotsQuery.error),
      isFetching: snapshotsQuery.isFetching,
      label: "Snapshots",
      updatedAt: snapshotsQuery.dataUpdatedAt,
    },
    {
      error: Boolean(analyticsQuery.error),
      isFetching: analyticsQuery.isFetching,
      label: "Analytics",
      updatedAt: analyticsQuery.dataUpdatedAt,
    },
    {
      error: Boolean(sourceHealthQuery.error),
      isFetching: sourceHealthQuery.isFetching,
      label: "Source health",
      updatedAt: sourceHealthQuery.dataUpdatedAt,
    },
    {
      error: Boolean(forecastOutlookQuery.error),
      isFetching: forecastOutlookQuery.isFetching,
      label: "Forecast",
      updatedAt: forecastOutlookQuery.dataUpdatedAt,
    },
  ]

  return {
    accessError: firstAccessError([
      analyticsQuery.error,
      sourceHealthQuery.error,
      ingestionStatusQuery.error,
      forecastOutlookQuery.error,
    ]),
    activeLayer,
    activeRegion,
    activeSnapshot,
    analyticsQuery,
    allRegions,
    comparisonMode,
    filterCounts,
    filteredRegions,
    forecastOutlookQuery,
    freshnessItems,
    historyQuery,
    ingestionStatusQuery,
    operationalError: firstOperationalError([regionsQuery.error, snapshotsQuery.error]),
    regionReadModelLoading,
    regions,
    regionsQuery,
    selectedRegionId,
    setRegionalFilter,
    setSelectedRegionId,
    snapshots,
    snapshotsQuery,
    sourceHealthQuery,
  }
}

export function firstAccessError(errors: unknown[]) {
  for (const error of errors) {
    if (!(error instanceof Error)) {
      continue
    }

    if (error.message === "insufficient role") {
      return "Your current role can view states, but analyst or municipality access is required for this operation."
    }
  }

  return null
}

export function firstOperationalError(errors: unknown[]) {
  for (const error of errors) {
    if (!(error instanceof Error)) {
      continue
    }

    if (isDropletApiError(error) && [401, 403].includes(error.status)) {
      continue
    }

    if (error.message === "insufficient role") {
      continue
    }

    if (isDropletApiError(error)) {
      return `${error.message} (${error.status})`
    }

    return error.message
  }

  return null
}

export function panelErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return null
  }

  if (error.message === "insufficient role") {
    return null
  }

  if (isDropletApiError(error) && [401, 403].includes(error.status)) {
    return null
  }

  if (isDropletApiError(error)) {
    return `${error.message} (${error.status})`
  }

  return error.message
}

export function retryReadModels(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ["regions"] })
  void queryClient.invalidateQueries({ queryKey: ["snapshots"] })
  void queryClient.invalidateQueries({ queryKey: ["analytics"] })
  void queryClient.invalidateQueries({ queryKey: ["forecasts"] })
  void queryClient.invalidateQueries({ queryKey: ["sources"] })
  void queryClient.invalidateQueries({ queryKey: ["ingestion"] })
}
