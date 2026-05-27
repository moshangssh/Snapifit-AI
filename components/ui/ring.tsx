import * as React from "react"
import { cn } from "@/lib/utils"

export interface RingProps extends Omit<React.SVGAttributes<SVGSVGElement>, "stroke"> {
  value: number
  max: number
  colorClass?: string
  stroke?: number
  diameter?: number
  centerNum?: React.ReactNode
  centerLabel?: React.ReactNode
}

export const Ring: React.FC<RingProps> = ({
  value,
  max,
  colorClass = "text-c-weight",
  stroke = 10,
  diameter = 160,
  centerNum,
  centerLabel,
  className,
  ...svgProps
}) => {
  const radius = (diameter - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.min(Math.max(Math.abs(value), 0), max)
  const ratio = max > 0 ? clamped / max : 0
  const dashOffset = circumference * (1 - ratio)

  return (
    <div
      className={cn("relative inline-grid place-items-center", className)}
      style={{ width: diameter, height: diameter }}
    >
      <svg
        width={diameter}
        height={diameter}
        viewBox={`0 0 ${diameter} ${diameter}`}
        className="-rotate-90"
        {...svgProps}
      >
        <circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth={stroke}
        />
        <circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className={colorClass}
          stroke="currentColor"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      {(centerNum !== undefined || centerLabel !== undefined) && (
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            {centerNum !== undefined && (
              <div className="text-3xl font-bold tracking-tight tabular-nums">
                {centerNum}
              </div>
            )}
            {centerLabel !== undefined && (
              <div className="text-xs text-muted-foreground mt-0.5">
                {centerLabel}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
