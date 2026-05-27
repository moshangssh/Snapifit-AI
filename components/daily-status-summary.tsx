"use client"

import Link from "next/link"
import { ChevronRight, Moon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { ScorePips } from "@/components/ui/score-pips"
import { SectionCardHeader } from "@/components/ui/section-card-header"
import {
  STATUS_LEVEL_TEXT,
  STATUS_SCORE_ITEMS,
  getStatusScore,
} from "@/lib/daily-status"
import type { DailyStatus } from "@/lib/types"

interface Props {
  status?: DailyStatus
  href?: string
}

export function DailyStatusSummary({ status, href = "/workbench" }: Props) {
  return (
    <Card className="rounded-2xl border-border">
      <CardContent className="p-5 sm720:p-7">
        <SectionCardHeader
          tileVariant="status"
          icon={<Moon className="text-white" />}
          title="每日状态"
          action={
            <Link href={href} className="card-action">
              编辑 <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          }
        />

        {!status ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            今日暂无状态记录,前往工作台填写
          </p>
        ) : (
          <div className="status-grid">
            {STATUS_SCORE_ITEMS.map((it) => {
              const safe = getStatusScore(status, it.key)
              return (
                <div key={it.key} className="status-item">
                  <div className="status-label">
                    <span>{it.label}</span>
                    <b>
                      {STATUS_LEVEL_TEXT[safe] || "未记录"} ({safe || "-"})
                    </b>
                  </div>
                  <ScorePips value={safe} />
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
