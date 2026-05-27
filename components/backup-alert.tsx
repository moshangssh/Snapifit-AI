"use client"

import Link from "next/link"
import { AlertTriangle } from "lucide-react"
import { useExportReminder } from "@/hooks/use-export-reminder"

export function BackupAlert() {
  const { shouldRemind, daysSinceLastExport, lastExportDate } = useExportReminder()

  if (!shouldRemind) return null

  const body = !lastExportDate
    ? "尚未备份过数据 · 建议导出 JSON 文件以防丢失"
    : `已 ${daysSinceLastExport} 天未备份数据 · 建议导出 JSON 文件以防丢失`

  return (
    <div className="alert warn mb-4 sm720:mb-6">
      <AlertTriangle className="alert-icon h-4 w-4" />
      <div className="alert-body">{body}</div>
      <span className="stamp new">建议新增</span>
      <Link href="/settings" className="alert-action">
        立即导出
      </Link>
    </div>
  )
}
