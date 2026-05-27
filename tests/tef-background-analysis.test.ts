import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  cancelAllPendingTEFAnalyses,
  scheduleTEFAnalysisForLog,
  TEF_ANALYSIS_DELAY_MS,
} from "@/lib/tef-background-analysis"
import { tefCacheManager } from "@/lib/tef-cache"
import type { AIConfig, DailyLog } from "@/lib/types"

const configuredAI: AIConfig = {
  agentModel: {
    name: "gpt-4o",
    baseUrl: "https://api.openai.com",
    apiKey: "sk-agent",
  },
  chatModel: {
    name: "gpt-4o",
    baseUrl: "https://api.openai.com",
    apiKey: "",
  },
  visionModel: {
    name: "gpt-4o",
    baseUrl: "https://api.openai.com",
    apiKey: "",
  },
}

const createDailyLog = (foodName = "冰美式咖啡"): DailyLog => ({
  date: "2026-05-22",
  foodEntries: [
    {
      log_id: "food-1",
      food_name: foodName,
      consumed_grams: 300,
      meal_type: "breakfast",
      nutritional_info_per_100g: {
        calories: 2,
        carbohydrates: 0,
        protein: 0,
        fat: 0,
      },
      total_nutritional_info_consumed: {
        calories: 6,
        carbohydrates: 0,
        protein: 0,
        fat: 0,
      },
      is_estimated: true,
      timestamp: "2026-05-22T08:00:00.000Z",
    },
  ],
  exerciseEntries: [],
  summary: {
    totalCaloriesConsumed: 6,
    totalCaloriesBurned: 0,
    macros: {
      carbs: 0,
      protein: 0,
      fat: 0,
    },
    micronutrients: {},
  },
})

