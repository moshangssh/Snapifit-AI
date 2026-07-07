"use client"

import { useCallback, useEffect, useState } from "react"
import { applyDailyLogWrite, type DailyLogWrite } from "@/lib/apply-daily-log-write"
import type { DailyLog, UserProfile } from "@/lib/types"

// 旧版独立 TEF AI 分析的 localStorage 缓存键,随 ADR 0015 移除,读到即一次性清理。
const LEGACY_TEF_CACHE_KEY = "tef-analysis-cache"

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
  /**
   * 表达一次用户写入意图:核心 → setState → 存库 → 刷新日历。返回写好的 log。
   * 日志尚未加载完毕时拒绝写入并返回 null,防止空骨架覆盖当天已持久化数据(issue #98)。
   */
  commit: (write: DailyLogWrite) => DailyLog | null
}

/**
 * DailyLog 写入的薄 hook:把纯核心 `applyDailyLogWrite` 接到 React 状态、存库与
 * 日历刷新上。页面只表达用户意图(`commit(write)`)或读 `log`,
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
    getDailyLog,
    saveDailyLog,
    dbInitializing,
    refreshRecords,
  } = params

  const [log, setLog] = useState<DailyLog>(() => emptyDailyLog(date))
  const [isLogLoaded, setIsLogLoaded] = useState(false)

  // 代谢提示改为展示时本地派生(ADR 0015),旧的 TEF 分析缓存一次性清理、不再写入。
  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_TEF_CACHE_KEY)
    } catch {
      // localStorage 不可用(SSR/隐私模式)时静默跳过
    }
  }, [])

  // 日期变化或数据库就绪时,加载当天 DailyLog。加载完成前不被空骨架覆盖;
  // cleanup 置 ignore,防止切日期后旧请求乱序 resolve 时污染新日期状态并误开 commit 守卫。
  useEffect(() => {
    if (dbInitializing) return
    setIsLogLoaded(false)
    let ignore = false
    Promise.resolve(getDailyLog(date)).then((data) => {
      if (ignore) return
      setLog(data ?? emptyDailyLog(date))
      setIsLogLoaded(true)
    })
    return () => {
      ignore = true
    }
  }, [date, getDailyLog, dbInitializing])

  // 一次用户写入:核心 → setState → 无条件存库 → 刷新日历日期。
  // 加载完成前 log 还是空骨架,此时写入会整体覆盖当天已持久化数据,直接拒绝。
  const commit = useCallback(
    (write: DailyLogWrite): DailyLog | null => {
      if (!isLogLoaded) {
        console.warn(`[useDailyLogWriter] ${date} 的日志尚未加载完毕,本次写入被拒绝:`, write.kind)
        return null
      }
      const next = applyDailyLogWrite(log, write, { userProfile })
      setLog(next)
      void Promise.resolve(saveDailyLog(next.date, next))
      void Promise.resolve(refreshRecords())
      return next
    },
    [isLogLoaded, date, log, userProfile, saveDailyLog, refreshRecords],
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

  return { log, isLogLoaded, commit }
}
