import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"

import { cn } from "@/lib/utils"

type ProductIconProps = {
  className?: string
  icon: IconSvgElement
  size?: number
}

export function ProductIcon({ className, icon, size = 18 }: ProductIconProps) {
  return (
    <HugeiconsIcon
      absoluteStrokeWidth
      className={cn("shrink-0", className)}
      icon={icon}
      size={size}
      strokeWidth={1.7}
    />
  )
}
