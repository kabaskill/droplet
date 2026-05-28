import {
  GlobalSearchIcon,
  Location01Icon,
} from "@hugeicons/core-free-icons"
import { useState } from "react"

import { ProductIcon } from "@/components/app/ProductIcon"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { RegionWithSnapshot } from "@/services/regional-filters"

type RegionQuickSwitcherProps = {
  onSelectRegion: (regionId: string) => void
  regions: RegionWithSnapshot[]
  selectedRegionId: string | null
}

export function RegionQuickSwitcher({
  onSelectRegion,
  regions,
  selectedRegionId,
}: RegionQuickSwitcherProps) {
  const [query, setQuery] = useState("")
  const normalizedQuery = query.trim().toLowerCase()
  const selectedRegion = regions.find(({ region }) => region.id === selectedRegionId)
  const matches = normalizedQuery
    ? regions
        .filter(({ region }) =>
          [
            region.name,
            region.basin,
            region.code,
            region.federalState,
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery)
        )
        .slice(0, 6)
    : []

  const selectRegion = (regionId: string) => {
    onSelectRegion(regionId)
    setQuery("")
  }

  return (
    <section className="rounded-md border bg-card p-3 shadow-sm">
      <div className="grid gap-3 lg:grid-cols-[minmax(240px,0.42fr)_minmax(0,0.58fr)] lg:items-center">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ProductIcon icon={GlobalSearchIcon} size={16} />
            Region quick switch
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {selectedRegion
              ? `${selectedRegion.region.name} · ${selectedRegion.region.basin}`
              : "No region selected"}
          </p>
        </div>

        <div className="min-w-0">
          <div className="flex min-w-0 gap-2">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Search regions</span>
              <ProductIcon
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                icon={Location01Icon}
                size={15}
              />
              <input
                className="h-9 w-full rounded-md border bg-background pl-8 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/25"
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && matches[0]) {
                    selectRegion(matches[0].region.id)
                  }
                }}
                placeholder="Search region, basin, state, code"
                type="search"
                value={query}
              />
            </label>
            {query ? (
              <Button size="lg" variant="outline" onClick={() => setQuery("")}>
                Clear
              </Button>
            ) : null}
          </div>

          {normalizedQuery ? (
            <div className="mt-2 grid gap-1.5">
              {matches.length ? (
                matches.map(({ region, snapshot }) => (
                  <button
                    className={cn(
                      "grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-md border bg-background px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                      selectedRegionId === region.id && "border-primary/50 bg-accent"
                    )}
                    key={region.id}
                    onClick={() => selectRegion(region.id)}
                    type="button"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{region.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {region.basin} · {region.federalState}
                      </span>
                    </span>
                    <span className="text-right text-xs text-muted-foreground">
                      <span className="block font-medium text-foreground">
                        {snapshot?.waterLevel ?? 0}%
                      </span>
                      <span>{region.code}</span>
                    </span>
                  </button>
                ))
              ) : (
                <div className="rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
                  No visible regions match
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
