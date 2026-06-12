import * as React from "react"
import { cn } from "@/lib/utils"
import { Tile, type TileVariant, type TileSize } from "@/components/ui/tile"

export interface SectionCardHeaderProps {
  tileVariant: TileVariant
  tileSize?: TileSize
  icon: React.ReactNode
  title: React.ReactNode
  subtitle?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

export function SectionCardHeader({
  tileVariant,
  tileSize = 36,
  icon,
  title,
  subtitle,
  action,
  className,
}: SectionCardHeaderProps) {
  return (
    <div className={cn("card-head", className)}>
      <div className="card-title-row">
        <Tile variant={tileVariant} size={tileSize}>
          {icon}
        </Tile>
        <div>
          <div className="card-title">{title}</div>
          {subtitle ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {action}
    </div>
  )
}
