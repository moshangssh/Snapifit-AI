import type { DailyLog } from "@/lib/types"

/**
 * Whether a DailyLog represents something the **user actually recorded** that
 * day — the single predicate behind "this day has a record" checks (calendar
 * markers, chat context loading, …).
 *
 * Only user-authored fields count. Derived / auto-stamped values are NOT
 * evidence of a record and are deliberately excluded:
 *   - `calculatedBMR` / `calculatedTDEE` / `baselineExpenditure` /
 *     `dailyTotalExpenditure` — `applyDailyLogWrite` stamps 基础消耗 on every
 *     load/reconcile (ADR-0014), so counting them would mark days the user only
 *     *viewed* as recorded.
 *   - `summary` — recomputed from the entries, so it carries no independent
 *     signal.
 */
export function hasUserRecordedData(
  log: DailyLog | null | undefined,
): log is DailyLog {
  if (!log) return false
  return Boolean(
    log.foodEntries?.length ||
      log.exerciseEntries?.length ||
      log.weight !== undefined ||
      log.dailyStatus ||
      log.mealPlanSuggestion ||
      log.plannedTrainingType,
  )
}
