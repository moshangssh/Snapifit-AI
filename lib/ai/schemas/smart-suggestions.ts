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

export type SmartSuggestionCategoryResult = z.infer<typeof SmartSuggestionCategorySchema>
