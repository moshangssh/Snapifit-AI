import type { AIConfig, DailyLog, FoodEntry, TEFAnalysis } from "./types"
import { postAI } from "./ai/client-fetch"
import { tefCacheManager } from "./tef-cache"
import { generateTEFAnalysis, identifyTEFEnhancers } from "./tef-utils"

export const TEF_ANALYSIS_DELAY_MS = 15_000

type SaveDailyLog = (date: string, log: DailyLog) => Promise<void> | void
type GetDailyLog = (date: string) => Promise<DailyLog | null | undefined>
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>
type TimerHandle = ReturnType<typeof setTimeout>
type IntervalHandle = ReturnType<typeof setInterval>
type PrepareLogForSave = (log: DailyLog) => DailyLog

type TEFAIResult = { enhancementMultiplier?: number; enhancementFactors?: string[]; analysisTimestamp?: string }
type TEFListener = { onCountdownChange?: (seconds: number) => void; onLogUpdated?: (log: DailyLog) => void }

type PendingJob = {
  date: string
  hash: string
  log: DailyLog
  aiConfig: AIConfig
  saveDailyLog: SaveDailyLog
  getDailyLog?: GetDailyLog
  fetchImpl: FetchLike
  prepareLogForSave?: PrepareLogForSave
  timeoutId: TimerHandle
  intervalId: IntervalHandle
  dueAt: number
  listeners: Set<TEFListener>
}

export type TEFScheduleResult = {
  status: "empty" | "cached" | "scheduled" | "skipped"
  unsubscribe: () => void
}

type ScheduleTEFAnalysisOptions = TEFListener & {
  log: DailyLog
  aiConfig: AIConfig
  saveDailyLog: SaveDailyLog
  getDailyLog?: GetDailyLog
  fetchImpl?: FetchLike
  delayMs?: number
  prepareLogForSave?: PrepareLogForSave
}

const pendingJobs = new Map<string, PendingJob>()
const noop = () => {}

export function scheduleTEFAnalysisForLog(options: ScheduleTEFAnalysisOptions): TEFScheduleResult {
  const listener: TEFListener = {
    onCountdownChange: options.onCountdownChange,
    onLogUpdated: options.onLogUpdated,
  }

  if (options.log.foodEntries.length === 0) {
    cancelPendingTEFAnalysis(options.log.date)
    clearTEFAnalysis(options, listener)
    return { status: "empty", unsubscribe: noop }
  }

  const cachedAnalysis = getCachedOrCorrectedTEFAnalysis(options.log.foodEntries)
  if (cachedAnalysis) {
    cancelPendingTEFAnalysis(options.log.date)
    persistAnalysisIfChanged(options.log, cachedAnalysis, options, listener)
    return { status: "cached", unsubscribe: noop }
  }

  if (!isTEFAIConfigComplete(options.aiConfig) || !getFetchImpl(options.fetchImpl)) {
    cancelPendingTEFAnalysis(options.log.date)
    // AI 不可用时不能擦掉之前已经算好的 tefAnalysis:
    // 用户可能临时清空 apiKey 或网络中断,旧数值依然有参考价值。
    // 仅通知倒计时归零,不写入 saveDailyLog。
    listener.onCountdownChange?.(0)
    return { status: "skipped", unsubscribe: noop }
  }

  clearTEFAnalysis(options, listener)
  return schedulePendingAnalysis(options, listener)
}

export function cancelPendingTEFAnalysis(date: string): void {
  const job = pendingJobs.get(date)
  if (!job) return

  clearTimeout(job.timeoutId)
  clearInterval(job.intervalId)
  notifyCountdown(job.listeners, 0)
  pendingJobs.delete(date)
}

export function cancelAllPendingTEFAnalyses(): void {
  Array.from(pendingJobs.keys()).forEach(cancelPendingTEFAnalysis)
}

export function isTEFAIConfigComplete(aiConfig: AIConfig): boolean {
  const modelConfig = aiConfig.agentModel
  return Boolean(modelConfig.name && modelConfig.baseUrl && modelConfig.apiKey)
}

