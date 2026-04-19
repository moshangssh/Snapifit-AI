import { z } from "zod"

/**
 * TEF 分析 schema。
 * enhancementMultiplier 用 .transform 做 clamp(而非 .min/.max),
 * 保留原 tef-analysis/route.ts:110 的"越界则夹紧"防御行为。
 */
export const TEFAnalysisSchema = z.object({
  enhancementMultiplier: z
    .number()
    .transform((v) => Math.max(1.0, Math.min(1.3, v))),
  enhancementFactors: z.array(z.string()),
  detailedAnalysis: z
    .object({
      caffeineAnalysis: z.string().optional(),
      spicyFoodAnalysis: z.string().optional(),
      coldDrinkAnalysis: z.string().optional(),
      timingAnalysis: z.string().optional(),
      medicationAnalysis: z.string().optional(),
    })
    .passthrough()
    .default({}),
  recommendations: z.array(z.string()).default([]),
  confidence: z.number().default(0.5),
})

export type TEFAnalysisResult = z.infer<typeof TEFAnalysisSchema>
