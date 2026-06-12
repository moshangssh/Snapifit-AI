import * as React from "react"
import { cn } from "@/lib/utils"

export interface KcalRowProps {
  label: React.ReactNode
  value: React.ReactNode
  dotClass?: string
  valueTone?: "pos" | "neg" | "default"
  className?: string
}

export const KcalRow: React.FC<KcalRowProps> = ({
  label,
  value,
  dotClass,
  valueTone = "default",
  className,
}) => (
  <div
    className={cn(
      "flex items-center justify-between py-2 border-b border-border last:border-b-0 text-sm",
      className,
    )}
  >
    <div className="flex items-center gap-2 text-muted-foreground">
      {dotClass && (
        <span className={cn("inline-block w-2 h-2 rounded-full", dotClass)} />
      )}
      <span>{label}</span>
    </div>
    <span
      className={cn(
        "font-semibold tabular-nums",
        valueTone === "pos" && "text-c-exercise",
        valueTone === "neg" && "text-c-weight",
      )}
    >
      {value}
    </span>
  </div>
)
