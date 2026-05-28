import { FilterHorizontalIcon } from "@hugeicons/core-free-icons"

import { ProductIcon } from "@/components/app/ProductIcon"
import { cn } from "@/lib/utils"
import {
  regionalFilterLabels,
  regionalFilterOrder,
} from "@/services/regional-filters"
import type { RegionalFilter } from "@/stores/app-store"

type RegionalFilterBarProps = {
  activeFilter: RegionalFilter
  counts: Record<RegionalFilter, number>
  onChange: (filter: RegionalFilter) => void
}

export function RegionalFilterBar({
  activeFilter,
  counts,
  onChange,
}: RegionalFilterBarProps) {
  return (
    <section className="rounded-md border bg-card p-3 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <ProductIcon icon={FilterHorizontalIcon} size={16} />
          Regional filters
        </div>
        <div className="flex flex-wrap gap-1.5">
          {regionalFilterOrder.map((filter) => (
            <button
              aria-label={`Show ${regionalFilterLabels[filter]} regions, ${counts[filter]} matches`}
              aria-pressed={activeFilter === filter}
              className={cn(
                "rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                activeFilter === filter && "border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
              )}
              key={filter}
              onClick={() => onChange(filter)}
              type="button"
            >
              {regionalFilterLabels[filter]}
              <span className="ml-1 opacity-75">{counts[filter]}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
