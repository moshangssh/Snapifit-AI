import { z } from "zod"

/**
 * 单个建议项 schema。
 */
const SmartSuggestionSchema = z.object({
  title: z.string(),
  description: z.string(),
  actionable: z.boolean(),
  icon: z.string(),
})

/**
 * 单个类别建议 schema。
 * 每次 generateObject 调用返回一个该 schema 的实例(对应 6 个分类之一)。
 */
export const SmartSuggestionCategorySchema = z.object({
  category: z.string(),
  priority: z.enum(["high", "medium", "low"]),
  suggestions: z.array(SmartSuggestionSchema),
  summary: z.string(),
})

const PeriodSmartSuggestionCategorySchema = SmartSuggestionCategorySchema.extend({
  key: z.string(),
})

export const PeriodSmartAnalysisResponseSchema = z.object({
  summary: z.string(),
  highlights: z.array(z.string()),
  risks: z.array(z.string()),
  suggestions: z.array(PeriodSmartSuggestionCategorySchema),
})

/**
 * Day 顶层综述 schema: 今日 API 在分类建议之外输出事实层总评。
 * 字段与 PeriodSmartAnalysisResponse 的 summary/highlights/risks 对齐。
 */
export const DaySmartAnalysisOverviewSchema = z.object({
  summary: z.string(),
  highlights: z.array(z.string()),
  risks: z.array(z.string()),
})

export type SmartSuggestionCategoryResult = z.infer<typeof SmartSuggestionCategorySchema>
export type DaySmartAnalysisOverviewResult = z.infer<
  typeof DaySmartAnalysisOverviewSchema
>
export type PeriodSmartAnalysisResult = z.infer<
  typeof PeriodSmartAnalysisResponseSchema
>
