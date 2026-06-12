"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  BarChart3,
  ClipboardEdit,
  Dumbbell,
  MessageSquare,
  Settings,
  ChevronLeft,
} from "lucide-react"
import { useSidebarCollapsed } from "@/hooks/use-sidebar-collapsed"

type NavItem = {
  name: string
  href: string
  icon: typeof BarChart3
  carriesDate?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { name: "总览", href: "/", icon: BarChart3, carriesDate: true },
  { name: "工作台", href: "/workbench", icon: ClipboardEdit, carriesDate: true },
  { name: "训练", href: "/workout", icon: Dumbbell },
  { name: "智能对话", href: "/chat", icon: MessageSquare },
  { name: "设置", href: "/settings", icon: Settings },
]

export function MainNav() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const dateParam = searchParams.get("date")
  const { collapsed, toggle } = useSidebarCollapsed()

  const withDate = (href: string) =>
    dateParam ? `${href}${href.includes("?") ? "&" : "?"}date=${dateParam}` : href

  return (
    <aside
      data-collapsed={collapsed}
      className={cn(
        "sticky top-0 z-40 hidden h-screen flex-col border-r border-border bg-background px-3 py-4 sm720:flex",
        "transition-[width] duration-200 ease-out",
        collapsed ? "w-16" : "w-[220px]",
      )}
    >
      {/* 顶部 logo + 折叠按钮 */}
      <div className="mb-4 flex items-center justify-between px-2">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-foreground text-sm font-bold text-background">
            S
          </span>
          {!collapsed && (
            <span className="text-[17px] font-bold tracking-tight">Snapifit</span>
          )}
        </Link>
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "展开侧边栏" : "折叠侧边栏"}
          className={cn(
            "grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground",
            collapsed && "absolute right-2",
          )}
        >
          <ChevronLeft
            className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")}
          />
        </button>
      </div>

      {/* 导航 */}
      <nav className="flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.carriesDate ? withDate(item.href) : item.href}
              className={cn(
                "flex items-center gap-3 rounded-[10px] px-2.5 py-2 text-sm font-medium transition-colors",
                collapsed && "justify-center px-0",
                active
                  ? "bg-foreground text-background"
                  : "text-foreground/80 hover:bg-black/5 hover:text-foreground",
              )}
              title={collapsed ? item.name : undefined}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          )
        })}
      </nav>

      {/* 底部用户信息 */}
      <div className="mt-auto flex items-center gap-2.5 border-t border-border px-2 pt-3">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-foreground text-xs font-semibold text-background">
          X
        </div>
        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <div className="text-[13px] font-semibold">xdd</div>
            <div className="truncate text-xs text-muted-foreground">本地账户</div>
          </div>
        )}
      </div>
    </aside>
  )
}
