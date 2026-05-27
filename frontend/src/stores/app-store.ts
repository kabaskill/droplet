import { create } from "zustand"

export type MapLayer = "water-level" | "rainfall" | "confidence"
export type RegionalFilter = "all" | "elevated" | "fallback" | "low-confidence" | "stale"

type AppState = {
  activeLayer: MapLayer
  comparisonMode: boolean
  regionalFilter: RegionalFilter
  selectedRegionId: string | null
  setActiveLayer: (layer: MapLayer) => void
  setComparisonMode: (enabled: boolean) => void
  setRegionalFilter: (filter: RegionalFilter) => void
  setSelectedRegionId: (regionId: string) => void
  setSidebarOpen: (open: boolean) => void
  sidebarOpen: boolean
}

export const useAppStore = create<AppState>((set) => ({
  activeLayer: "water-level",
  comparisonMode: false,
  regionalFilter: "all",
  selectedRegionId: null,
  setActiveLayer: (activeLayer) => set({ activeLayer }),
  setComparisonMode: (comparisonMode) => set({ comparisonMode }),
  setRegionalFilter: (regionalFilter) => set({ regionalFilter }),
  setSelectedRegionId: (selectedRegionId) => set({ selectedRegionId }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  sidebarOpen: false,
}))
