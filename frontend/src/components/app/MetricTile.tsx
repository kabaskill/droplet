import type { IconSvgElement } from "@hugeicons/react"

import { ProductIcon } from "@/components/app/ProductIcon"
import { cn } from "@/lib/utils"

type MetricTileProps = {
  icon: IconSvgElement
  label: string
  tone?: "amber" | "blue" | "green" | "red"
  value: string
}

const toneClasses = {
  amber: "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200",
  blue: "bg-sky-50 text-sky-800 dark:bg-sky-950/30 dark:text-sky-200",
  green:
    "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200",
  red: "bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-200",
}

export function MetricTile({
  icon,
  label,
  tone = "blue",
  value,
}: MetricTileProps) {
  return (
    <div className="min-w-0 rounded-md border bg-card p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <span className={cn("flex size-7 items-center justify-center rounded-md", toneClasses[tone])}>
          <ProductIcon icon={icon} size={15} />
        </span>
        <span className="truncate text-xs font-medium uppercase text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="mt-3 truncate text-2xl font-semibold tracking-normal">{value}</div>
    </div>
  )
}
