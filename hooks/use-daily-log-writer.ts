"use client"

import { useCallback, useEffect, useState } from "react"
import { applyDailyLogWrite, type DailyLogWrite } from "@/lib/apply-daily-log-write"
import { scheduleTEFAnalysisForLog } from "@/lib/tef-background-analysis"
import type { AIConfig, DailyLog, UserProfile } from "@/lib/types"

function emptyDailyLog(date: string): DailyLog {
  return {
    date,
    foodEntries: [],
    exerciseEntries: [],
    summary: {
      totalCaloriesConsumed: 0,
      totalCaloriesBurned: 0,
      macros: { carbs: 0, protein: 0, fat: 0 },
      micronutrients: {},
    },
    weight: undefined,
    calculatedBMR: undefined,
    baselineExpenditure: undefined,
  }
}

export interface UseDailyLogWriterParams {
  /** 目标日期 (yyyy-MM-dd)。 */
  date: string
  userProfile: UserProfile
  isUserProfileHydrated: boolean
  aiConfig: AIConfig
  isAIConfigHydrated: boolean
  getDailyLog: (key: string) => Promise<DailyLog | null | undefined>
  saveDailyLog: (key: string, log: DailyLog) => Promise<void> | void
  dbInitializing: boolean
  refreshRecords: () => void | Promise<void>
}

export interface UseDailyLogWriterResult {
  /** 当天 DailyLog 状态,始终经纯核心盖章摘要与基础消耗。 */
  log: DailyLog
  /** 数据是否已从库加载完毕(用于门控依赖存库的派生 effect)。 */
  isLogLoaded: boolean
  /** 表达一次用户写入意图:核心 → setState → 存库 → 刷新日历。返回写好的 log。 */
  commit: (write: DailyLogWrite) => DailyLog
  /** TEF 分析倒计时(秒),供 UI 展示。 */
  tefAnalysisCountdown: number
}

/**
 * DailyLog 写入的薄 hook:把纯核心 `applyDailyLogWrite` 接到 React 状态、存库、
 * 日历刷新与 TEF 调度上。页面只表达用户意图(`commit(write)`)或读 `log`,
 * 写入顺序与副作用不再泄漏进 UI 组件。承接 ADR-0014。
 *
 * 边界:模块只写 DailyLog 这一个聚合。跨聚合(个人档案默认体重同步)与纯 UI
 * (图表刷新信号)的副作用留在页面回调,不进 hook。
 */
export function useDailyLogWriter(params: UseDailyLogWriterParams): UseDailyLogWriterResult {
  const {
    date,
    userProfile,
    isUserProfileHydrated,
    aiConfig,
    isAIConfigHydrated,
    getDailyLog,
    saveDailyLog,
    dbInitializing,
    refreshRecords,
  } = params

  const [log, setLog] = useState<DailyLog>(() => emptyDailyLog(date))
  const [isLogLoaded, setIsLogLoaded] = useState(false)
  const [tefAnalysisCountdown, setTEFAnalysisCountdown] = useState(0)

  // 日期变化或数据库就绪时,加载当天 DailyLog。加载完成前不被空骨架覆盖。
  useEffect(() => {
    if (dbInitializing) return
    setIsLogLoaded(false)
    Promise.resolve(getDailyLog(date)).then((data) => {
      setLog(data ?? emptyDailyLog(date))
      setIsLogLoaded(true)
    })
  }, [date, getDailyLog, dbInitializing])

  // 一次用户写入:核心 → setState → 无条件存库 → 刷新日历日期。
  const commit = useCallback(
    (write: DailyLogWrite): DailyLog => {
      const next = applyDailyLogWrite(log, write, { userProfile })
      setLog(next)
      void Promise.resolve(saveDailyLog(next.date, next))
      void Promise.resolve(refreshRecords())
      return next
    },
    [log, userProfile, saveDailyLog, refreshRecords],
  )

  // 基础消耗对账:日志加载或个人档案变更时跑一次 reconcile,
  // 若与持久值有 diff 则存库(取代首页原独立 BMR effect)。同 profile 的旧日无 diff、不产生多余写。
  useEffect(() => {
    if (!isLogLoaded || !isUserProfileHydrated) return
    const reconciled = applyDailyLogWrite(log, { kind: "reconcile" }, { userProfile })
    if (JSON.stringify(reconciled) === JSON.stringify(log)) return
    setLog(reconciled)
    void Promise.resolve(saveDailyLog(reconciled.date, reconciled))
  }, [isLogLoaded, isUserProfileHydrated, userProfile, log, saveDailyLog])

  // 食物条目变化时,调度共享后台 TEF 分析。以 effect 返回的 unsubscribe 交 React 清理,
  // 不再手维护 ref;prepareLogForSave 走核心 reconcile,使异步回写的日志同样盖章基础消耗。
  useEffect(() => {
    if (!isLogLoaded || !isUserProfileHydrated || !isAIConfigHydrated) return

    const scheduleResult = scheduleTEFAnalysisForLog({
      log,
      aiConfig,
      saveDailyLog,
      getDailyLog,
      prepareLogForSave: (candidate) =>
        applyDailyLogWrite(candidate, { kind: "reconcile" }, { userProfile }),
      onCountdownChange: setTEFAnalysisCountdown,
      onLogUpdated: (updatedLog) => {
        // 异步回写按日期守卫:切日期后旧回写不污染当前查看那天。
        setLog((currentLog) => (currentLog.date === updatedLog.date ? updatedLog : currentLog))
      },
    })

    return scheduleResult.unsubscribe
  }, [
    isLogLoaded,
    isUserProfileHydrated,
    isAIConfigHydrated,
    log.date,
    log.foodEntries,
    log.tefAnalysis,
    aiConfig,
    saveDailyLog,
    getDailyLog,
    userProfile,
  ])

  return { log, isLogLoaded, commit, tefAnalysisCountdown }
}
