"use client"

import { useEffect, useRef, useState } from "react"
import { format, subDays } from "date-fns"
import { Check, Clock3, Edit3, X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Tile } from "@/components/ui/tile"
import { Button } from "@/components/ui/button"
import { useIndexedDB } from "@/hooks/use-indexed-db"
import { useToast } from "@/hooks/use-toast"
import {
  findRecentWeightSource,
  formatWeightKg,
  formatWeightSource,
  isValidWeight,
  type WeightSource,
} from "@/lib/weight-display"
import type { DailyLog } from "@/lib/types"

const RECENT_WEIGHT_LOOKBACK_DAYS = 90

interface Props {
  selectedDate: Date
  todayWeight?: number
  defaultWeight?: number
  onSave?: (weight: number | undefined) => void | Promise<void>
  /** "card"(默认):独立卡;"twin":去除外壳供 Hero 双子卡使用 */
  variant?: "card" | "twin"
  /** 目标体重,仅 twin 模式时用于副行显示 */
  targetWeight?: number
  disabled?: boolean
}

export function TodayWeightCard({
  selectedDate,
  todayWeight,
  defaultWeight,
  onSave,
  variant = "card",
  targetWeight,
  disabled = false,
}: Props) {
  const { getData } = useIndexedDB("healthLogs")
  const { toast } = useToast()
  const [yesterdayWeight, setYesterdayWeight] = useState<number | undefined>()
  const [sevenDayDelta, setSevenDayDelta] = useState<number | undefined>()
  const [recentWeightSource, setRecentWeightSource] = useState<WeightSource | undefined>()
  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const y = subDays(selectedDate, 1)
        const yDateKey = format(y, "yyyy-MM-dd")
        const yLog: DailyLog | null = await getData(yDateKey)
        if (cancelled) return
        setYesterdayWeight(isValidWeight(yLog?.weight) ? yLog.weight : undefined)

        if (todayWeight === undefined) {
          const source = await findRecentWeightSource(
            selectedDate,
            RECENT_WEIGHT_LOOKBACK_DAYS,
            async (dateKey) => (dateKey === yDateKey ? yLog : getData(dateKey)),
          )
          if (cancelled) return
          setRecentWeightSource(source)
        } else {
          setRecentWeightSource(undefined)
        }

        // 7 日跨度:第 -7 天体重 vs 今日体重
        const sevenAgo = subDays(selectedDate, 7)
        const sLog: DailyLog | null = await getData(format(sevenAgo, "yyyy-MM-dd"))
        if (cancelled) return
        if (todayWeight !== undefined && isValidWeight(sLog?.weight)) {
          setSevenDayDelta(todayWeight - sLog.weight)
        } else {
          setSevenDayDelta(undefined)
        }
      } catch {
        // ignore
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedDate, todayWeight, getData])

  useEffect(() => {
    if (isEditing) {
      // 等下一帧 DOM 渲染好再聚焦
      requestAnimationFrame(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      })
    }
  }, [isEditing])

  const dayDelta =
    todayWeight !== undefined && yesterdayWeight !== undefined
      ? todayWeight - yesterdayWeight
      : undefined

  const renderDelta = () => {
    if (todayWeight === undefined) {
      return recentWeightSource !== undefined
        ? `今日未记录 · ${formatWeightSource(recentWeightSource, selectedDate)}`
        : defaultWeight !== undefined
          ? `今日未记录 · 默认 ${formatWeightKg(defaultWeight)} kg`
        : "今日未记录体重"
    }
    const parts: string[] = []
    if (dayDelta !== undefined) {
      const arrow = dayDelta === 0 ? "—" : dayDelta < 0 ? "↓" : "↑"
      parts.push(`${arrow} ${Math.abs(dayDelta).toFixed(1)} 较昨日`)
    }
    if (sevenDayDelta !== undefined) {
      const sign = sevenDayDelta === 0 ? "" : sevenDayDelta < 0 ? "−" : "+"
      parts.push(`7 日 ${sign}${Math.abs(sevenDayDelta).toFixed(1)}`)
    }
    return parts.length ? parts.join(" · ") : "暂无趋势"
  }

  const deltaClass =
    dayDelta !== undefined && dayDelta < 0
      ? "text-c-weight"
      : dayDelta !== undefined && dayDelta > 0
        ? "text-c-exercise"
        : "text-muted-foreground"

  const enterEdit = () => {
    if (disabled) return
    setInputValue(todayWeight !== undefined ? todayWeight.toString() : "")
    setIsEditing(true)
  }

  const cancelEdit = () => {
    setIsEditing(false)
    setInputValue("")
  }

  const submit = async () => {
    const trimmed = inputValue.trim()
    // 空输入 = 清空记录
    if (trimmed === "") {
      if (todayWeight === undefined) {
        setIsEditing(false)
        return
      }
      try {
        setIsSaving(true)
        await onSave?.(undefined)
        toast({
          title: "体重已清除",
          description: "已清除当日体重记录",
        })
        setIsEditing(false)
      } finally {
        setIsSaving(false)
      }
      return
    }
    const value = parseFloat(trimmed)
    if (isNaN(value) || value <= 0) {
      toast({
        title: "无效输入",
        description: "请输入有效的体重值。",
        variant: "destructive",
      })
      return
    }
    try {
      setIsSaving(true)
      await onSave?.(value)
      toast({
        title: "今日体重已记录",
        description: `已保存 ${value} kg`,
      })
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }

  if (variant === "twin") {
    const fallbackWeightText =
      recentWeightSource !== undefined
        ? formatWeightSource(recentWeightSource, selectedDate)
        : defaultWeight !== undefined
          ? `默认 ${formatWeightKg(defaultWeight)} kg`
          : "今日未记录"
    const targetSub =
      todayWeight === undefined
        ? fallbackWeightText
        : targetWeight !== undefined
          ? `目标 ${formatWeightKg(targetWeight)} kg · 差 ${Math.abs(todayWeight - targetWeight).toFixed(1)} kg`
          : renderDelta()
    return (
      <div
        className={`twin weight ${todayWeight === undefined ? "empty" : ""}`}
        onClick={() => !disabled && !isEditing && enterEdit()}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled && !isEditing) enterEdit()
        }}
      >
        <div className="twin-icon">
          <Clock3 />
        </div>
        <div className="twin-body">
          <div className="twin-label">今日体重</div>
          {isEditing ? (
            <div className="twin-main">
              <input
                ref={inputRef}
                type="number"
                inputMode="decimal"
                step="0.1"
                value={inputValue}
                disabled={disabled}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit()
                  if (e.key === "Escape") cancelEdit()
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-[5ch] border-0 bg-transparent p-0 text-[18px] font-bold leading-tight tabular-nums outline-none placeholder:text-muted-foreground/40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                placeholder="—"
              />
              <small>kg</small>
            </div>
          ) : (
            <div className="twin-main">
              {todayWeight !== undefined ? (
                <>
                  {todayWeight.toFixed(1)}
                  <small>kg</small>
                </>
              ) : (
                <>— <small>kg</small></>
              )}
            </div>
          )}
          <div className="twin-sub">{targetSub}</div>
        </div>
        {isEditing ? (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ink"
              size="sm"
              className="h-7 w-7 rounded-[8px] p-0"
              onClick={submit}
              disabled={isSaving || disabled}
              aria-label="保存"
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={cancelEdit}
              disabled={isSaving || disabled}
              aria-label="取消"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <Edit3 className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/60" aria-hidden="true" />
        )}
      </div>
    )
  }

  return (
    <Card className="rounded-2xl border-border">
      <CardContent className="flex items-center gap-2.5 p-5 sm720:p-7">
        <Tile variant="weight" size={36}>
          <Clock3 />
        </Tile>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-muted-foreground">今日体重</div>
          {isEditing ? (
            <div className="mt-1 text-2xl font-bold leading-none tabular-nums">
              <input
                ref={inputRef}
                type="number"
                inputMode="decimal"
                step="0.1"
                value={inputValue}
                disabled={disabled}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit()
                  if (e.key === "Escape") cancelEdit()
                }}
                className="w-[5ch] border-x-0 border-t-0 border-b border-transparent bg-transparent p-0 text-2xl font-bold leading-none tabular-nums outline-none placeholder:text-muted-foreground/40 focus:border-foreground/40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                placeholder="—"
              />
              <small className="ml-1 text-xs font-medium text-muted-foreground">kg</small>
            </div>
          ) : (
            <div className="mt-1 text-2xl font-bold tabular-nums leading-none">
              {todayWeight !== undefined ? (
                <>
                  {todayWeight.toFixed(1)}
                  <small className="ml-1 text-xs font-medium text-muted-foreground">kg</small>
                </>
              ) : (
                <span className="text-muted-foreground">— <small className="text-xs font-medium">kg</small></span>
              )}
            </div>
          )}
          <div className={`mt-1 text-xs ${deltaClass}`}>{renderDelta()}</div>
        </div>
        {isEditing ? (
          <div className="flex items-center gap-1">
            <Button
              variant="ink"
              size="sm"
              className="h-8 w-8 rounded-[10px] p-0"
              onClick={submit}
              disabled={isSaving || disabled}
              aria-label="保存"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={cancelEdit}
              disabled={isSaving || disabled}
              aria-label="取消"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={enterEdit}
            disabled={disabled}
          >
            <Edit3 className="mr-1 h-3.5 w-3.5" />
            修改
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
