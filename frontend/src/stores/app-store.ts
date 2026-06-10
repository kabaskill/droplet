import { create } from "zustand"

export type MapLayer = "water-level" | "rainfall" | "confidence"
export type HomeLayer = "overview" | "water" | "climate" | "forecast" | "quality"
export type RegionalFilter = "all" | "elevated" | "fallback" | "low-confidence" | "stale"

export type MapViewport = {
  scale: number
  x: number
  y: number
}

type AppState = {
  comparisonMode: boolean
  homeLayer: HomeLayer
  mapViewport: MapViewport
  mobileRailOpen: boolean
  regionalFilter: RegionalFilter
  rightRailOpen: boolean
  searchQuery: string
  selectedRegionId: string | null
  setComparisonMode: (enabled: boolean) => void
  setHomeLayer: (layer: HomeLayer) => void
  setMapViewport: (viewport: MapViewport) => void
  setMobileRailOpen: (open: boolean) => void
  setRegionalFilter: (filter: RegionalFilter) => void
  setRightRailOpen: (open: boolean) => void
  setSearchQuery: (query: string) => void
  setSelectedRegionId: (regionId: string | null) => void
  setSidebarOpen: (open: boolean) => void
  sidebarOpen: boolean
}

export const useAppStore = create<AppState>((set) => ({
  comparisonMode: false,
  homeLayer: "overview",
  mapViewport: { scale: 1, x: 0, y: 0 },
  mobileRailOpen: false,
  regionalFilter: "all",
  rightRailOpen: true,
  searchQuery: "",
  selectedRegionId: null,
  setComparisonMode: (comparisonMode) => set({ comparisonMode }),
  setHomeLayer: (homeLayer) => set({ homeLayer }),
  setMapViewport: (mapViewport) => set({ mapViewport }),
  setMobileRailOpen: (mobileRailOpen) => set({ mobileRailOpen }),
  setRegionalFilter: (regionalFilter) => set({ regionalFilter }),
  setRightRailOpen: (rightRailOpen) => set({ rightRailOpen }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedRegionId: (selectedRegionId) =>
    set({
      ...(selectedRegionId ? { rightRailOpen: true } : {}),
      selectedRegionId,
    }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  sidebarOpen: true,
}))
