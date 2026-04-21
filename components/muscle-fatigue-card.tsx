"use client"

import dynamic from "next/dynamic"
import { useMemo, useState } from "react"
import { Activity } from "lucide-react"
import type { Slug } from "react-muscle-highlighter"

import { useMuscleFatigue } from "@/hooks/use-muscle-fatigue"
import { useTranslation } from "@/hooks/use-i18n"
import {
  FRONT_MUSCLES,
  BACK_MUSCLES,
  MUSCLE_TO_LIB_SLUG,
  type MuscleKey,
} from "@/lib/muscle-groups"

// 库内部直接使用 SVG + 浏览器 API,SSR 下会炸。
const Body = dynamic(
  () => import("react-muscle-highlighter").then((m) => m.default),
  {
    ssr: false,
    loading: () => (
      <div className="h-[240px] w-full rounded bg-muted/40 animate-pulse" />
    ),
  },
)

const INTENSITY_COLOR: Record<0 | 30 | 60 | 100, string> = {
  100: "#ef4444", // red-500
  60: "#f97316", // orange-500
  30: "#eab308", // yellow-500
  0: "#e5e7eb", // slate-200
}

type Props = {
  selectedDate: Date
  refreshTrigger?: number
}

export function MuscleFatigueCard({ selectedDate, refreshTrigger }: Props) {
  const t = useTranslation("dashboard.muscleFatigue")
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
  const whenKey =
    selectedState?.daysAgo === 0
      ? "whenToday"
      : selectedState?.daysAgo === 1
        ? "whenYesterday"
        : selectedState?.daysAgo === 2
          ? "whenDayBefore"
          : "whenRecovered"

  return (
    <div className="health-card p-8 space-y-6">
      <div className="flex items-center space-x-4">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-white">
          <Activity className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">{t("title")}</h3>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="h-[220px] animate-pulse rounded-lg bg-muted" />
      ) : !hasAnyRecord ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          <Activity className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>{t("empty")}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col items-center">
              <Body
                side="front"
                data={frontData}
                onBodyPartPress={(b) => {
                  const key = slugToFront[b.slug ?? ""]
                  if (key) setSelected(key)
                }}
              />
              <span className="text-xs text-muted-foreground mt-1">
                {t("viewFront")}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <Body
                side="back"
                data={backData}
                onBodyPartPress={(b) => {
                  const key = slugToBack[b.slug ?? ""]
                  if (key) setSelected(key)
                }}
              />
              <span className="text-xs text-muted-foreground mt-1">
                {t("viewBack")}
              </span>
            </div>
          </div>

          <div className="min-h-10">
            {selected && selectedState ? (
              <div className="text-sm text-center px-3 py-2 rounded-md bg-muted">
                <span className="font-medium">
                  {t(`muscleLabels.${selected}`)}
                </span>
                <span className="mx-2 text-muted-foreground">·</span>
                <span>{t(whenKey)}</span>
                {selectedState.lastExerciseName && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {selectedState.lastExerciseName}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
            <LegendDot color="#ef4444" label={t("legendToday")} />
            <LegendDot color="#f97316" label={t("legendYesterday")} />
            <LegendDot color="#eab308" label={t("legendDayBefore")} />
            <LegendDot color="#e5e7eb" label={t("legendRecovered")} />
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
