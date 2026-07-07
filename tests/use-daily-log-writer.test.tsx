// @vitest-environment happy-dom
import { act } from "react"
import { createRoot } from "react-dom/client"
import { describe, expect, it, vi } from "vitest"
import { useDailyLogWriter, type UseDailyLogWriterParams, type UseDailyLogWriterResult } from "@/hooks/use-daily-log-writer"
import type { DailyLogWrite } from "@/lib/apply-daily-log-write"
import type { DailyLog, FoodEntry, UserProfile } from "@/lib/types"

// Behavior tests at the hook's public interface (issue #98): commit must not
// persist anything while the day's log is still loading, otherwise the empty
// skeleton overwrites persisted entries. The pure write logic itself is covered
// by tests/apply-daily-log-write.test.ts; here we only exercise load-ordering.

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const userProfile: UserProfile = {
  weight: 70,
  height: 170,
  age: 30,
  gender: "male",
  activityLevel: "moderate",
  goal: "maintain",
  bmrFormula: "mifflin-st-jeor",
}

function foodEntry(overrides: Partial<FoodEntry> = {}): FoodEntry {
  return {
    log_id: "food-1",
    food_name: "鸡胸肉",
    consumed_grams: 100,
    meal_type: "lunch",
    nutritional_info_per_100g: {
      calories: 165,
      carbohydrates: 0,
      protein: 31,
      fat: 3.6,
    },
    total_nutritional_info_consumed: {
      calories: 165,
      carbohydrates: 0,
      protein: 31,
      fat: 3.6,
    },
    is_estimated: true,
    ...overrides,
  }
}

function persistedLog(overrides: Partial<DailyLog> = {}): DailyLog {
  return {
    date: "2026-05-22",
    foodEntries: [foodEntry()],
    exerciseEntries: [],
    summary: {
      totalCaloriesConsumed: 165,
      totalCaloriesBurned: 0,
      macros: { carbs: 0, protein: 31, fat: 3.6 },
      micronutrients: {},
    },
    ...overrides,
  }
}

function baseParams(overrides: Partial<UseDailyLogWriterParams> = {}): UseDailyLogWriterParams {
  return {
    date: "2026-05-22",
    userProfile,
    isUserProfileHydrated: false,
    getDailyLog: vi.fn(async () => null),
    saveDailyLog: vi.fn(),
    dbInitializing: false,
    refreshRecords: vi.fn(),
    ...overrides,
  }
}

function renderWriter(initialParams: UseDailyLogWriterParams) {
  const result = { current: null as unknown as UseDailyLogWriterResult }
  function Probe(props: { params: UseDailyLogWriterParams }) {
    result.current = useDailyLogWriter(props.params)
    return null
  }
  const container = document.createElement("div")
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(<Probe params={initialParams} />))
  // commit 触发 setState,必须包在 act 里;经由带返回类型标注的 helper 取值,
  // 绕开 TS 对闭包内赋值变量的 narrowing(直接读会被推成 null)。
  const commit: (write: DailyLogWrite) => DailyLog | null = (write) => {
    let value: DailyLog | null = null
    act(() => {
      value = result.current.commit(write)
    })
    return value
  }
  return {
    result,
    commit,
    rerender: (params: UseDailyLogWriterParams) => act(() => root.render(<Probe params={params} />)),
    unmount: () => act(() => root.unmount()),
  }
}