describe("TEF background analysis scheduler", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    tefCacheManager.clearCache()
  })

  afterEach(() => {
    cancelAllPendingTEFAnalyses()
    tefCacheManager.clearCache()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it("runs TEF analysis 15 seconds after a food log is saved outside the dashboard", async () => {
    const log = createDailyLog()
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        enhancementMultiplier: 1.05,
        enhancementFactors: ["AI 识别因素"],
        analysisTimestamp: "2026-05-22T08:00:15.000Z",
      }),
    })) as unknown as typeof fetch
    const saveDailyLog = vi.fn<(date: string, log: DailyLog) => Promise<void>>(async () => {})
    const getDailyLog = vi.fn<(date: string) => Promise<DailyLog>>(async () => log)

    const result = scheduleTEFAnalysisForLog({
      log,
      aiConfig: configuredAI,
      saveDailyLog,
      getDailyLog,
      fetchImpl,
    })

    expect(result.status).toBe("scheduled")
    expect(fetchImpl).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(TEF_ANALYSIS_DELAY_MS - 1)
    expect(fetchImpl).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(fetchImpl).toHaveBeenCalledWith("/api/ai/tef-analysis", expect.any(Object))
    expect(saveDailyLog).toHaveBeenCalledTimes(1)

    const [savedDate, savedLog] = saveDailyLog.mock.calls[0]
    expect(savedDate).toBe(log.date)
    expect(savedLog.tefAnalysis?.enhancementMultiplier).toBe(1.1)
    expect(savedLog.tefAnalysis?.enhancementFactors).toContain("AI 识别因素")
    expect(savedLog.tefAnalysis?.enhancementFactors).toContain("咖啡因")
  })

  it("does not run a stale scheduled analysis when the food log changed before the timer fires", async () => {
    const originalLog = createDailyLog()
    const changedLog = createDailyLog("米饭")
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        enhancementMultiplier: 1,
        enhancementFactors: [],
        analysisTimestamp: "2026-05-22T08:00:15.000Z",
      }),
    })) as unknown as typeof fetch
    const saveDailyLog = vi.fn<(date: string, log: DailyLog) => Promise<void>>(async () => {})
    const getDailyLog = vi.fn<(date: string) => Promise<DailyLog>>(async () => changedLog)

    scheduleTEFAnalysisForLog({
      log: originalLog,
      aiConfig: configuredAI,
      saveDailyLog,
      getDailyLog,
      fetchImpl,
    })

    await vi.advanceTimersByTimeAsync(TEF_ANALYSIS_DELAY_MS)

    expect(fetchImpl).not.toHaveBeenCalled()
    expect(saveDailyLog).not.toHaveBeenCalled()
  })

  it("preserves an existing TEF analysis when AI is unavailable but food entries still exist", () => {
    const log: DailyLog = {
      ...createDailyLog("米饭"),
      tefAnalysis: {
        baseTEF: 20,
        baseTEFPercentage: 10,
        enhancementMultiplier: 1.2,
        enhancedTEF: 24,
        enhancementFactors: ["旧因素"],
        analysisTimestamp: "2026-05-21T08:00:00.000Z",
      },
    }
    const saveDailyLog = vi.fn<(date: string, log: DailyLog) => Promise<void>>(async () => {})
    const onLogUpdated = vi.fn()
    const onCountdownChange = vi.fn()

    const result = scheduleTEFAnalysisForLog({
      log,
      aiConfig: {
        ...configuredAI,
        agentModel: { ...configuredAI.agentModel, apiKey: "" },
      },
      saveDailyLog,
      onLogUpdated,
      onCountdownChange,
      fetchImpl: vi.fn() as unknown as typeof fetch,
    })

    expect(result.status).toBe("skipped")
    expect(saveDailyLog).not.toHaveBeenCalled()
    expect(onLogUpdated).not.toHaveBeenCalled()
    expect(onCountdownChange).toHaveBeenCalledWith(0)
  })

  it("still clears TEF analysis when the food entries list becomes empty", async () => {
    const emptyLog: DailyLog = {
      date: "2026-05-22",
      foodEntries: [],
      exerciseEntries: [],
      summary: {
        totalCaloriesConsumed: 0,
        totalCaloriesBurned: 0,
        macros: { carbs: 0, protein: 0, fat: 0 },
        micronutrients: {},
      },
      tefAnalysis: {
        baseTEF: 20,
        baseTEFPercentage: 10,
        enhancementMultiplier: 1.2,
        enhancedTEF: 24,
        enhancementFactors: ["旧因素"],
        analysisTimestamp: "2026-05-21T08:00:00.000Z",
      },
    }
    const saveDailyLog = vi.fn<(date: string, log: DailyLog) => Promise<void>>(async () => {})
    const onLogUpdated = vi.fn()

    const result = scheduleTEFAnalysisForLog({
      log: emptyLog,
      aiConfig: configuredAI,
      saveDailyLog,
      onLogUpdated,
      fetchImpl: vi.fn() as unknown as typeof fetch,
    })

    expect(result.status).toBe("empty")
    expect(saveDailyLog).toHaveBeenCalledTimes(1)
    expect(saveDailyLog.mock.calls[0][1].tefAnalysis).toBeUndefined()
    expect(onLogUpdated).toHaveBeenCalledWith(expect.objectContaining({ tefAnalysis: undefined }))
  })

  it("does not reuse cached analysis when meal timing changed", () => {
    const morningLog = createDailyLog("冰美式咖啡")
    const afternoonLog: DailyLog = {
      ...morningLog,
      foodEntries: morningLog.foodEntries.map((entry) => ({
        ...entry,
        time_period: "afternoon",
        timestamp: "2026-05-22T15:00:00.000Z",
      })),
    }

    tefCacheManager.setCachedAnalysis(morningLog.foodEntries, {
      baseTEF: 10,
      baseTEFPercentage: 8,
      enhancementMultiplier: 1.1,
      enhancedTEF: 11,
      enhancementFactors: ["咖啡因"],
      analysisTimestamp: "2026-05-22T08:00:15.000Z",
    })

    expect(tefCacheManager.getCachedAnalysis(afternoonLog.foodEntries)).toBeNull()
  })

  it("corrects cached TEF factors even when the cached multiplier is already high enough", () => {
    const log = createDailyLog("麻辣小龙虾")
    log.foodEntries.push({
      ...log.foodEntries[0],
      log_id: "food-2",
      food_name: "可乐",
    })
    tefCacheManager.setCachedAnalysis(log.foodEntries, {
      baseTEF: 10,
      baseTEFPercentage: 8,
      enhancementMultiplier: 1.19,
      enhancedTEF: 11.9,
      enhancementFactors: ["咖啡因"],
      analysisTimestamp: "2026-05-22T08:00:15.000Z",
    })

    const saveDailyLog = vi.fn<(date: string, log: DailyLog) => Promise<void>>(async () => {})
    const fetchImpl = vi.fn() as unknown as typeof fetch

    const result = scheduleTEFAnalysisForLog({
      log,
      aiConfig: configuredAI,
      saveDailyLog,
      fetchImpl,
    })

    expect(result.status).toBe("cached")
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(saveDailyLog.mock.calls[0][1].tefAnalysis?.enhancementFactors).toEqual(
      expect.arrayContaining(["咖啡因", "辛辣食物"])
    )
  })

  it("applies the save transform before persisting a completed analysis", async () => {
    const log = createDailyLog("辣椒炒饭")
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        enhancementMultiplier: 1.05,
        enhancementFactors: ["AI 识别因素"],
        analysisTimestamp: "2026-05-22T08:00:15.000Z",
      }),
    })) as unknown as typeof fetch
    const saveDailyLog = vi.fn<(date: string, log: DailyLog) => Promise<void>>(async () => {})
    const getDailyLog = vi.fn<(date: string) => Promise<DailyLog>>(async () => log)

    scheduleTEFAnalysisForLog({
      log,
      aiConfig: configuredAI,
      saveDailyLog,
      getDailyLog,
      fetchImpl,
      prepareLogForSave: (updatedLog) => ({
        ...updatedLog,
        calculatedBMR: 1600,
        baselineExpenditure: 2000,
      }),
    })

    await vi.advanceTimersByTimeAsync(TEF_ANALYSIS_DELAY_MS)

    expect(saveDailyLog).toHaveBeenCalledTimes(1)
    expect(saveDailyLog.mock.calls[0][1].tefAnalysis).toBeDefined()
    expect(saveDailyLog.mock.calls[0][1].calculatedBMR).toBe(1600)
    expect(saveDailyLog.mock.calls[0][1].baselineExpenditure).toBe(2000)
  })

  it("does not invoke the earlier listener after its unsubscribe was called", async () => {
    const log = createDailyLog()
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        enhancementMultiplier: 1.05,
        enhancementFactors: [],
        analysisTimestamp: "2026-05-22T08:00:15.000Z",
      }),
    })) as unknown as typeof fetch
    const saveDailyLog = vi.fn<(date: string, log: DailyLog) => Promise<void>>(async () => {})
    const getDailyLog = vi.fn<(date: string) => Promise<DailyLog>>(async () => log)
    const firstListener = vi.fn()
    const secondListener = vi.fn()

    const first = scheduleTEFAnalysisForLog({
      log,
      aiConfig: configuredAI,
      saveDailyLog,
      getDailyLog,
      fetchImpl,
      onLogUpdated: firstListener,
    })

    const second = scheduleTEFAnalysisForLog({
      log,
      aiConfig: configuredAI,
      saveDailyLog,
      getDailyLog,
      fetchImpl,
      onLogUpdated: secondListener,
    })

    // 模拟 workbench 在第二次 schedule 前先 cleanup 第一次的 listener
    first.unsubscribe()

    await vi.advanceTimersByTimeAsync(TEF_ANALYSIS_DELAY_MS)

    expect(firstListener).not.toHaveBeenCalled()
    expect(secondListener).toHaveBeenCalledTimes(1)

    // 释放第二个引用避免 afterEach 残留
    second.unsubscribe()
  })
})
