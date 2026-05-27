import { create } from "zustand"

export type MapLayer = "water-level" | "rainfall" | "confidence"

type AppState = {
  activeLayer: MapLayer
  comparisonMode: boolean
  selectedRegionId: string | null
  setActiveLayer: (layer: MapLayer) => void
  setComparisonMode: (enabled: boolean) => void
  setSelectedRegionId: (regionId: string) => void
  setSidebarOpen: (open: boolean) => void
  sidebarOpen: boolean
}

export const useAppStore = create<AppState>((set) => ({
  activeLayer: "water-level",
  comparisonMode: false,
  selectedRegionId: null,
  setActiveLayer: (activeLayer) => set({ activeLayer }),
  setComparisonMode: (comparisonMode) => set({ comparisonMode }),
  setSelectedRegionId: (selectedRegionId) => set({ selectedRegionId }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  sidebarOpen: false,
}))
