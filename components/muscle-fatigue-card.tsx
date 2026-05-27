"use client"

import dynamic from "next/dynamic"
import { useMemo, useState } from "react"
import { Activity } from "lucide-react"
import type { Slug } from "react-muscle-highlighter"

import { useMuscleFatigue } from "@/hooks/use-muscle-fatigue"
import { Tile } from "@/components/ui/tile"
import {
  FRONT_MUSCLES,
  BACK_MUSCLES,
  MUSCLE_TO_LIB_SLUG,
  MUSCLE_LABELS_ZH,
  type MuscleKey,
} from "@/lib/muscle-groups"

// 库内部直接使用 SVG + 浏览器 API,SSR 下会炸。
const Body = dynamic(
  () => import("react-muscle-highlighter").then((m) => m.default),
  {
    ssr: false,
    loading: () => (
      <div className="h-[320px] w-full rounded bg-muted/40 animate-pulse" />
    ),
  },
)

const INTENSITY_COLOR: Record<0 | 30 | 60 | 100, string> = {
  100: "#EF4444", // 今天 - 红
  60: "#F97316", //  昨天 - 橙
  30: "#EAB308", //  前天 - 黄
  0: "#E5E7EB", //   已恢复 - 浅灰
}

type Props = {
  selectedDate: Date
  refreshTrigger?: number
}

export function MuscleFatigueCard({ selectedDate, refreshTrigger }: Props) {
  const { byMuscle, isLoading, hasAnyRecord } = useMuscleFatigue(
    selectedDate,
    refreshTrigger,
  )
  const [selected, setSelected] = useState<MuscleKey | null>(null)

  const { frontData, backData, slugToFront, slugToBack } = useMemo(() => {
    const buildData = (keys: readonly MuscleKey[]) =>
      keys.map((k) => {
        const intensity = byMuscle[k]?.intensity ?? 0
        return {
          slug: MUSCLE_TO_LIB_SLUG[k] as Slug,
          intensity,
          color: INTENSITY_COLOR[intensity],
        }
      })
    const reverse = (keys: readonly MuscleKey[]) => {
      const m: Record<string, MuscleKey> = {}
      for (const k of keys) m[MUSCLE_TO_LIB_SLUG[k]] = k
      return m
    }
    return {
      frontData: buildData(FRONT_MUSCLES),
      backData: buildData(BACK_MUSCLES),
      slugToFront: reverse(FRONT_MUSCLES),
      slugToBack: reverse(BACK_MUSCLES),
    }
  }, [byMuscle])

  const selectedState = selected ? byMuscle[selected] : null
  const selectedWhenText =
    selectedState?.daysAgo === 0
      ? "今天训练"
      : selectedState?.daysAgo === 1
        ? "昨天训练"
        : selectedState?.daysAgo === 2
          ? "前天训练"
          : "已恢复"

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm720:p-7 space-y-3">
      <div className="card-head">
        <div className="card-title-row">
          <Tile variant="exercise" size={36}>
            <Activity />
          </Tile>
          <div>
            <div className="card-title">今日恢复状态</div>
            <div className="mt-0.5 text-xs text-muted-foreground">过去 3 天训练影响</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-x-2.5 gap-y-1 pt-1 text-xs text-muted-foreground">
          <LegendDot color="#EF4444" label="今" />
          <LegendDot color="#F97316" label="昨" />
          <LegendDot color="#EAB308" label="前" />
          <LegendDot color="#E5E7EB" label="恢复" />
        </div>
      </div>

      {isLoading ? (
        <div className="h-[320px] animate-pulse rounded-lg bg-muted" />
      ) : !hasAnyRecord ? (
        <div className="py-6 text-center text-sm text-muted-foreground">
          <Activity className="mx-auto mb-3 h-10 w-10 opacity-40" />
          <p>暂无近期训练记录,记录运动后这里会显示肌肉恢复状态</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col items-center">
              <Body
                side="front"
                scale={0.78}
                data={frontData}
                onBodyPartPress={(b) => {
                  const key = slugToFront[b.slug ?? ""]
                  if (key) setSelected(key)
                }}
              />
              <span className="mt-1 text-xs text-muted-foreground">前</span>
            </div>
            <div className="flex flex-col items-center">
              <Body
                side="back"
                scale={0.78}
                data={backData}
                onBodyPartPress={(b) => {
                  const key = slugToBack[b.slug ?? ""]
                  if (key) setSelected(key)
                }}
              />
              <span className="mt-1 text-xs text-muted-foreground">后</span>
            </div>
          </div>

          <div className="flex min-h-9 items-center justify-center">
            {selected && selectedState ? (
              <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs">
                <span className="font-medium text-foreground">{MUSCLE_LABELS_ZH[selected]}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-foreground">{selectedWhenText}</span>
                {selectedState.lastExerciseName && (
                  <>
                    <span className="text-muted-foreground">·</span>
                    <span className="truncate text-muted-foreground">
                      {selectedState.lastExerciseName}
                    </span>
                  </>
                )}
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span
        className="inline-block w-2.5 h-2.5 rounded-sm"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  )
}