describe("useDailyLogWriter commit load guard", () => {
  it("rejects commit while the log is loading so persisted entries survive", async () => {
    let resolveLoad!: (log: DailyLog) => void
    const getDailyLog = vi.fn(() => new Promise<DailyLog>((resolve) => { resolveLoad = resolve }))
    const saveDailyLog = vi.fn()
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})

    const { result, commit, unmount } = renderWriter(baseParams({ getDailyLog, saveDailyLog }))
    expect(result.current.isLogLoaded).toBe(false)

    const committed = commit({ kind: "setWeight", weight: 71 })

    expect(committed).toBeNull()
    expect(saveDailyLog).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledOnce()

    await act(async () => {
      resolveLoad(persistedLog())
    })

    expect(result.current.isLogLoaded).toBe(true)
    expect(result.current.log.foodEntries).toHaveLength(1)

    warn.mockRestore()
    unmount()
  })

  it("commits on top of the loaded log once loading finishes", async () => {
    const persisted = persistedLog()
    const getDailyLog = vi.fn(async () => persisted)
    const saveDailyLog = vi.fn()
    const refreshRecords = vi.fn()

    const { result, commit, unmount } = renderWriter(baseParams({ getDailyLog, saveDailyLog, refreshRecords }))
    await act(async () => {})
    expect(result.current.isLogLoaded).toBe(true)

    const committed = commit({ kind: "setWeight", weight: 71 })

    expect(committed?.weight).toBe(71)
    expect(committed?.foodEntries).toHaveLength(1)
    expect(saveDailyLog).toHaveBeenCalledWith("2026-05-22", committed)
    expect(refreshRecords).toHaveBeenCalled()
    expect(result.current.log.weight).toBe(71)

    unmount()
  })

  it("ignores a stale load that resolves after switching date, keeping the guard closed", async () => {
    let resolveDayA!: (log: DailyLog) => void
    let resolveDayB!: (log: DailyLog) => void
    const getDailyLog = vi.fn((key: string) => {
      if (key === "2026-05-22") return new Promise<DailyLog>((resolve) => { resolveDayA = resolve })
      return new Promise<DailyLog>((resolve) => { resolveDayB = resolve })
    })
    const saveDailyLog = vi.fn()
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const params = baseParams({ getDailyLog, saveDailyLog })

    const { result, commit, rerender, unmount } = renderWriter(params)
    rerender({ ...params, date: "2026-05-23" })

    // 旧日期的加载在切换之后才完成:必须被忽略,否则守卫会带着旧日期数据误开,
    // 此时 commit 会把对新日期的写入落到旧日期上。
    await act(async () => {
      resolveDayA(persistedLog())
    })
    expect(result.current.isLogLoaded).toBe(false)

    const committed = commit({ kind: "setWeight", weight: 71 })

    expect(committed).toBeNull()
    expect(saveDailyLog).not.toHaveBeenCalled()

    await act(async () => {
      resolveDayB(persistedLog({ date: "2026-05-23" }))
    })
    expect(result.current.isLogLoaded).toBe(true)
    expect(result.current.log.date).toBe("2026-05-23")
    expect(result.current.log.foodEntries).toHaveLength(1)

    warn.mockRestore()
    unmount()
  })

  it("rejects commit during the reload window after switching date", async () => {
    let resolveNextDay!: (log: DailyLog) => void
    const getDailyLog = vi.fn((key: string) => {
      if (key === "2026-05-22") return Promise.resolve(persistedLog())
      return new Promise<DailyLog>((resolve) => { resolveNextDay = resolve })
    })
    const saveDailyLog = vi.fn()
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const params = baseParams({ getDailyLog, saveDailyLog })

    const { result, commit, rerender, unmount } = renderWriter(params)
    await act(async () => {})
    expect(result.current.isLogLoaded).toBe(true)

    rerender({ ...params, date: "2026-05-23" })
    expect(result.current.isLogLoaded).toBe(false)

    const committed = commit({ kind: "setWeight", weight: 71 })

    expect(committed).toBeNull()
    expect(saveDailyLog).not.toHaveBeenCalled()

    await act(async () => {
      resolveNextDay(persistedLog({ date: "2026-05-23" }))
    })
    expect(result.current.isLogLoaded).toBe(true)
    expect(result.current.log.date).toBe("2026-05-23")
    expect(result.current.log.foodEntries).toHaveLength(1)

    warn.mockRestore()
    unmount()
  })
})

describe("useDailyLogWriter metabolic hint local derivation (issue #128)", () => {
  it("cleans up the legacy tef-analysis-cache key and never issues a TEF analysis request", async () => {
    localStorage.setItem("tef-analysis-cache", "{}")
    const fetchSpy = vi.fn(async () => new Response("{}"))
    vi.stubGlobal("fetch", fetchSpy)

    const getDailyLog = vi.fn(async () => persistedLog())
    const saveDailyLog = vi.fn()

    const { result, unmount } = renderWriter(
      baseParams({
        getDailyLog,
        saveDailyLog,
        isUserProfileHydrated: true,
      }),
    )
    await act(async () => {})
    expect(result.current.isLogLoaded).toBe(true)

    expect(localStorage.getItem("tef-analysis-cache")).toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(result.current).not.toHaveProperty("tefAnalysisCountdown")

    vi.unstubAllGlobals()
    unmount()
  })
})
