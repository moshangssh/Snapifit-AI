import * as React from "react"
import { cn } from "@/lib/utils"

export interface ScorePipsProps {
  value: number
  max?: number
  /** 渲染样式：button(可点) 或 span(只读概览) */
  interactive?: boolean
  onChange?: (value: number) => void
  ariaLabel?: (level: number) => string
  className?: string
}

export function ScorePips({
  value,
  max = 6,
  interactive = false,
  onChange,
  ariaLabel,
  className,
}: ScorePipsProps) {
  const levels = React.useMemo(() => Array.from({ length: max }, (_, i) => i + 1), [max])

  if (interactive) {
    return (
      <div className={cn("flex gap-1", className)}>
        {levels.map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => onChange?.(level)}
            className={cn(
              "h-[5px] flex-1 rounded-full transition-colors",
              level <= value ? "bg-foreground" : "bg-muted hover:bg-line-strong",
            )}
            aria-label={ariaLabel?.(level)}
          />
        ))}
      </div>
    )
  }

  return (
    <div className={cn("pips", className)}>
      {levels.map((level) => (
        <span key={level} className={cn("pip", level <= value && "on")} />
      ))}
    </div>
  )
}