function schedulePendingAnalysis(
  options: ScheduleTEFAnalysisOptions,
  listener: TEFListener
): TEFScheduleResult {
  const hash = tefCacheManager.generateFoodEntriesHash(options.log.foodEntries)
  const existingJob = pendingJobs.get(options.log.date)

  if (existingJob?.hash === hash) {
    existingJob.prepareLogForSave = options.prepareLogForSave ?? existingJob.prepareLogForSave
    existingJob.listeners.add(listener)
    listener.onCountdownChange?.(getRemainingSeconds(existingJob))
    return { status: "scheduled", unsubscribe: () => existingJob.listeners.delete(listener) }
  }

  cancelPendingTEFAnalysis(options.log.date)
  const delayMs = options.delayMs ?? TEF_ANALYSIS_DELAY_MS
  const listeners = new Set<TEFListener>([listener])
  const job = createPendingJob(options, hash, listeners, delayMs)

  pendingJobs.set(options.log.date, job)
  notifyCountdown(listeners, Math.ceil(delayMs / 1000))
  return { status: "scheduled", unsubscribe: () => job.listeners.delete(listener) }
}

function createPendingJob(
  options: ScheduleTEFAnalysisOptions,
  hash: string,
  listeners: Set<TEFListener>,
  delayMs: number
): PendingJob {
  const fetchImpl = getFetchImpl(options.fetchImpl)
  if (!fetchImpl) {
    throw new Error("fetch is not available for TEF analysis")
  }

  const intervalId = setInterval(() => {
    const job = pendingJobs.get(options.log.date)
    if (!job) return
    notifyCountdown(job.listeners, getRemainingSeconds(job))
  }, 1000)

  const timeoutId = setTimeout(() => {
    const job = pendingJobs.get(options.log.date)
    if (job) {
      void runScheduledTEFAnalysis(job)
    }
  }, delayMs)

  return {
    date: options.log.date,
    hash,
    log: options.log,
    aiConfig: options.aiConfig,
    saveDailyLog: options.saveDailyLog,
    getDailyLog: options.getDailyLog,
    fetchImpl,
    prepareLogForSave: options.prepareLogForSave,
    timeoutId,
    intervalId,
    dueAt: Date.now() + delayMs,
    listeners,
  }
}

async function runScheduledTEFAnalysis(job: PendingJob): Promise<void> {
  clearInterval(job.intervalId)
  notifyCountdown(job.listeners, 0)
  pendingJobs.delete(job.date)

  try {
    const latestLog = await getLatestLog(job)
    if (!latestLog || tefCacheManager.generateFoodEntriesHash(latestLog.foodEntries) !== job.hash) {
      return
    }

    const aiResult = await performTEFAnalysis(job, latestLog.foodEntries)
    if (!aiResult) return

    const finalAnalysis = buildFinalTEFAnalysis(latestLog.foodEntries, aiResult)
    tefCacheManager.setCachedAnalysis(latestLog.foodEntries, finalAnalysis)
    await persistAnalysisIfCurrent(job, finalAnalysis)
  } catch (error) {
    console.warn("TEF analysis failed:", error)
  }
}

async function performTEFAnalysis(job: PendingJob, foodEntries: FoodEntry[]): Promise<TEFAIResult | null> {
  try {
    return await postAI<TEFAIResult>(
      "/api/ai/tef-analysis",
      { foodEntries },
      { aiConfig: job.aiConfig, fetchImpl: job.fetchImpl },
    )
  } catch (error) {
    console.warn("TEF analysis failed:", error)
    return null
  }
}

async function persistAnalysisIfCurrent(job: PendingJob, analysis: TEFAnalysis): Promise<void> {
  const latestLog = await getLatestLog(job)
  if (!latestLog || tefCacheManager.generateFoodEntriesHash(latestLog.foodEntries) !== job.hash) {
    return
  }

  const updatedLog = prepareLogForSave({ ...latestLog, tefAnalysis: analysis }, job.prepareLogForSave)
  await job.saveDailyLog(updatedLog.date, updatedLog)
  notifyLogUpdated(job.listeners, updatedLog)
}

