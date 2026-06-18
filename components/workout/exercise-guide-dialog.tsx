"use client"

import { useEffect, useState } from "react"
import { BookOpen, Dumbbell } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import type { ExerciseGuideDetailEntry } from "@/lib/workout/engine/exercise-guide-detail"
import type { ExerciseGuide } from "@/lib/workout/exercise-guide"

interface ExerciseGuideDialogProps {
  /** catalog 动作身份：用于懒加载时按 id 取详情。 */
  catalogExerciseId: string
  /** 当前动作展示名（标题）。 */
  displayName: string
  /** 内联内容（概述 / 全部技巧 / 全部常见错误），卡片已查表，首屏直接传入。 */
  guide: ExerciseGuide
  /** 目标肌群（已按引擎 plannedAnalysis 格式化，以「, 」连接）。 */
  muscleLabels: string
}

/** 安静手账风的章节小标题（Label 层级：铅灰、大写、加宽字距）。 */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
      {children}
    </h4>
  )
}

/**
 * 「动作指南」Dialog：演示视频 + 完整分步骤 + 全部技巧/常见错误 + 目标肌群。
 *
 * 沿用 ReplaceExerciseDialog / DiscomfortFlagDialog 的自带触发按钮模式。详情（分步骤 /
 * 视频 / 缩略图）走 `dynamic import` 懒加载，仅在首次打开时拉取，不进首屏包（ADR-0007）。
 * 视频仅用 `videoLightUrl`（项目不做暗色），加载失败回退缩略图；两者皆无则不渲染媒体。
 * 纯教学内容，绝不覆盖引擎处方或卡片上常驻的 AS 安全提醒。
 *
 * 视觉遵循 DESIGN.md「安静的健康手账」：炭黑/米白承担 ≥85%，唯一分类色 cinnabar（运动红）
 * 只落在头部 32px 动作 tile 与「常见错误」的 8px 警示点上（Category Lock：红=运动/警示）；
 * 章节之间用 1px 标尺线分隔（border-is-the-shadow，无阴影），步骤编号用 tabular-nums。
 */
export function ExerciseGuideDialog({
  catalogExerciseId,
  displayName,
  guide,
  muscleLabels,
}: ExerciseGuideDialogProps) {
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<ExerciseGuideDetailEntry | null>(null)
  const [videoFailed, setVideoFailed] = useState(false)

  // 仅首次打开时懒加载详情模块（不进首屏包）。
  useEffect(() => {
    if (!open || detail) return
    let active = true
    import("@/lib/workout/engine/exercise-guide-detail").then((mod) => {
      if (active) {
        setDetail(mod.EXERCISE_GUIDE_DETAIL[catalogExerciseId] ?? null)
      }
    })
    return () => {
      active = false
    }
  }, [open, detail, catalogExerciseId])

  const hasVideo = Boolean(detail?.videoLightUrl) && !videoFailed
  const showThumbnailFallback =
    Boolean(detail?.thumbnail) && (!detail?.videoLightUrl || videoFailed)
  const hasMedia = hasVideo || showThumbnailFallback

  // 已格式化的肌群字符串拆成 chip（卡片以「, 」连接，拆分稳定）。
  const muscles = muscleLabels
    .split(/[,，]\s*/)
    .map((label) => label.trim())
    .filter(Boolean)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="bare" size="sm" className="text-xs">
          <BookOpen className="mr-1.5 h-4 w-4" />
          动作指南
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] gap-0 overflow-y-auto p-0 sm:max-w-2xl">
        {/* 头部：唯一的分类色落点——cinnabar 运动 tile（DESIGN 签名组件） */}
        <DialogHeader className="space-y-0 border-b border-border py-5 pl-6 pr-12 text-left">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-c-exercise text-white">
              <Dumbbell className="h-[22px] w-[22px]" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="truncate text-xl font-bold tracking-[-0.01em]">
                {displayName}
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-xs">
                动作指南 · 仅作教学参考，请以卡片上的安全提醒为准
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* 正文：章节用 1px 标尺线分隔（border-is-the-shadow，全程无阴影、无渐变） */}
        <div className="divide-y divide-border">
          {/* 演示视频：仅 videoLightUrl；加载失败回退缩略图；两者皆无则不渲染媒体 */}
          {hasMedia && detail && (
            <div className="px-6 py-4">
              <div className="overflow-hidden rounded-xl border border-border">
                {hasVideo && (
                  <video
                    key={detail.videoLightUrl}
                    src={detail.videoLightUrl}
                    poster={detail.thumbnail || undefined}
                    controls
                    playsInline
                    preload="none"
                    className="block aspect-video w-full bg-black object-contain"
                    onError={() => setVideoFailed(true)}
                  />
                )}
                {showThumbnailFallback && (
                  // eslint-disable-next-line @next/next/no-img-element -- 热链外部素材，非自托管资源，不走 next/image
                  <img
                    src={detail.thumbnail}
                    alt={`${displayName} 演示`}
                    className="block aspect-video w-full object-cover"
                  />
                )}
              </div>
            </div>
          )}

          {/* 概述 + 目标肌群（同一引导区，肌群以中性 chip 呈现，不挪用分类色） */}
          {(guide.description || muscles.length > 0) && (
            <div className="space-y-3 px-6 py-4">
              {guide.description && (
                <p className="m-0 text-sm leading-relaxed text-foreground/80">
                  {guide.description}
                </p>
              )}
              {muscles.length > 0 && (
                <div className="space-y-2">
                  <SectionLabel>目标肌群</SectionLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {muscles.map((muscle) => (
                      <span
                        key={muscle}
                        className="rounded-md bg-black/[0.04] px-2 py-0.5 text-xs font-medium text-muted-foreground"
                      >
                        {muscle}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 完整分步骤做法（懒加载）——炭黑描边编号，tabular-nums 对齐 */}
          <section className="space-y-3 px-6 py-4">
            <SectionLabel>分步骤做法</SectionLabel>
            {detail ? (
              detail.instructions.length > 0 ? (
                <ol className="m-0 list-none space-y-2.5 p-0">
                  {detail.instructions.map((step, index) => (
                    <li key={index} className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-xs font-semibold tabular-nums text-foreground">
                        {index + 1}
                      </span>
                      <span className="pt-0.5 text-sm leading-relaxed text-foreground/80">
                        {step}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="m-0 text-sm text-muted-foreground">暂无分步骤说明。</p>
              )
            ) : (
              // 骨架占位（DESIGN：loading 用 skeleton，不用 spinner）
              <div className="space-y-2" aria-hidden>
                <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
              </div>
            )}
          </section>

          {/* 全部技巧提示——中性圆点标记 */}
          {guide.tips.length > 0 && (
            <section className="space-y-3 px-6 py-4">
              <SectionLabel>技巧提示</SectionLabel>
              <ul className="m-0 list-none space-y-2 p-0">
                {guide.tips.map((tip) => (
                  <li
                    key={tip}
                    className="flex gap-2.5 text-sm leading-relaxed text-foreground/80"
                  >
                    <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-foreground/35" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 全部常见错误——cinnabar 8px 警示点（Category Lock：红=运动/警示，唯一例外） */}
          {guide.commonMistakes.length > 0 && (
            <section className="space-y-3 px-6 py-4">
              <SectionLabel>常见错误</SectionLabel>
              <ul className="m-0 list-none space-y-2 p-0">
                {guide.commonMistakes.map((mistake) => (
                  <li
                    key={mistake}
                    className="flex gap-2.5 text-sm leading-relaxed text-foreground/80"
                  >
                    <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-c-exercise" />
                    <span>{mistake}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
