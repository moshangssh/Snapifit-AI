"use client"

import { useEffect, useState } from "react"
import { BookOpen } from "lucide-react"
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
  /** 目标肌群（已按引擎 plannedAnalysis 格式化）。 */
  muscleLabels: string
}

/**
 * 「动作指南」Dialog：演示视频 + 完整分步骤 + 全部技巧/常见错误 + 目标肌群。
 *
 * 沿用 ReplaceExerciseDialog / DiscomfortFlagDialog 的自带触发按钮模式。详情（分步骤 /
 * 视频 / 缩略图）走 `dynamic import` 懒加载，仅在首次打开时拉取，不进首屏包（ADR-0007）。
 * 视频仅用 `videoLightUrl`（项目不做暗色），加载失败回退缩略图；两者皆无则不渲染媒体。
 * 纯教学内容，绝不覆盖引擎处方或卡片上常驻的 AS 安全提醒。
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="bare" size="sm" className="text-xs">
          <BookOpen className="mr-1.5 h-4 w-4" />
          动作指南
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] gap-3 overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{displayName}</DialogTitle>
          <DialogDescription>
            动作指南 · 仅作教学参考，请以卡片上的安全提醒为准
          </DialogDescription>
        </DialogHeader>

        {/* 演示视频：仅 videoLightUrl；加载失败回退缩略图；两者皆无则不渲染媒体 */}
        {hasVideo && detail && (
          <video
            key={detail.videoLightUrl}
            src={detail.videoLightUrl}
            poster={detail.thumbnail || undefined}
            controls
            playsInline
            preload="none"
            className="w-full rounded-lg border border-border bg-black/5"
            onError={() => setVideoFailed(true)}
          />
        )}
        {showThumbnailFallback && detail && (
          // eslint-disable-next-line @next/next/no-img-element -- 热链外部素材，非自托管资源，不走 next/image
          <img
            src={detail.thumbnail}
            alt={`${displayName} 演示`}
            className="w-full rounded-lg border border-border"
          />
        )}

        {guide.description && (
          <p className="m-0 text-sm leading-relaxed text-foreground/80">
            {guide.description}
          </p>
        )}

        {/* 完整分步骤做法（懒加载） */}
        <section>
          <h4 className="mb-1 text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
            分步骤做法
          </h4>
          {detail ? (
            detail.instructions.length > 0 ? (
              <ol className="list-decimal space-y-1 pl-5 text-sm leading-relaxed text-foreground/80">
                {detail.instructions.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            ) : (
              <p className="m-0 text-sm text-muted-foreground">暂无分步骤说明。</p>
            )
          ) : (
            <p className="m-0 text-sm text-muted-foreground">加载中…</p>
          )}
        </section>

        {/* 全部技巧提示 */}
        {guide.tips.length > 0 && (
          <section>
            <h4 className="mb-1 text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
              技巧提示
            </h4>
            <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-foreground/80">
              {guide.tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </section>
        )}

        {/* 全部常见错误 */}
        {guide.commonMistakes.length > 0 && (
          <section>
            <h4 className="mb-1 text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
              常见错误
            </h4>
            <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-foreground/80">
              {guide.commonMistakes.map((mistake) => (
                <li key={mistake}>{mistake}</li>
              ))}
            </ul>
          </section>
        )}

        {/* 目标肌群（来自引擎 plannedAnalysis，卡片格式化后传入） */}
        <div className="text-xs text-muted-foreground">
          目标肌群:
          <b className="ml-1 font-medium text-foreground/80">{muscleLabels}</b>
        </div>
      </DialogContent>
    </Dialog>
  )
}