function persistAnalysisIfChanged(
  log: DailyLog,
  analysis: TEFAnalysis,
  options: Pick<ScheduleTEFAnalysisOptions, "saveDailyLog" | "prepareLogForSave">,
  listener: TEFListener
): void {
  listener.onCountdownChange?.(0)
  const updatedLog = prepareLogForSave({ ...log, tefAnalysis: analysis }, options.prepareLogForSave)
  if (JSON.stringify(log) === JSON.stringify(updatedLog)) return

  listener.onLogUpdated?.(updatedLog)
  void Promise.resolve(options.saveDailyLog(updatedLog.date, updatedLog)).catch((error) => {
    console.warn("Failed to save TEF analysis:", error)
  })
}

function clearTEFAnalysis(
  options: Pick<ScheduleTEFAnalysisOptions, "log" | "saveDailyLog" | "prepareLogForSave">,
  listener: TEFListener
): void {
  listener.onCountdownChange?.(0)
  if (!options.log.tefAnalysis) return

  const updatedLog = prepareLogForSave({ ...options.log, tefAnalysis: undefined }, options.prepareLogForSave)
  listener.onLogUpdated?.(updatedLog)
  void Promise.resolve(options.saveDailyLog(updatedLog.date, updatedLog)).catch((error) => {
    console.warn("Failed to clear TEF analysis:", error)
  })
}

function getCachedOrCorrectedTEFAnalysis(foodEntries: FoodEntry[]): TEFAnalysis | null {
  const cachedAnalysis = tefCacheManager.getCachedAnalysis(foodEntries)
  if (!cachedAnalysis) return null

  const localCheck = identifyTEFEnhancers(foodEntries)
  const mergedFactors = mergeEnhancementFactors(cachedAnalysis.enhancementFactors, localCheck.factors)
  const needsMultiplierCorrection = localCheck.suggestedMultiplier > cachedAnalysis.enhancementMultiplier
  const needsFactorCorrection = mergedFactors.length !== cachedAnalysis.enhancementFactors.length
  if (!needsMultiplierCorrection && !needsFactorCorrection) {
    return cachedAnalysis
  }

  const recomputed = generateTEFAnalysis(
    foodEntries,
    Math.max(cachedAnalysis.enhancementMultiplier, localCheck.suggestedMultiplier)
  )
  const correctedAnalysis = {
    ...recomputed,
    enhancementFactors: mergedFactors,
    analysisTimestamp: cachedAnalysis.analysisTimestamp,
  }
  tefCacheManager.setCachedAnalysis(foodEntries, correctedAnalysis)
  return correctedAnalysis
}

function buildFinalTEFAnalysis(foodEntries: FoodEntry[], aiResult: TEFAIResult): TEFAnalysis {
  const localCheck = identifyTEFEnhancers(foodEntries)
  const finalMultiplier = Math.max(aiResult.enhancementMultiplier ?? 1, localCheck.suggestedMultiplier)
  const localTEFAnalysis = generateTEFAnalysis(foodEntries, finalMultiplier)

  return {
    ...localTEFAnalysis,
    enhancementFactors: mergeEnhancementFactors(
      aiResult.enhancementFactors ?? [],
      localTEFAnalysis.enhancementFactors
    ),
    analysisTimestamp: aiResult.analysisTimestamp || localTEFAnalysis.analysisTimestamp,
  }
}

async function getLatestLog(job: PendingJob): Promise<DailyLog | null> {
  if (!job.getDailyLog) return job.log
  return (await job.getDailyLog(job.date)) ?? null
}

function getFetchImpl(fetchImpl?: FetchLike): FetchLike | undefined {
  return fetchImpl ?? globalThis.fetch?.bind(globalThis)
}

function getRemainingSeconds(job: PendingJob): number {
  return Math.max(0, Math.ceil((job.dueAt - Date.now()) / 1000))
}

function notifyCountdown(listeners: Set<TEFListener>, seconds: number): void {
  listeners.forEach((listener) => listener.onCountdownChange?.(seconds))
}

function notifyLogUpdated(listeners: Set<TEFListener>, log: DailyLog): void {
  listeners.forEach((listener) => listener.onLogUpdated?.(log))
}

function mergeEnhancementFactors(first: string[], second: string[]): string[] {
  return Array.from(new Set([...first, ...second]))
}

function prepareLogForSave(log: DailyLog, prepare?: PrepareLogForSave): DailyLog {
  return prepare ? prepare(log) : log
}
