"use client"

import * as React from "react"
import { Edit2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type EntrySwatchToken =
  | "food"
  | "exercise"
  | "weight"
  | "status"
  | "mood"
  | "ai"
  | "purple"

export interface EntryRowProps {
  /** swatch 与 estimated 徽标都使用这个色板 token */
  swatchToken: EntrySwatchToken
  /** 标题前的小徽标(食物条目里的"早/午/晚/加") */
  leading?: React.ReactNode
  title: React.ReactNode
  isEstimated?: boolean
  /** 标题下方一行微标签(食物条目的碳水/蛋白/脂肪/份量) */
  tags?: React.ReactNode
  /** 标题下方多行 meta 文本(运动条目的时长/部位) */
  metaLines?: React.ReactNode[]
  /** 右侧数值显示,如 "120 kcal" 或 "−45 kcal" */
  value: React.ReactNode
  valueVariant?: "default" | "burn"
  showActions?: boolean
  onEdit?: () => void
  onDelete?: () => void
}

export function EntryRow({
  swatchToken,
  leading,
  title,
  isEstimated,
  tags,
  metaLines,
  value,
  valueVariant = "default",
  showActions = true,
  onEdit,
  onDelete,
}: EntryRowProps) {
  return (
    <div className="entry">
      <span
        className="swatch"
        style={{ background: `hsl(var(--c-${swatchToken}))` }}
      />
      <div className="min-w-0 flex-1">
        <div className="name flex items-center gap-1.5">
          {leading}
          <span className="truncate">{title}</span>
          {isEstimated && (
            <span className="rounded bg-c-food/15 px-1 text-[10px] font-medium text-c-food">
              估算
            </span>
          )}
        </div>
        {tags}
        {metaLines?.map((line, i) => (
          <div key={i} className="meta">
            {line}
          </div>
        ))}
      </div>
      <div className={cn("num", valueVariant === "burn" && "burn")}>{value}</div>
      {showActions && (
        <div className="-mr-1 flex flex-none items-center">
          <Button size="icon" variant="ghost" onClick={onEdit} className="h-8 w-8">
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onDelete}
            className="h-8 w-8 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  )
}
