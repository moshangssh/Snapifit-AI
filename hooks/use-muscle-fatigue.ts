"use client"

import { useEffect, useState } from "react"
import { format, subDays } from "date-fns"
import { useIndexedDB } from "@/hooks/use-indexed-db"
import {
  computeMuscleFatigue,
  type MuscleFatigueMap,
} from "@/lib/muscle-fatigue"
import type { DailyLog } from "@/lib/types"

export function useMuscleFatigue(selectedDate: Date, refreshTrigger = 0) {
  const { getData, isInitializing } = useIndexedDB("healthLogs")
  const [byMuscle, setByMuscle] = useState<MuscleFatigueMap>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (isInitializing) return
    let cancelled = false
    setIsLoading(true)

    const keys = [0, 1, 2].map((n) =>
      format(subDays(selectedDate, n), "yyyy-MM-dd"),
    )

    Promise.all(keys.map((k) => getData(k) as Promise<DailyLog | null>))
      .then((logs) => {
        if (cancelled) return
        setByMuscle(computeMuscleFatigue(logs))
        setIsLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setByMuscle({})
        setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedDate, refreshTrigger, isInitializing, getData])

  return {
    byMuscle,
    isLoading,
    hasAnyRecord: Object.keys(byMuscle).length > 0,
  }
}
