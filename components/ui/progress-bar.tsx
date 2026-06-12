import * as React from "react"
import { cn } from "@/lib/utils"

export interface ProgressBarProps {
  value: number
  colorClass?: string
  className?: string
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  colorClass = "bg-foreground",
  className,
}) => {
  const clamped = Math.min(Math.max(value, 0), 100)
  return (
    <div
      className={cn(
        "w-full h-1 rounded-full bg-muted overflow-hidden",
        className,
      )}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-500", colorClass)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
