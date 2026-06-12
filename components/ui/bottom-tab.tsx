"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { BarChart3, ClipboardEdit, Dumbbell, MessageSquare, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

const TABS = [
  { name: "总览", href: "/", icon: BarChart3, carriesDate: true },
  { name: "工作台", href: "/workbench", icon: ClipboardEdit, carriesDate: true },
  { name: "训练", href: "/workout", icon: Dumbbell },
  { name: "对话", href: "/chat", icon: MessageSquare },
  { name: "设置", href: "/settings", icon: Settings },
]

export function BottomTab() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const dateParam = searchParams.get("date")
  const withDate = (href: string) =>
    dateParam ? `${href}${href.includes("?") ? "&" : "?"}date=${dateParam}` : href
  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 flex h-14 items-stretch border-t border-border bg-background sm720:hidden",
        "pb-[env(safe-area-inset-bottom)]",
      )}
      aria-label="Mobile navigation"
    >
      {TABS.map((tab) => {
        const active =
          tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href)
        const Icon = tab.icon
        return (
          <Link
            key={tab.href}
            href={tab.carriesDate ? withDate(tab.href) : tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex-1 grid place-items-center gap-0.5 text-[11px] transition-colors",
              active
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon
              className={cn("h-5 w-5", active && "text-foreground")}
              aria-hidden="true"
            />
            <span>{tab.name}</span>
          </Link>
        )
      })}
    </nav>
  )
}
