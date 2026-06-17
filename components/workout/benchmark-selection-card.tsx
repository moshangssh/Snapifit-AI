import { CheckCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import type { BenchmarkCandidateDetail } from "@/lib/workout/engine/benchmark-selection"

export function BenchmarkSelectionCard({
  candidates,
  selectedIds,
  nextPhase,
  onSelectedIdsChange,
  onConfirm,
}: {
  candidates: BenchmarkCandidateDetail[]
  selectedIds: string[]
  nextPhase: "intermediate" | "advanced"
  onSelectedIdsChange: (ids: string[]) => void
  onConfirm: () => void
}) {
  const selectedSet = new Set(selectedIds)
  const maxSelection = nextPhase === "advanced" ? 5 : 10
  const minSelection = nextPhase === "advanced" ? 5 : 8
  const canConfirm =
    selectedIds.length >= minSelection && selectedIds.length <= maxSelection

  return (
    <Card className="rounded-2xl border-border shadow-none hover:shadow-none">
      <CardContent className="space-y-5 p-5 sm720:p-7">
        <div className="flex flex-col gap-3 sm720:flex-row sm720:items-start sm720:justify-between">
          <div className="space-y-1">
            <h2 className="text-[22px] font-bold tracking-tight">
              {nextPhase === "advanced"
                ? "选择终生基准动作"
                : "选择中级基准动作"}
            </h2>
            <p className="text-sm text-muted-foreground">
              已选择 {selectedIds.length}/
              {nextPhase === "advanced" ? "5" : "8-10"}（
              {nextPhase === "advanced" ? "必须 5 个" : "至少 8 个，最多 10 个"}）
            </p>
          </div>
          <Badge variant="secondary" className="w-fit">
            胸/背/肩/腿/臂/核心
          </Badge>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {candidates.map((candidate) => {
            const checked = selectedSet.has(candidate.id)
            return (
              <label
                key={candidate.id}
                className="flex min-h-[92px] cursor-pointer gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-muted/40"
              >
                <Checkbox
                  className="mt-1"
                  checked={checked}
                  onCheckedChange={(value) => {
                    if (value) {
                      onSelectedIdsChange(
                        selectedSet.has(candidate.id)
                          ? selectedIds
                          : [...selectedIds, candidate.id].slice(0, maxSelection),
                      )
                    } else {
                      onSelectedIdsChange(
                        selectedIds.filter((id) => id !== candidate.id),
                      )
                    }
                  }}
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">
                        {candidate.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatTrainingGroup(candidate.trainingGroup)}
                      </div>
                    </div>
                    {checked && (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-md bg-muted px-2 py-1">
                      训练 {candidate.trainingCount} 次
                    </div>
                    <div className="rounded-md bg-muted px-2 py-1">
                      {formatWeight(candidate.initialWeightKg)} →{" "}
                      {formatWeight(candidate.latestPrWeightKg)}，
                      {formatSignedWeight(candidate.progressWeightKg)}
                    </div>
                  </div>
                </div>
              </label>
            )
          })}
        </div>

        <div className="flex justify-end">
          <Button variant="ink" disabled={!canConfirm} onClick={onConfirm}>
            确认{nextPhase === "advanced" ? "终生" : ""}基准动作
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function formatTrainingGroup(group: BenchmarkCandidateDetail["trainingGroup"]) {
  const labels: Record<BenchmarkCandidateDetail["trainingGroup"], string> = {
    chest: "胸",
    back: "背",
    shoulders: "肩",
    legs: "腿",
    arms: "臂",
    core: "核心",
  }
  return labels[group]
}

function formatWeight(weightKg?: number) {
  return typeof weightKg === "number" ? `${weightKg}kg` : "未记录"
}

function formatSignedWeight(weightKg: number) {
  if (weightKg === 0) return "无变化"
  return `${weightKg > 0 ? "+" : ""}${weightKg}kg`
}
