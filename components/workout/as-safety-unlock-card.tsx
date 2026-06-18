"use client"

import { ShieldAlert } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  AS_RISK_CATEGORIES,
  AS_RISK_CATEGORY_LABELS,
  type ASRiskCategory,
} from "@/lib/workout/engine/as-safety"

/**
 * AS 安全解锁开关（HITL）。默认全部关闭——引擎在所有阶段默认排除重轴向负重、
 * 负重过顶按压、奥举/爆发动作。只有用户在医生同意后显式解锁某一类，
 * 对应动作才会重新进入候选池。
 */
export function ASSafetyUnlockCard({
  unlockedRiskCategories,
  disabled = false,
  onToggle,
}: {
  unlockedRiskCategories: string[]
  disabled?: boolean
  onToggle: (category: ASRiskCategory, unlocked: boolean) => void
}) {
  const unlockedSet = new Set(unlockedRiskCategories)

  return (
    <Card className="rounded-2xl border-border shadow-none hover:shadow-none">
      <CardContent className="space-y-4 p-5 sm720:p-7">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="space-y-1">
            <h2 className="text-[17px] font-bold tracking-tight">AS 安全解锁</h2>
            <p className="text-sm text-muted-foreground">
              训练引擎默认排除这些对强直性脊柱炎风险较高的动作模式。
              <span className="font-medium text-foreground">
                请仅在风湿科 / 康复科医生同意后再解锁
              </span>
              ——本工具不替代医生意见。
            </p>
          </div>
        </div>

        <div className="divide-y divide-border rounded-xl border border-border">
          {AS_RISK_CATEGORIES.map((category) => {
            const id = `as-unlock-${category}`
            return (
              <div
                key={category}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <Label htmlFor={id} className="text-sm font-normal leading-snug">
                  {AS_RISK_CATEGORY_LABELS[category]}
                </Label>
                <Switch
                  id={id}
                  checked={unlockedSet.has(category)}
                  disabled={disabled}
                  onCheckedChange={(checked) => onToggle(category, checked)}
                />
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
