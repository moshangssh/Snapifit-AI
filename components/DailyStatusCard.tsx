"use client"

import { useEffect, useState } from "react"
import { Check, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tile } from "@/components/ui/tile"
import { ScorePips } from "@/components/ui/score-pips"
import {
  STATUS_LEVEL_TEXT,
  STATUS_SCORE_ITEMS,
  type StatusScoreKey,
} from "@/lib/daily-status"
import type { DailyStatus } from "@/lib/types"

interface DailyStatusCardProps {
  date: string
  initialStatus?: DailyStatus
  onSave: (status: DailyStatus) => void
}

type StatusNoteKey = "stressNotes" | "moodNotes" | "healthNotes" | "sleepNotes"

const DEFAULT_STATUS: DailyStatus = {
  stress: 3,
  mood: 3,
  health: 3,
  sleepQuality: 3,
  bedTime: "",
  wakeTime: "",
  stressNotes: "",
  moodNotes: "",
  healthNotes: "",
  sleepNotes: "",
}

const NOTE_ITEMS: Array<{ key: StatusNoteKey; label: string; placeholder: string }> = [
  { key: "stressNotes", label: "压力备注", placeholder: "压力来源 / 应对方式..." },
  { key: "moodNotes", label: "心情备注", placeholder: "心情起伏 / 触发事件..." },
  { key: "healthNotes", label: "健康备注", placeholder: "身体感受 / 不适 / 用药..." },
  { key: "sleepNotes", label: "睡眠备注", placeholder: "入睡难易 / 夜醒 / 做梦..." },
]

export function DailyStatusCard({ date: _date, initialStatus, onSave }: DailyStatusCardProps) {
  const [status, setStatus] = useState<DailyStatus>({ ...DEFAULT_STATUS, ...initialStatus })

  useEffect(() => {
    setStatus({ ...DEFAULT_STATUS, ...initialStatus })
  }, [initialStatus])

  const updateScore = (field: StatusScoreKey, value: number) => {
    setStatus((prev) => ({ ...prev, [field]: value }))
  }

  const updateText = (field: StatusNoteKey | "bedTime" | "wakeTime", value: string) => {
    setStatus((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = () => {
    onSave(status)
  }

  return (
    <Card className="w-full rounded-2xl border-border shadow-none transition-none hover:shadow-none">
      <CardContent className="p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="card-title-row">
            <Tile variant="status" size={36}>
              <Moon />
            </Tile>
            <div className="card-title">每日状态 · 1-6 分</div>
          </div>
          <Button
            variant="ink"
            size="sm"
            onClick={handleSave}
            className="h-7 rounded-[10px] px-3 text-xs font-semibold [&_svg]:size-3"
          >
            <Check className="mr-1.5 h-4 w-4" />
            保存状态
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {STATUS_SCORE_ITEMS.map((item) => {
            const value = Number(status[item.key] ?? 3)

            return (
              <div key={item.key}>
                <div className="mb-1.5 flex items-center justify-between text-[11px] leading-none text-muted-foreground">
                  <span>{item.label}</span>
                  <b className="text-[11px] font-semibold text-foreground">
                    {STATUS_LEVEL_TEXT[value] ?? value} ({value})
                  </b>
                </div>
                <ScorePips
                  value={value}
                  interactive
                  onChange={(level) => updateScore(item.key, level)}
                  ariaLabel={(level) => `${item.label} ${level} 分`}
                />
              </div>
            )
          })}
        </div>

        <div className="mt-3.5 grid grid-cols-2 gap-2.5">
          <label className="block">
            <span className="mb-1 block text-[11px] leading-none text-muted-foreground">入睡时间</span>
            <Input
              type="time"
              value={status.bedTime ?? ""}
              onChange={(event) => updateText("bedTime", event.target.value)}
              className="h-[42px] rounded-[10px] border-border bg-[var(--surface-subtle)] px-3 text-sm tabular-nums focus-visible:ring-1 focus-visible:ring-foreground focus-visible:ring-offset-0"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] leading-none text-muted-foreground">起床时间</span>
            <Input
              type="time"
              value={status.wakeTime ?? ""}
              onChange={(event) => updateText("wakeTime", event.target.value)}
              className="h-[42px] rounded-[10px] border-border bg-[var(--surface-subtle)] px-3 text-sm tabular-nums focus-visible:ring-1 focus-visible:ring-foreground focus-visible:ring-offset-0"
            />
          </label>
        </div>

        <div className="mt-3.5 grid grid-cols-2 gap-2.5">
          {NOTE_ITEMS.map((item) => (
            <label key={item.key} className="block">
              <span className="mb-1 block text-[11px] leading-none text-muted-foreground">{item.label}</span>
              <Textarea
                value={(status[item.key] as string | undefined) ?? ""}
                onChange={(event) => updateText(item.key, event.target.value)}
                placeholder={item.placeholder}
                className="h-[68px] min-h-[68px] resize-none rounded-[10px] border-border bg-[var(--surface-subtle)] px-3 py-2 text-sm leading-snug focus-visible:ring-1 focus-visible:ring-foreground focus-visible:ring-offset-0"
              />
            </label>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
