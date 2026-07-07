import {
  buildDailyEnergySnapshot,
  type DailyEnergySnapshot,
} from "@/lib/daily-energy-snapshot"
import type { DailyLog, UserProfile } from "@/lib/types"

function formatWarnings(snapshot: DailyEnergySnapshot): string {
  const warnings: string[] = []

  if (snapshot.missing.length > 0) {
    warnings.push(`缺少基础配置: ${snapshot.missing.join(", ")}`)
  }

  if (snapshot.state === "no-record") {
    warnings.push("今天还没有摄入或运动记录,属于空记录起点")
  }

  if (snapshot.confidence === "low") {
    warnings.push("当前快照置信度较低,建议谨慎解释数字")
  }

  return warnings.length > 0
    ? `警告/解释: ${warnings.join("; ")}`
    : "警告/解释: 无"
}

export function buildDailyEnergySnapshotPrompt(input: {
  log: DailyLog
  userProfile: UserProfile
  now: Date
}): string {
  const snapshot = buildDailyEnergySnapshot(input)

  return `今日能量快照 (${snapshot.date}):
- 基础消耗: ${snapshot.baselineExpenditure} kcal
- 已记录运动: ${snapshot.recordedExerciseCalories} kcal
- 今日维持热量: ${snapshot.maintenanceCalories} kcal
- 今日热量预算: ${snapshot.budgetCalories} kcal
- 摄入: ${snapshot.consumedCalories} kcal
- 剩余预算: ${snapshot.remainingBudgetCalories} kcal
- 热量平衡: ${snapshot.calorieDelta} kcal
- 状态: ${snapshot.state}
- 宏量目标: 蛋白质 ${snapshot.macroTargets.protein}g, 碳水 ${snapshot.macroTargets.carbohydrates}g, 脂肪 ${snapshot.macroTargets.fat}g
- 剩余宏量: 蛋白质 ${snapshot.remainingMacros.protein}g, 碳水 ${snapshot.remainingMacros.carbohydrates}g, 脂肪 ${snapshot.remainingMacros.fat}g
- 置信度: ${snapshot.confidence}
- 个体校准: 未启用, ${snapshot.individualCalibration.windowDays.min}-${snapshot.individualCalibration.windowDays.max} 天趋势预留, 当前调整 ${snapshot.individualCalibration.maintenanceAdjustmentCalories} kcal
${formatWarnings(snapshot)}
说明: 今日维持热量是中性的摄入对消耗估算;今日热量预算是目标驱动的当天可吃预算;热量平衡只比较已记录摄入和今日维持热量。${snapshot.individualCalibration.warning}。单日热量平衡只是当天决策估算,减脂/增重效果应看多日趋势。`
}
