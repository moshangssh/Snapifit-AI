import type { PeriodAnalysisSummary } from "@/lib/smart-analysis-period"
import type { UserProfile } from "@/lib/types"
import { buildProfileSummary } from "@/lib/ai/health-profile-prompt"

/** 周期复盘(7 天 / 30 天)的分析 prompt。 */
export function buildPeriodAnalysisPrompt(input: {
  summary: PeriodAnalysisSummary
  userProfile: UserProfile
}): string {
  const { summary, userProfile } = input
  const periodLabel = summary.range === "7d" ? "7天复盘" : "30天趋势"

  return `
      你是一位专业健康管理顾问,正在生成${periodLabel}。

      用户资料:
      ${JSON.stringify(buildProfileSummary(userProfile), null, 2)}

      周期数据摘要:
      ${JSON.stringify(summary, null, 2)}

      分析要求:
      1. 不要把单日波动夸大成趋势,只基于已有 ${summary.dataDays} 天真实记录判断。
      2. ${summary.range === "7d" ? "重点输出下周最该执行的纠偏动作。" : "重点判断长期趋势、执行稳定性和下阶段策略。"}
      3. 明确区分已经做得好的地方、主要风险和下一步行动。
      4. 建议必须具体、可执行、可量化,避免泛泛而谈。
      5. 使用中文,允许在 description 中使用简短 Markdown。

      返回 JSON:
      {
        "summary": "120字以内的周期总评",
        "highlights": ["亮点1", "亮点2", "亮点3"],
        "risks": ["风险1", "风险2"],
        "suggestions": [
          {
            "key": "nutrition",
            "category": "周期营养复盘",
            "priority": "high|medium|low",
            "summary": "该方向的简短判断",
            "suggestions": [
              {
                "title": "具体行动标题",
                "description": "执行方法、数量或频率、触发条件",
                "actionable": true,
                "icon": "🥗"
              }
            ]
          }
        ]
      }
    `
}
