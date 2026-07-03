import { calculateMetabolicRates } from "@/lib/health-utils"
import { recalculateDailySummary } from "@/lib/daily-summary"
import type {
  DailyLog,
  DailyStatus,
  ExerciseEntry,
  FoodEntry,
  MealPlanSuggestion,
  UserProfile,
} from "@/lib/types"

/**
 * DailyLog 写入意图。判别式落在**输入**(意图),输出只有一种结局——写好的 DailyLog
 * (区别于 planWorkout 的判别式**输出**)。覆盖首页、工作台与训练页当前用到的分支。
 */
export type DailyLogWrite =
  | { kind: "addEntries"; food?: FoodEntry[]; exercise?: ExerciseEntry[] }
  | { kind: "removeEntry"; id: string; type: "food" | "exercise" }
  | { kind: "updateEntry"; entry: FoodEntry | ExerciseEntry; type: "food" | "exercise" }
  | { kind: "setWeight"; weight: number | undefined }
  | { kind: "setDailyStatus"; status: DailyStatus }
  | { kind: "setMealPlanSuggestion"; suggestion: MealPlanSuggestion }
  | { kind: "replaceSessionEntries"; sessionId: string; entries: ExerciseEntry[] }
  | { kind: "reconcile" }

export interface ApplyDailyLogWriteContext {
  userProfile: UserProfile
}

/**
 * DailyLog 写入的唯一纯核心。给定当前 log、一个写入意图与上下文,
 * 永远重算摘要与基础消耗(`calculatedBMR` + `baselineExpenditure`),
 * 再叠加意图的结构改动。无副作用。
 */
export function applyDailyLogWrite(
  log: DailyLog,
  write: DailyLogWrite,
  ctx: ApplyDailyLogWriteContext,
): DailyLog {
  const structural = applyStructuralChange(log, write)
  const withSummary: DailyLog = {
    ...structural,
    summary: recalculateDailySummary(structural),
  }
  return stampBaselineExpenditure(withSummary, ctx.userProfile)
}

function applyStructuralChange(log: DailyLog, write: DailyLogWrite): DailyLog {
  switch (write.kind) {
    case "addEntries":
      return {
        ...log,
        foodEntries: [...log.foodEntries, ...(write.food ?? [])],
        exerciseEntries: [...log.exerciseEntries, ...(write.exercise ?? [])],
      }
    case "removeEntry":
      return write.type === "food"
        ? { ...log, foodEntries: log.foodEntries.filter((entry) => entry.log_id !== write.id) }
        : { ...log, exerciseEntries: log.exerciseEntries.filter((entry) => entry.log_id !== write.id) }
    case "updateEntry":
      return write.type === "food"
        ? {
            ...log,
            foodEntries: log.foodEntries.map((entry) =>
              entry.log_id === write.entry.log_id ? (write.entry as FoodEntry) : entry,
            ),
          }
        : {
            ...log,
            exerciseEntries: log.exerciseEntries.map((entry) =>
              entry.log_id === write.entry.log_id ? (write.entry as ExerciseEntry) : entry,
            ),
          }
    case "setWeight":
      return { ...log, weight: write.weight }
    case "setDailyStatus":
      return { ...log, dailyStatus: write.status }
    case "setMealPlanSuggestion":
      return { ...log, mealPlanSuggestion: write.suggestion }
    case "replaceSessionEntries":
      return {
        ...log,
        exerciseEntries: [
          ...log.exerciseEntries.filter(
            (entry) => !isWorkoutSessionEntry(entry, write.sessionId),
          ),
          ...write.entries,
        ],
      }
    case "reconcile":
      return log
    default:
      // 编译期穷尽性检查:新增 DailyLogWrite 分支却漏接结构改动时会在此报错
      return write satisfies never
  }
}

function isWorkoutSessionEntry(entry: ExerciseEntry, sessionId: string): boolean {
  return entry.log_id.startsWith(`workout:${sessionId}:`)
}

// 每次写入都从当前 userProfile + log.weight 重算并盖章基础消耗。
// 无法计算时(profile 不全)保留既有值,不擦除历史盖章。
// `calculatedTDEE` 为 deprecated 只读字段,核心不写。
function stampBaselineExpenditure(log: DailyLog, userProfile: UserProfile): DailyLog {
  const rates = calculateMetabolicRates(userProfile, { weight: log.weight })
  if (!rates) return log
  return {
    ...log,
    calculatedBMR: rates.bmr,
    baselineExpenditure: rates.baselineExpenditure,
  }
}
