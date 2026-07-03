"use client"

import { useState, useEffect, useCallback } from "react"
import { format } from "date-fns"
import { HEALTH_DB_STORES, openHealthDatabase } from "@/lib/indexed-db"
import { hasUserRecordedData } from "@/lib/daily-log-record"

interface DateRecordsHook {
  hasRecord: (date: Date) => boolean
  isLoading: boolean
  refreshRecords: () => Promise<void>
}

export function useDateRecords(): DateRecordsHook {
  const [recordedDates, setRecordedDates] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)

  // 检查某个日期是否有记录
  const hasRecord = useCallback((date: Date): boolean => {
    const dateKey = format(date, "yyyy-MM-dd")
    return recordedDates.has(dateKey)
  }, [recordedDates])

  // 从IndexedDB加载所有有记录的日期
  const loadRecordedDates = useCallback(async () => {
    setIsLoading(true)
    let db: IDBDatabase | null = null
    try {
      db = await openHealthDatabase()
      const transaction = db.transaction(
        [HEALTH_DB_STORES.healthLogs],
        "readonly",
      )
      const objectStore = transaction.objectStore(HEALTH_DB_STORES.healthLogs)
      const getAllRequest = objectStore.getAll()

      await new Promise<void>((resolve) => {
        getAllRequest.onsuccess = () => {
          const allLogs = getAllRequest.result
          const dates = new Set<string>()

          if (allLogs && allLogs.length > 0) {
            allLogs.forEach((log) => {
              // 只有用户真正记录过内容才算"有记录";派生的基础消耗盖章
              // (calculatedBMR 等)在浏览空日时也会写入,不能算作记录。
              if (hasUserRecordedData(log)) {
                dates.add(log.date)
              }
            })
          }

          setRecordedDates(dates)
          resolve()
        }

        getAllRequest.onerror = () => {
          console.error("Failed to load recorded dates")
          resolve()
        }
      })
    } catch (error) {
      console.error("Error loading recorded dates:", error)
    } finally {
      db?.close()
      setIsLoading(false)
    }
  }, [])

  // 刷新记录状态
  const refreshRecords = useCallback(async () => {
    await loadRecordedDates()
  }, [loadRecordedDates])

  // 初始化时加载数据
  useEffect(() => {
    loadRecordedDates()
  }, [loadRecordedDates])

  return { hasRecord, isLoading, refreshRecords }
}
