import * as React from "react"
import { cn } from "@/lib/utils"

export interface PageHeaderProps {
  title: React.ReactNode
  subtitle?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  actions,
  className,
}) => (
  <header
    className={cn(
      "mb-6 flex flex-col gap-4 sm720:mb-8 sm720:flex-row sm720:items-end sm720:justify-between",
      className,
    )}
  >
    <div>
      <h1 className="text-2xl font-bold tracking-tight sm720:text-3xl">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      )}
    </div>
    {actions && (
      <div className="flex flex-wrap items-center gap-2">{actions}</div>
    )}
  </header>
)
