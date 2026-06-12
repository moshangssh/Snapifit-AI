import * as React from "react"
import { cn } from "@/lib/utils"

export type TileVariant =
  | "food"
  | "exercise"
  | "weight"
  | "status"
  | "mood"
  | "ai"
  | "ink"
  | "purple"
  | "indigo"

export type TileSize = 18 | 32 | 36 | 44

const VARIANT_BG: Record<TileVariant, string> = {
  food: "bg-c-food",
  exercise: "bg-c-exercise",
  weight: "bg-c-weight",
  status: "bg-c-status",
  mood: "bg-c-mood",
  ai: "bg-c-ai",
  ink: "bg-foreground",
  purple: "bg-c-purple",
  indigo: "bg-c-status",
}

const SIZE_CLASS: Record<TileSize, string> = {
  18: "w-[18px] h-[18px] rounded-[5px] [&_svg]:size-3",
  32: "w-8 h-8 rounded-lg [&_svg]:size-[18px]",
  36: "w-9 h-9 rounded-lg [&_svg]:size-5",
  44: "w-11 h-11 rounded-[10px] [&_svg]:size-6",
}

export interface TileProps extends React.HTMLAttributes<HTMLDivElement> {
  variant: TileVariant
  size?: TileSize
}

export const Tile = React.forwardRef<HTMLDivElement, TileProps>(
  ({ variant, size = 32, className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "grid place-items-center text-white shrink-0",
        VARIANT_BG[variant],
        SIZE_CLASS[size],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  ),
)
Tile.displayName = "Tile"
