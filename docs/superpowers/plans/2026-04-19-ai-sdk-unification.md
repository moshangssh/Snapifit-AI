# AI 调用链路整合 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用 Vercel AI SDK + Zod schema 替代自研 `OpenAICompatibleClient`,将 9 个 AI 路由从 `/api/openai/*` 迁移到 `/api/ai/*`,前端同步更新调用点。

**Architecture:** 新增 `lib/ai/` 基础设施层(client 工厂 / schemas / errors / types),所有服务端路由改用 `generateObject` / `generateText` / `streamText`;`lib/openai-client.ts` 与 `app/api/openai/` 整个目录删除。采用 薄工厂模式 —— `createAIClient()` 只返回 AI SDK `LanguageModel`,不封装额外 API。

**Tech Stack:** Next.js 15 (App Router) / React 19 / `ai@latest` / `@ai-sdk/openai@latest` / `zod@^3.24` / `uuid` / TypeScript

**Spec 参考:** `docs/superpowers/specs/2026-04-19-ai-sdk-integration-design.md`

**关键约束:**
- 所有 AI 流量经 NewAPI 网关,以 OpenAI 兼容格式对外 — 不需要 `@ai-sdk/google` 等 provider 专用包
- `generateObject` 使用 `mode: "json"`(走 `response_format: json_object`),不走 `json_schema` — NewAPI 兼容性优先
- 本次**不改 prompt 文案**,只替换调用方式
- 本次**不引入单元测试框架**,以 `pnpm tsc` 编译检查 + dev server 手工回归验证作为 task-level verification

---

## Task 1:确认依赖 & 分支准备

**Files:**
- Read: `package.json`
- Modify: git branch

- [ ] **Step 1:确认必要依赖已存在**

Run:
```bash
grep -E '"(ai|@ai-sdk/openai|zod|uuid)"' package.json
```

Expected 输出(版本号可不同):
```
    "@ai-sdk/openai": "latest",
    "ai": "latest",
    "uuid": "latest",
    "zod": "^3.24.1",
```

若任何一项缺失,先 `pnpm add` 补齐后再继续。

- [ ] **Step 2:创建独立分支**

```bash
git checkout -b feat/ai-sdk-unification
git status
```

Expected:当前分支为 `feat/ai-sdk-unification`,工作区保留用户已有的 modified 文件(不清理)。

- [ ] **Step 3:Commit 分支起点(空 commit 标记起始)**

跳过 —— 不创建空 commit。直接进入 Task 2。

---

## Task 2:创建 `lib/ai/types.ts`(迁移 OpenAIModel 类型)

**Files:**
- Create: `lib/ai/types.ts`

- [ ] **Step 1:创建文件**

写入 `lib/ai/types.ts`:

```typescript
// 模型列表接口(来自 OpenAI 兼容 /v1/models 响应)
export interface OpenAIModel {
  id: string
  object: string
  created: number
  owned_by: string
}

export interface OpenAIModelList {
  object: string
  data: OpenAIModel[]
}
```

- [ ] **Step 2:TS 编译检查**

Run:
```bash
pnpm tsc --noEmit
```

Expected:pass(新文件不会破坏任何现有类型,因为旧的 `lib/openai-client.ts` 暂未删除)。若报错,检查是否有语法问题。

- [ ] **Step 3:Commit**

```bash
git add lib/ai/types.ts
git commit -m "feat(ai): add lib/ai/types with OpenAIModel interfaces"
```

---

## Task 3:创建 `lib/ai/errors.ts`(统一错误类型与响应)

**Files:**
- Create: `lib/ai/errors.ts`

- [ ] **Step 1:写完整内容**

写入 `lib/ai/errors.ts`:

```typescript
import { NoObjectGeneratedError, APICallError } from "ai"

export type AIErrorCode =
  | "MISSING_CONFIG"
  | "INVALID_CONFIG"
  | "INCOMPLETE_CONFIG"
  | "INVALID_INPUT"
  | "UPSTREAM_ERROR"
  | "SCHEMA_MISMATCH"
  | "UNKNOWN"

export class AIError extends Error {
  constructor(
    public code: AIErrorCode,
    message: string,
    public cause?: unknown,
  ) {
    super(message)
    this.name = "AIError"
  }
}

const STATUS_MAP: Record<AIErrorCode, number> = {
  MISSING_CONFIG: 400,
  INVALID_CONFIG: 400,
  INCOMPLETE_CONFIG: 400,
  INVALID_INPUT: 400,
  UPSTREAM_ERROR: 502,
  SCHEMA_MISMATCH: 502,
  UNKNOWN: 500,
}

export function handleAIError(error: unknown): Response {
  if (error instanceof AIError) {
    return Response.json(
      { error: error.message, code: error.code },
      { status: STATUS_MAP[error.code] },
    )
  }
  if (NoObjectGeneratedError.isInstance(error)) {
    return handleAIError(
      new AIError("SCHEMA_MISMATCH", "AI 返回的数据不符合预期结构", error),
    )
  }
  if (APICallError.isInstance(error)) {
    return handleAIError(
      new AIError("UPSTREAM_ERROR", error.message, error),
    )
  }
  console.error("Unknown AI error:", error)
  return handleAIError(new AIError("UNKNOWN", "AI 请求处理失败", error))
}
```

- [ ] **Step 2:TS 编译检查**

Run:
```bash
pnpm tsc --noEmit
```

Expected:pass。如果报 `Module '"ai"' has no exported member 'NoObjectGeneratedError'`,检查 `ai` 包版本,应 ≥ 3.x(`package.json` 已锁 latest)。

- [ ] **Step 3:Commit**

```bash
git add lib/ai/errors.ts
git commit -m "feat(ai): add AIError + handleAIError unified error handling"
```

---

## Task 4:创建 `lib/ai/client.ts`(薄工厂 + 配置提取/校验 helpers)

**Files:**
- Create: `lib/ai/client.ts`

- [ ] **Step 1:写完整内容**

写入 `lib/ai/client.ts`:

```typescript
import { createOpenAI } from "@ai-sdk/openai"
import type { AIConfig, ModelConfig } from "@/lib/types"
import { AIError } from "./errors"

/**
 * 接收一个 ModelConfig,返回 AI SDK 的 LanguageModel。
 * 兼容 baseUrl 末尾带或不带 /v1 两种写法。
 */
export function createAIClient(modelConfig: ModelConfig) {
  const baseURL = modelConfig.baseUrl.endsWith("/v1")
    ? modelConfig.baseUrl
    : `${modelConfig.baseUrl}/v1`
  const provider = createOpenAI({ baseURL, apiKey: modelConfig.apiKey })
  return provider(modelConfig.name)
}

/**
 * 从 request header 中解析 AIConfig。
 * 抛 AIError(MISSING_CONFIG / INVALID_CONFIG)
 */
export function extractAIConfig(req: Request): AIConfig {
  const raw = req.headers.get("x-ai-config")
  if (!raw) throw new AIError("MISSING_CONFIG", "AI configuration not found")
  try {
    return JSON.parse(raw) as AIConfig
  } catch {
    throw new AIError("INVALID_CONFIG", "Invalid AI configuration format")
  }
}

/**
 * 断言 modelConfig 存在且 name/baseUrl/apiKey 齐全。
 * 抛 AIError(INCOMPLETE_CONFIG)
 */
export function validateModelConfig(
  modelConfig: ModelConfig | undefined,
): asserts modelConfig is ModelConfig {
  if (!modelConfig?.name || !modelConfig?.baseUrl || !modelConfig?.apiKey) {
    throw new AIError("INCOMPLETE_CONFIG", "Incomplete AI configuration")
  }
}
```

- [ ] **Step 2:TS 编译检查**

Run:
```bash
pnpm tsc --noEmit
```

Expected:pass。

- [ ] **Step 3:Commit**

```bash
git add lib/ai/client.ts
git commit -m "feat(ai): add createAIClient factory and config helpers"
```

---

## Task 5:创建 `lib/ai/schemas/parse.ts`(食物/运动解析 Zod schema)

**Files:**
- Create: `lib/ai/schemas/parse.ts`

- [ ] **Step 1:写完整内容**

写入 `lib/ai/schemas/parse.ts`:

```typescript
import { z } from "zod"
import { v4 as uuidv4 } from "uuid"

/**
 * 营养成分 schema。
 * passthrough 允许 AI 返回额外字段(对齐 lib/types.ts 里的 [key: string]: number | undefined)。
 */
const NutritionalInfoSchema = z
  .object({
    calories: z.number(),
    carbohydrates: z.number(),
    protein: z.number(),
    fat: z.number(),
    fiber: z.number().optional(),
    sugar: z.number().optional(),
    sodium: z.number().optional(),
  })
  .passthrough()

/** 食物解析 schema。log_id 在 Zod transform 阶段自动注入 UUID。 */
export const FoodParseSchema = z.object({
  food: z.array(
    z.object({
      log_id: z.string().optional().transform(() => uuidv4()),
      food_name: z.string(),
      consumed_grams: z.number(),
      meal_type: z.enum(["breakfast", "lunch", "dinner", "snack"]),
      time_period: z.enum(["morning", "noon", "afternoon", "evening"]),
      nutritional_info_per_100g: NutritionalInfoSchema,
      total_nutritional_info_consumed: NutritionalInfoSchema,
      is_estimated: z.boolean(),
    }),
  ),
})

/** 运动解析 schema。同样自动注入 log_id。 */
export const ExerciseParseSchema = z.object({
  exercise: z.array(
    z.object({
      log_id: z.string().optional().transform(() => uuidv4()),
      exercise_name: z.string(),
      exercise_type: z.enum(["cardio", "strength", "flexibility", "other"]),
      duration_minutes: z.number(),
      distance_km: z.number().optional(),
      sets: z.number().optional(),
      reps: z.number().optional(),
      weight_kg: z.number().optional(),
      estimated_mets: z.number(),
      user_weight: z.number(),
      calories_burned_estimated: z.number(),
      muscle_groups: z.array(z.string()).optional(),
      is_estimated: z.boolean(),
    }),
  ),
})

export type FoodParseResult = z.infer<typeof FoodParseSchema>
export type ExerciseParseResult = z.infer<typeof ExerciseParseSchema>
```

- [ ] **Step 2:TS 编译检查**

Run:
```bash
pnpm tsc --noEmit
```

Expected:pass。

- [ ] **Step 3:Commit**

```bash
git add lib/ai/schemas/parse.ts
git commit -m "feat(ai): add FoodParseSchema and ExerciseParseSchema"
```

---

## Task 6:创建 `lib/ai/schemas/tef-analysis.ts` 和 `lib/ai/schemas/smart-suggestions.ts`

**Files:**
- Create: `lib/ai/schemas/tef-analysis.ts`
- Create: `lib/ai/schemas/smart-suggestions.ts`

- [ ] **Step 1:写 `lib/ai/schemas/tef-analysis.ts`**

```typescript
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
```

- [ ] **Step 2:写 `lib/ai/schemas/smart-suggestions.ts`**

```typescript
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
```

- [ ] **Step 3:TS 编译检查**

Run:
```bash
pnpm tsc --noEmit
```

Expected:pass。

- [ ] **Step 4:Commit**

```bash
git add lib/ai/schemas/tef-analysis.ts lib/ai/schemas/smart-suggestions.ts
git commit -m "feat(ai): add TEFAnalysis and SmartSuggestion Zod schemas"
```

---

## Task 7:迁移 `tef-analysis` 路由(先验证最简的 generateObject 模式)

**Files:**
- Create: `app/api/ai/tef-analysis/route.ts`

- [ ] **Step 1:创建文件**

写入 `app/api/ai/tef-analysis/route.ts`(注意路径是 `app/api/ai/...` 不是 `app/api/openai/...`):

```typescript
import { generateObject } from "ai"
import type { FoodEntry } from "@/lib/types"
import {
  createAIClient,
  extractAIConfig,
  validateModelConfig,
} from "@/lib/ai/client"
import { handleAIError, AIError } from "@/lib/ai/errors"
import { TEFAnalysisSchema } from "@/lib/ai/schemas/tef-analysis"

export async function POST(req: Request) {
  try {
    const { foodEntries } = await req.json()
    if (!foodEntries || !Array.isArray(foodEntries)) {
      throw new AIError("INVALID_INPUT", "Invalid food entries provided")
    }

    const aiConfig = extractAIConfig(req)
    validateModelConfig(aiConfig.agentModel)

    const mealData = foodEntries.map((entry: FoodEntry) => ({
      food_name: entry.food_name,
      meal_type: entry.meal_type,
      time_period: entry.time_period,
      timestamp: entry.timestamp,
      consumed_grams: entry.consumed_grams,
      macros: {
        protein: entry.total_nutritional_info_consumed?.protein || 0,
        carbs: entry.total_nutritional_info_consumed?.carbohydrates || 0,
        fat: entry.total_nutritional_info_consumed?.fat || 0,
        calories: entry.total_nutritional_info_consumed?.calories || 0,
      },
    }))

    const prompt = `
      作为营养学专家，请分析以下膳食记录，重点关注可能影响食物热效应(TEF)的因素。

      膳食记录：
      ${JSON.stringify(mealData, null, 2)}

      请分析以下方面：

      1. **咖啡因摄入分析**：
         - 识别含咖啡因的食物/饮品（咖啡、茶类、巧克力等）
         - 评估摄入时间和可能的持续影响时间
         - 咖啡因可提高TEF 5-15%

      2. **药物和补剂影响**：
         - 识别可能影响代谢的物质（如绿茶提取物、辣椒素、生姜、肉桂、姜黄等）
         - 评估这些物质的TEF增强效果

      3. **食物特性分析**：
         - 辛辣食物（辣椒、胡椒、生姜等）可提高TEF 5-10%
         - 冷饮需要额外能量加热
         - 代谢增强物质（肉桂、柠檬、MCT油等）

      注意：不要分析高蛋白食物的TEF效果，因为蛋白质的热效应已经在基础计算中考虑了

      4. **时间因素**：
         - 分析各餐的时间间隔
         - TEF效应通常持续3-6小时
         - 考虑叠加效应

      5. **综合评估**：
         - 给出TEF增强乘数建议（1.0-1.3之间）
         - 列出主要影响因素
         - 提供改善建议

      请以JSON格式返回分析结果：
      {
        "enhancementMultiplier": 1.15,
        "enhancementFactors": ["咖啡因", "辛辣食物", "代谢增强物质"],
        "detailedAnalysis": {
          "caffeineAnalysis": "检测到咖啡摄入，预计影响3-6小时",
          "spicyFoodAnalysis": "含有辛辣成分，可提高代谢率",
          "coldDrinkAnalysis": "冷饮摄入需要额外热量加热",
          "timingAnalysis": "餐间时间合理，TEF效应可能叠加",
          "medicationAnalysis": "检测到代谢增强物质如肉桂、生姜等"
        },
        "recommendations": [
          "建议在运动前30分钟饮用咖啡以最大化TEF效果",
          "可以适量增加辛辣调料的使用",
          "考虑添加肉桂或生姜等天然代谢增强剂"
        ],
        "confidence": 0.85
      }

      注意：
      - 乘数范围应在1.0-1.3之间
      - 要考虑食物摄入的时间顺序
      - 分析要基于科学证据
      - 如果信息不足，请说明并给出保守估计
    `

    const { object } = await generateObject({
      model: createAIClient(aiConfig.agentModel),
      schema: TEFAnalysisSchema,
      mode: "json",
      prompt,
    })

    return Response.json({
      ...object,
      analysisTimestamp: new Date().toISOString(),
    })
  } catch (error) {
    return handleAIError(error)
  }
}
```

- [ ] **Step 2:TS 编译检查**

Run:
```bash
pnpm tsc --noEmit
```

Expected:pass。

- [ ] **Step 3:手工验证(启动 dev server)**

开一个终端运行:
```bash
pnpm dev
```

在另一终端用 curl 模拟一次调用(需要有效的 NewAPI 配置):
```bash
curl -X POST http://localhost:3000/api/ai/tef-analysis \
  -H "Content-Type: application/json" \
  -H "x-ai-config: {\"agentModel\":{\"name\":\"MODEL_NAME\",\"baseUrl\":\"https://YOUR_NEWAPI\",\"apiKey\":\"sk-xxx\"},\"chatModel\":{\"name\":\"MODEL_NAME\",\"baseUrl\":\"https://YOUR_NEWAPI\",\"apiKey\":\"sk-xxx\"},\"visionModel\":{\"name\":\"MODEL_NAME\",\"baseUrl\":\"https://YOUR_NEWAPI\",\"apiKey\":\"sk-xxx\"}}" \
  -d '{"foodEntries":[{"food_name":"咖啡","consumed_grams":200,"meal_type":"breakfast","time_period":"morning","total_nutritional_info_consumed":{"calories":5,"carbohydrates":0,"protein":0,"fat":0}}]}'
```

Expected:返回 JSON,含 `enhancementMultiplier`(在 1.0~1.3 之间)、`enhancementFactors`、`analysisTimestamp` 等字段。如果 NewAPI 没配或错误,预期 502 + `UPSTREAM_ERROR`。

**若无法手工 curl**(无 NewAPI 测试密钥):跳过 curl,只验证 dev server 启动后 `tsc --noEmit` 不报错。完整回归测试集中到 Task 21。

- [ ] **Step 4:Commit**

```bash
git add app/api/ai/tef-analysis/route.ts
git commit -m "feat(ai): migrate tef-analysis route to generateObject"
```

---

## Task 8:迁移 `parse` 路由(文本 → 食物/运动)

**Files:**
- Create: `app/api/ai/parse/route.ts`

- [ ] **Step 1:创建文件**

写入 `app/api/ai/parse/route.ts`:

```typescript
import { generateObject } from "ai"
import {
  createAIClient,
  extractAIConfig,
  validateModelConfig,
} from "@/lib/ai/client"
import { handleAIError, AIError } from "@/lib/ai/errors"
import { FoodParseSchema, ExerciseParseSchema } from "@/lib/ai/schemas/parse"

export async function POST(req: Request) {
  try {
    const { text, type, userWeight } = await req.json()
    if (!text) throw new AIError("INVALID_INPUT", "No text provided")
    if (type !== "food" && type !== "exercise") {
      throw new AIError("INVALID_INPUT", "Invalid type")
    }

    const aiConfig = extractAIConfig(req)
    validateModelConfig(aiConfig.agentModel)

    const model = createAIClient(aiConfig.agentModel)

    if (type === "food") {
      const prompt = `
        请分析以下文本中描述的食物，并将其转换为结构化的 JSON 格式。
        文本: "${text}"

        请直接输出 JSON，不要有额外文本。如果无法确定数值，请给出合理估算，并在相应字段标记 is_estimated: true。

        每个食物项应包含以下字段:
        - log_id: 唯一标识符
        - food_name: 食物名称
        - consumed_grams: 消耗的克数
        - meal_type: 餐次类型 (breakfast, lunch, dinner, snack)
        - time_period: 时间段 (morning, noon, afternoon, evening)，根据文本内容推断
        - nutritional_info_per_100g: 每100克的营养成分，包括 calories, carbohydrates, protein, fat 等
        - total_nutritional_info_consumed: 基于消耗克数计算的总营养成分
        - is_estimated: 是否为估算值

        示例输出格式:
        {
          "food": [
            {
              "log_id": "uuid",
              "food_name": "全麦面包",
              "consumed_grams": 80,
              "meal_type": "breakfast",
              "time_period": "morning",
              "nutritional_info_per_100g": {
                "calories": 265,
                "carbohydrates": 48.5,
                "protein": 9.0,
                "fat": 3.2,
                "fiber": 7.4
              },
              "total_nutritional_info_consumed": {
                "calories": 212,
                "carbohydrates": 38.8,
                "protein": 7.2,
                "fat": 2.56,
                "fiber": 5.92
              },
              "is_estimated": true
            }
          ]
        }
      `

      const { object } = await generateObject({
        model,
        schema: FoodParseSchema,
        mode: "json",
        prompt,
      })
      return Response.json(object)
    }

    // type === "exercise"
    const prompt = `
      请分析以下文本中描述的运动，并将其转换为结构化的 JSON 格式。
      文本: "${text}"
      用户体重: ${userWeight || 70} kg

      请直接输出 JSON，不要有额外文本。如果无法确定数值，请给出合理估算，并在相应字段标记 is_estimated: true。

      每个运动项应包含以下字段:
      - log_id: 唯一标识符
      - exercise_name: 运动名称
      - exercise_type: 运动类型 (cardio, strength, flexibility, other)
      - duration_minutes: 持续时间(分钟)
      - distance_km: 距离(公里，仅适用于有氧运动)
      - sets: 组数(仅适用于力量训练)
      - reps: 次数(仅适用于力量训练)
      - weight_kg: 重量(公斤，仅适用于力量训练)
      - estimated_mets: 代谢当量(MET值)
      - user_weight: 用户体重(公斤)
      - calories_burned_estimated: 估算的卡路里消耗
      - muscle_groups: 锻炼的肌肉群
      - is_estimated: 是否为估算值

      示例输出格式:
      {
        "exercise": [
          {
            "log_id": "uuid",
            "exercise_name": "跑步",
            "exercise_type": "cardio",
            "duration_minutes": 30,
            "distance_km": 5,
            "estimated_mets": 8.3,
            "user_weight": 70,
            "calories_burned_estimated": 290.5,
            "muscle_groups": ["腿部", "核心"],
            "is_estimated": true
          }
        ]
      }
    `

    const { object } = await generateObject({
      model,
      schema: ExerciseParseSchema,
      mode: "json",
      prompt,
    })
    return Response.json(object)
  } catch (error) {
    return handleAIError(error)
  }
}
```

- [ ] **Step 2:TS 编译检查**

Run:
```bash
pnpm tsc --noEmit
```

Expected:pass。

- [ ] **Step 3:Commit**

```bash
git add app/api/ai/parse/route.ts
git commit -m "feat(ai): migrate parse route to generateObject with Zod schemas"
```

---

## Task 9:迁移 `parse-image` 路由(单图 → 食物/运动)

**Files:**
- Create: `app/api/ai/parse-image/route.ts`

**注意:** 经 grep 确认,前端**未**直接调用 `/api/openai/parse-image`(只调用 `parse-with-images`),但 spec 仍要求迁移以保持目录一致性。

- [ ] **Step 1:创建文件**

写入 `app/api/ai/parse-image/route.ts`(该路由用 **FormData**,不是 JSON body;aiConfig 从 FormData 取):

```typescript
import { generateObject } from "ai"
import {
  createAIClient,
  validateModelConfig,
} from "@/lib/ai/client"
import { handleAIError, AIError } from "@/lib/ai/errors"
import { FoodParseSchema, ExerciseParseSchema } from "@/lib/ai/schemas/parse"
import type { AIConfig } from "@/lib/types"

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const image = formData.get("image") as File | null
    const type = formData.get("type") as string
    const userWeight = formData.get("userWeight") as string
    const aiConfigStr = formData.get("aiConfig") as string

    if (!image) throw new AIError("INVALID_INPUT", "No image provided")
    if (!aiConfigStr) throw new AIError("MISSING_CONFIG", "AI configuration not found")

    let aiConfig: AIConfig
    try {
      aiConfig = JSON.parse(aiConfigStr) as AIConfig
    } catch {
      throw new AIError("INVALID_CONFIG", "Invalid AI configuration format")
    }
    validateModelConfig(aiConfig.visionModel)

    const imageBuffer = await image.arrayBuffer()
    const imageBase64 = Buffer.from(imageBuffer).toString("base64")

    const model = createAIClient(aiConfig.visionModel)

    if (type === "food") {
      const prompt = `
        请分析这张食物图片，识别图中的食物，并将其转换为结构化的 JSON 格式。
        
        请直接输出 JSON，不要有额外文本。如果无法确定数值，请给出合理估算，并在相应字段标记 is_estimated: true。
        
        每个食物项应包含以下字段:
        - log_id: 唯一标识符
        - food_name: 食物名称
        - consumed_grams: 消耗的克数
        - meal_type: 餐次类型 (breakfast, lunch, dinner, snack)
        - time_period: 时间段 (morning, noon, afternoon, evening)，根据图片内容推断
        - nutritional_info_per_100g: 每100克的营养成分，包括 calories, carbohydrates, protein, fat 等
        - total_nutritional_info_consumed: 基于消耗克数计算的总营养成分
        - is_estimated: 是否为估算值
        
        示例输出格式:
        {
          "food": [
            {
              "log_id": "uuid",
              "food_name": "全麦面包",
              "consumed_grams": 80,
              "meal_type": "breakfast",
              "time_period": "morning",
              "nutritional_info_per_100g": {
                "calories": 265,
                "carbohydrates": 48.5,
                "protein": 9.0,
                "fat": 3.2,
                "fiber": 7.4
              },
              "total_nutritional_info_consumed": {
                "calories": 212,
                "carbohydrates": 38.8,
                "protein": 7.2,
                "fat": 2.56,
                "fiber": 5.92
              },
              "is_estimated": true
            }
          ]
        }
      `

      const { object } = await generateObject({
        model,
        schema: FoodParseSchema,
        mode: "json",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image", image: imageBase64, mimeType: image.type },
            ],
          },
        ],
      })
      return Response.json(object)
    } else if (type === "exercise") {
      const prompt = `
        请分析这张运动相关的图片，识别图中的运动类型，并将其转换为结构化的 JSON 格式。
        用户体重: ${userWeight || 70} kg
        
        请直接输出 JSON，不要有额外文本。如果无法确定数值，请给出合理估算，并在相应字段标记 is_estimated: true。
        
        每个运动项应包含以下字段:
        - log_id: 唯一标识符
        - exercise_name: 运动名称
        - exercise_type: 运动类型 (cardio, strength, flexibility, other)
        - duration_minutes: 持续时间(分钟)
        - distance_km: 距离(公里，仅适用于有氧运动)
        - sets: 组数(仅适用于力量训练)
        - reps: 次数(仅适用于力量训练)
        - weight_kg: 重量(公斤，仅适用于力量训练)
        - estimated_mets: 代谢当量(MET值)
        - user_weight: 用户体重(公斤)
        - calories_burned_estimated: 估算的卡路里消耗
        - muscle_groups: 锻炼的肌肉群
        - is_estimated: 是否为估算值
        
        示例输出格式:
        {
          "exercise": [
            {
              "log_id": "uuid",
              "exercise_name": "跑步",
              "exercise_type": "cardio",
              "duration_minutes": 30,
              "distance_km": 5,
              "estimated_mets": 8.3,
              "user_weight": 70,
              "calories_burned_estimated": 290.5,
              "muscle_groups": ["腿部", "核心"],
              "is_estimated": true
            }
          ]
        }
      `

      const { object } = await generateObject({
        model,
        schema: ExerciseParseSchema,
        mode: "json",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image", image: imageBase64, mimeType: image.type },
            ],
          },
        ],
      })
      return Response.json(object)
    }

    throw new AIError("INVALID_INPUT", "Invalid type")
  } catch (error) {
    return handleAIError(error)
  }
}
```

- [ ] **Step 2:TS 编译检查**

Run:
```bash
pnpm tsc --noEmit
```

Expected:pass。

- [ ] **Step 3:Commit**

```bash
git add app/api/ai/parse-image/route.ts
git commit -m "feat(ai): migrate parse-image route to generateObject with AI SDK image part"
```

---

## Task 10:迁移 `parse-with-images` 路由(多图 + 可选文本)

**Files:**
- Create: `app/api/ai/parse-with-images/route.ts`

- [ ] **Step 1:创建文件**

写入 `app/api/ai/parse-with-images/route.ts`:

```typescript
import { generateObject } from "ai"
import {
  createAIClient,
  validateModelConfig,
} from "@/lib/ai/client"
import { handleAIError, AIError } from "@/lib/ai/errors"
import { FoodParseSchema, ExerciseParseSchema } from "@/lib/ai/schemas/parse"
import type { AIConfig } from "@/lib/types"

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const text = (formData.get("text") as string) || ""
    const type = formData.get("type") as string
    const userWeight = formData.get("userWeight") as string
    const aiConfigStr = formData.get("aiConfig") as string

    const images: File[] = []
    for (let i = 0; i < 5; i++) {
      const image = formData.get(`image${i}`) as File | null
      if (image) images.push(image)
    }

    if (images.length === 0) throw new AIError("INVALID_INPUT", "No images provided")
    if (!aiConfigStr) throw new AIError("MISSING_CONFIG", "AI configuration not found")

    let aiConfig: AIConfig
    try {
      aiConfig = JSON.parse(aiConfigStr) as AIConfig
    } catch {
      throw new AIError("INVALID_CONFIG", "Invalid AI configuration format")
    }
    validateModelConfig(aiConfig.visionModel)

    const imageParts = await Promise.all(
      images.map(async (img) => ({
        type: "image" as const,
        image: Buffer.from(await img.arrayBuffer()).toString("base64"),
        mimeType: img.type,
      })),
    )

    const model = createAIClient(aiConfig.visionModel)

    if (type === "food") {
      const prompt = `
        请分析${images.length > 1 ? "这些" : "这张"}食物图片${text ? "和文本描述" : ""}，识别图中的食物，并将其转换为结构化的 JSON 格式。
        ${text ? `用户文本描述: "${text}"` : ""}
        
        请直接输出 JSON，不要有额外文本。如果无法确定数值，请给出合理估算，并在相应字段标记 is_estimated: true。
        
        每个食物项应包含以下字段:
        - log_id: 唯一标识符
        - food_name: 食物名称
        - consumed_grams: 消耗的克数
        - meal_type: 餐次类型 (breakfast, lunch, dinner, snack)
        - time_period: 时间段 (morning, noon, afternoon, evening)，根据图片内容和文本描述推断
        - nutritional_info_per_100g: 每100克的营养成分，包括 calories, carbohydrates, protein, fat 等
        - total_nutritional_info_consumed: 基于消耗克数计算的总营养成分
        - is_estimated: 是否为估算值
        
        示例输出格式:
        {
          "food": [
            {
              "log_id": "uuid",
              "food_name": "全麦面包",
              "consumed_grams": 80,
              "meal_type": "breakfast",
              "time_period": "morning",
              "nutritional_info_per_100g": {
                "calories": 265,
                "carbohydrates": 48.5,
                "protein": 9.0,
                "fat": 3.2,
                "fiber": 7.4
              },
              "total_nutritional_info_consumed": {
                "calories": 212,
                "carbohydrates": 38.8,
                "protein": 7.2,
                "fat": 2.56,
                "fiber": 5.92
              },
              "is_estimated": true
            }
          ]
        }
      `

      const { object } = await generateObject({
        model,
        schema: FoodParseSchema,
        mode: "json",
        messages: [
          { role: "user", content: [{ type: "text", text: prompt }, ...imageParts] },
        ],
      })
      return Response.json(object)
    } else if (type === "exercise") {
      const prompt = `
        请分析${images.length > 1 ? "这些" : "这张"}运动相关的图片${text ? "和文本描述" : ""}，识别图中的运动类型，并将其转换为结构化的 JSON 格式。
        ${text ? `用户文本描述: "${text}"` : ""}
        用户体重: ${userWeight || 70} kg
        
        请直接输出 JSON，不要有额外文本。如果无法确定数值，请给出合理估算，并在相应字段标记 is_estimated: true。
        
        每个运动项应包含以下字段:
        - log_id: 唯一标识符
        - exercise_name: 运动名称
        - exercise_type: 运动类型 (cardio, strength, flexibility, other)
        - duration_minutes: 持续时间(分钟)
        - distance_km: 距离(公里，仅适用于有氧运动)
        - sets: 组数(仅适用于力量训练)
        - reps: 次数(仅适用于力量训练)
        - weight_kg: 重量(公斤，仅适用于力量训练)
        - estimated_mets: 代谢当量(MET值)
        - user_weight: 用户体重(公斤)
        - calories_burned_estimated: 估算的卡路里消耗
        - muscle_groups: 锻炼的肌肉群
        - is_estimated: 是否为估算值
        
        示例输出格式:
        {
          "exercise": [
            {
              "log_id": "uuid",
              "exercise_name": "跑步",
              "exercise_type": "cardio",
              "duration_minutes": 30,
              "distance_km": 5,
              "estimated_mets": 8.3,
              "user_weight": 70,
              "calories_burned_estimated": 290.5,
              "muscle_groups": ["腿部", "核心"],
              "is_estimated": true
            }
          ]
        }
      `

      const { object } = await generateObject({
        model,
        schema: ExerciseParseSchema,
        mode: "json",
        messages: [
          { role: "user", content: [{ type: "text", text: prompt }, ...imageParts] },
        ],
      })
      return Response.json(object)
    }

    throw new AIError("INVALID_INPUT", "Invalid type")
  } catch (error) {
    return handleAIError(error)
  }
}
```

- [ ] **Step 2:TS 编译检查**

Run:
```bash
pnpm tsc --noEmit
```

Expected:pass。

- [ ] **Step 3:Commit**

```bash
git add app/api/ai/parse-with-images/route.ts
git commit -m "feat(ai): migrate parse-with-images route to generateObject"
```

---

## Task 11:迁移 `smart-suggestions` 路由(6 路并发 generateObject)

**Files:**
- Create: `app/api/ai/smart-suggestions/route.ts`

- [ ] **Step 1:创建文件**

写入 `app/api/ai/smart-suggestions/route.ts`:

```typescript
import { generateObject } from "ai"
import {
  createAIClient,
  extractAIConfig,
  validateModelConfig,
} from "@/lib/ai/client"
import { handleAIError, AIError } from "@/lib/ai/errors"
import { SmartSuggestionCategorySchema } from "@/lib/ai/schemas/smart-suggestions"
import { formatDailyStatusForAI } from "@/lib/utils"

export async function POST(req: Request) {
  try {
    const { dailyLog, userProfile, recentLogs } = await req.json()
    if (!dailyLog || !userProfile) {
      throw new AIError("INVALID_INPUT", "Missing required data")
    }

    const aiConfig = extractAIConfig(req)
    validateModelConfig(aiConfig.agentModel)
    const model = createAIClient(aiConfig.agentModel)

    const dataSummary = {
      today: {
        date: dailyLog.date,
        calories: dailyLog.summary.totalCalories,
        protein: dailyLog.summary.totalProtein,
        carbs: dailyLog.summary.totalCarbohydrates,
        fat: dailyLog.summary.totalFat,
        exercise: dailyLog.summary.totalExerciseCalories,
        weight: dailyLog.weight,
        bmr: dailyLog.calculatedBMR,
        tdee: dailyLog.calculatedTDEE,
        tefAnalysis: dailyLog.tefAnalysis,
        foodEntries: dailyLog.foodEntries.map((entry: any) => ({
          name: entry.food_name,
          mealType: entry.meal_type,
          calories: entry.total_nutritional_info_consumed?.calories || 0,
          protein: entry.total_nutritional_info_consumed?.protein || 0,
          timestamp: entry.timestamp,
        })),
        exerciseEntries: dailyLog.exerciseEntries.map((entry: any) => ({
          name: entry.exercise_name,
          calories: entry.calories_burned,
          duration: entry.duration_minutes,
        })),
        dailyStatus: formatDailyStatusForAI(dailyLog.dailyStatus),
      },
      profile: {
        age: userProfile.age,
        gender: userProfile.gender,
        height: userProfile.height,
        weight: userProfile.weight,
        activityLevel: userProfile.activityLevel,
        goal: userProfile.goal,
        targetWeight: userProfile.targetWeight,
        targetCalories: userProfile.targetCalories,
        notes:
          [
            userProfile.notes,
            userProfile.professionalMode && userProfile.medicalHistory
              ? `\n\n医疗信息: ${userProfile.medicalHistory}`
              : "",
            userProfile.professionalMode && userProfile.lifestyle
              ? `\n\n生活方式: ${userProfile.lifestyle}`
              : "",
            userProfile.professionalMode && userProfile.healthAwareness
              ? `\n\n健康认知: ${userProfile.healthAwareness}`
              : "",
          ]
            .filter(Boolean)
            .join("") || undefined,
      },
      recent: recentLogs
        ? recentLogs.slice(0, 7).map((log: any) => ({
            date: log.date,
            calories: log.summary.totalCalories,
            exercise: log.summary.totalExerciseCalories,
            weight: log.weight,
            foodNames: log.foodEntries
              .map((entry: any) => entry.food_name)
              .slice(0, 5),
            exerciseNames: log.exerciseEntries
              .map((entry: any) => entry.exercise_name)
              .slice(0, 3),
            dailyStatus: formatDailyStatusForAI(log.dailyStatus),
          }))
        : [],
    }

    const suggestionPrompts: Record<string, string> = {
      nutrition: `
        你是一位注册营养师(RD)，专精宏量营养素配比和膳食结构优化。

        数据：${JSON.stringify(dataSummary, null, 2)}

        专业分析要点：
        1. 宏量营养素配比评估（蛋白质15-25%，脂肪20-35%，碳水45-65%）
        2. 热量平衡与目标匹配度
        3. 食物选择的营养密度分析
        4. 微量营养素潜在缺口识别
        5. 每日状态对营养需求的影响（压力、心情、健康状况、睡眠质量）

        请提供3-4个具体的营养优化建议，每个建议需包含：
        - 明确的营养学依据
        - 具体的食物替换或添加方案
        - 量化的改进目标

        JSON格式：
        {
          "category": "营养配比优化",
          "priority": "high|medium|low",
          "suggestions": [
            {
              "title": "具体建议标题",
              "description": "基于营养学原理的详细说明和执行方案",
              "actionable": true,
              "icon": "🥗"
            }
          ],
          "summary": "营养状况专业评价"
        }
      `,

      exercise: `
        你是一位认证的运动生理学家，专精运动处方设计和能量代谢优化。

        数据：${JSON.stringify(dataSummary, null, 2)}

        专业分析要点：
        1. 运动量与TDEE目标的匹配度评估
        2. 有氧vs无氧运动配比优化（基于用户目标）
        3. 运动时机与代谢窗口利用
        4. 运动强度区间建议（基于心率储备）
        5. 每日状态对运动能力的影响（压力水平、心情状态、健康状况、睡眠质量）

        请提供2-3个基于运动科学的训练优化建议：
        - 具体的运动类型、强度、时长
        - 运动时机与营养配合策略
        - 渐进式训练计划

        JSON格式：
        {
          "category": "运动处方优化",
          "priority": "high|medium|low",
          "suggestions": [
            {
              "title": "具体运动方案",
              "description": "基于运动生理学的详细训练计划",
              "actionable": true,
              "icon": "🏃‍♂️"
            }
          ],
          "summary": "运动效能专业评价"
        }
      `,

      metabolism: `
        你是一位内分泌代谢专家，专精能量代谢调节和体重管理的生理机制。

        数据：${JSON.stringify(dataSummary, null, 2)}

        专业分析要点：
        1. 基础代谢率与实际消耗的匹配度
        2. TEF优化策略（基于食物热效应数据）
        3. 代谢适应性评估（基于体重变化趋势）
        4. 胰岛素敏感性和代谢灵活性指标

        请提供2-3个基于代谢生理学的优化建议：
        - 进餐时机与代谢节律同步
        - 宏量营养素时序分配
        - 代谢率提升的具体策略

        JSON格式：
        {
          "category": "代谢调节优化",
          "priority": "high|medium|low",
          "suggestions": [
            {
              "title": "代谢优化方案",
              "description": "基于内分泌生理学的详细调节策略",
              "actionable": true,
              "icon": "🔥"
            }
          ],
          "summary": "代谢效率专业评价"
        }
      `,

      behavior: `
        你是一位行为心理学专家，专精健康行为改变和习惯养成的科学方法。

        数据：${JSON.stringify(dataSummary, null, 2)}

        专业分析要点：
        1. 饮食行为模式识别（基于进餐时间和频率）
        2. 行为一致性评估（基于7天数据趋势）
        3. 习惯形成的关键触发点分析
        4. 行为改变的阻力因素识别
        5. 心理状态对行为的影响（压力、心情对饮食和运动习惯的影响）

        请提供2-3个基于行为科学的习惯优化建议：
        - 具体的行为改变策略（基于行为链分析）
        - 环境设计和提示系统
        - 渐进式习惯建立计划

        JSON格式：
        {
          "category": "行为习惯优化",
          "priority": "high|medium|low",
          "suggestions": [
            {
              "title": "行为改变方案",
              "description": "基于行为心理学的详细习惯养成策略",
              "actionable": true,
              "icon": "🧠"
            }
          ],
          "summary": "行为模式专业评价"
        }
      `,

      timing: `
        你是一位时间营养学专家，专精生物节律与营养时机的优化策略。

        数据：${JSON.stringify(dataSummary, null, 2)}

        专业分析要点：
        1. 进餐时机与昼夜节律的同步性
        2. 运动时机与代谢窗口的匹配
        3. 营养素时序分配的优化空间
        4. 睡眠-代谢-营养的协调性
        5. 睡眠时间和质量对时机安排的影响（基于睡眠数据优化作息）

        请提供2-3个基于时间生物学的时机优化建议：
        - 最佳进餐和运动时间窗口
        - 营养素的时序化摄入策略
        - 生物节律同步的具体方法

        JSON格式：
        {
          "category": "时机优化策略",
          "priority": "high|medium|low",
          "suggestions": [
            {
              "title": "时机优化方案",
              "description": "基于时间营养学的详细时序安排",
              "actionable": true,
              "icon": "⏰"
            }
          ],
          "summary": "时机协调专业评价"
        }
      `,

      wellness: `
        你是一位整体健康专家，专精压力管理、睡眠优化和心理健康的综合调节。

        数据：${JSON.stringify(dataSummary, null, 2)}

        专业分析要点：
        1. 压力水平对代谢和食欲的影响评估
        2. 心情状态与饮食行为的关联分析
        3. 睡眠质量对恢复和代谢的影响
        4. 整体健康状况的综合评价
        5. 压力-睡眠-营养-运动的协调优化

        请提供2-3个基于整体健康的优化建议：
        - 压力管理和情绪调节策略
        - 睡眠质量改善方案
        - 心理健康与身体健康的协调方法

        JSON格式：
        {
          "category": "整体健康优化",
          "priority": "high|medium|low",
          "suggestions": [
            {
              "title": "整体健康方案",
              "description": "基于心理生理学的综合健康优化策略",
              "actionable": true,
              "icon": "🌟"
            }
          ],
          "summary": "整体健康状况专业评价"
        }
      `,
    }

    // 并发调用 6 路 generateObject。每一路失败时降级返回空建议,不影响其他路。
    const suggestionPromises = Object.entries(suggestionPrompts).map(
      async ([key, prompt]) => {
        try {
          const { object } = await generateObject({
            model,
            schema: SmartSuggestionCategorySchema,
            mode: "json",
            prompt,
          })
          return { key, ...object }
        } catch (error) {
          console.warn(`Failed to get ${key} suggestions:`, error)
          return {
            key,
            category: key,
            priority: "low" as const,
            suggestions: [],
            summary: "分析暂时不可用",
          }
        }
      },
    )

    const allSuggestions = await Promise.all(suggestionPromises)

    const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 }
    allSuggestions.sort(
      (a: any, b: any) =>
        (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0),
    )

    return Response.json({
      suggestions: allSuggestions,
      generatedAt: new Date().toISOString(),
      dataDate: dailyLog.date,
    })
  } catch (error) {
    return handleAIError(error)
  }
}
```

- [ ] **Step 2:TS 编译检查**

Run:
```bash
pnpm tsc --noEmit
```

Expected:pass。

- [ ] **Step 3:Commit**

```bash
git add app/api/ai/smart-suggestions/route.ts
git commit -m "feat(ai): migrate smart-suggestions route to parallel generateObject"
```

---

## Task 12:迁移 `advice` 路由(纯文本,`generateText`)

**Files:**
- Create: `app/api/ai/advice/route.ts`

- [ ] **Step 1:创建文件**

写入 `app/api/ai/advice/route.ts`:

```typescript
import { generateText } from "ai"
import type { DailyLog, UserProfile } from "@/lib/types"
import {
  createAIClient,
  extractAIConfig,
  validateModelConfig,
} from "@/lib/ai/client"
import { handleAIError, AIError } from "@/lib/ai/errors"
import { formatDailyStatusForAI } from "@/lib/utils"

export async function POST(req: Request) {
  try {
    const { dailyLog, userProfile } = (await req.json()) as {
      dailyLog: DailyLog
      userProfile: UserProfile
    }
    if (!dailyLog || !userProfile) {
      throw new AIError("INVALID_INPUT", "Missing required data")
    }

    const aiConfig = extractAIConfig(req)
    validateModelConfig(aiConfig.agentModel)

    const currentWeight =
      dailyLog.weight && dailyLog.weight > 0 ? dailyLog.weight : userProfile.weight

    const prompt = `
      你是一个专业的健康顾问，请根据用户的健康数据提供个性化的建议。

      用户资料:
      - 体重: ${currentWeight} kg
      - 身高: ${userProfile.height} cm
      - 年龄: ${userProfile.age} 岁
      - 性别: ${
        userProfile.gender === "male"
          ? "男"
          : userProfile.gender === "female"
          ? "女"
          : "其他"
      }
      - 活动水平: ${
        (
          {
            sedentary: "久坐不动",
            light: "轻度活跃",
            moderate: "中度活跃",
            active: "高度活跃",
            very_active: "非常活跃",
          } as Record<string, string>
        )[userProfile.activityLevel] || userProfile.activityLevel
      }
      - 健康目标: ${
        (
          {
            lose_weight: "减重",
            maintain: "保持体重",
            gain_weight: "增重",
            build_muscle: "增肌",
            improve_health: "改善健康",
          } as Record<string, string>
        )[userProfile.goal] || userProfile.goal
      }
      ${userProfile.targetWeight ? `- 目标体重: ${userProfile.targetWeight} kg` : ""}
      ${userProfile.targetCalories ? `- 目标每日卡路里: ${userProfile.targetCalories} kcal` : ""}
      ${(() => {
        const notesContent = [
          userProfile.notes,
          userProfile.professionalMode && userProfile.medicalHistory
            ? `\n\n详细医疗信息:\n${userProfile.medicalHistory}`
            : "",
          userProfile.professionalMode && userProfile.lifestyle
            ? `\n\n生活方式信息:\n${userProfile.lifestyle}`
            : "",
          userProfile.professionalMode && userProfile.healthAwareness
            ? `\n\n健康认知与期望:\n${userProfile.healthAwareness}`
            : "",
        ]
          .filter(Boolean)
          .join("")
        return notesContent ? `- 其他注意事项: ${notesContent}` : ""
      })()}

      今日健康数据 (${dailyLog.date}):
      - 总卡路里摄入: ${dailyLog.summary.totalCaloriesConsumed.toFixed(0)} kcal
      - 总卡路里消耗: ${dailyLog.summary.totalCaloriesBurned.toFixed(0)} kcal
      - 净卡路里: ${(
        dailyLog.summary.totalCaloriesConsumed - dailyLog.summary.totalCaloriesBurned
      ).toFixed(0)} kcal
      - 宏量营养素分布: 碳水 ${dailyLog.summary.macros.carbs.toFixed(
        1,
      )}g, 蛋白质 ${dailyLog.summary.macros.protein.toFixed(
        1,
      )}g, 脂肪 ${dailyLog.summary.macros.fat.toFixed(1)}g

      食物记录:
      ${dailyLog.foodEntries
        .map(
          (entry) =>
            `- ${entry.food_name} (${entry.consumed_grams}g): ${entry.total_nutritional_info_consumed.calories.toFixed(
              0,
            )} kcal${entry.time_period ? ` - ${entry.time_period}` : ""}`,
        )
        .join("\n")}

      运动记录:
      ${dailyLog.exerciseEntries
        .map(
          (entry) =>
            `- ${entry.exercise_name} (${entry.duration_minutes}分钟): ${entry.calories_burned_estimated.toFixed(
              0,
            )} kcal`,
        )
        .join("\n")}

      ${
        dailyLog.dailyStatus
          ? `每日状态:\n${formatDailyStatusForAI(dailyLog.dailyStatus)}\n`
          : ""
      }

      请提供个性化、可操作的健康建议，包括饮食和运动方面的具体建议。建议应该是积极、鼓励性的，并且与用户的健康目标相符。
      ${
        dailyLog.dailyStatus
          ? "请特别考虑用户的每日状态（压力、心情、健康状况、睡眠质量）对建议的影响。"
          : ""
      }
      请用中文回答，不超过300字，不需要分段，直接给出建议内容。
    `

    const { text } = await generateText({
      model: createAIClient(aiConfig.agentModel),
      prompt,
    })

    return Response.json({ advice: text })
  } catch (error) {
    return handleAIError(error)
  }
}
```

- [ ] **Step 2:TS 编译检查**

Run:
```bash
pnpm tsc --noEmit
```

Expected:pass。

- [ ] **Step 3:Commit**

```bash
git add app/api/ai/advice/route.ts
git commit -m "feat(ai): migrate advice route to generateText"
```

---

## Task 13:迁移 `advice-stream` 路由(流式纯文本)

**Files:**
- Create: `app/api/ai/advice-stream/route.ts`

**注意:** 该路由使用 `toTextStreamResponse()`(不是 `toDataStreamResponse()`),前端 `agent-advice.tsx` 用 reader 手工拼接文本 —— 保留此协议。

- [ ] **Step 1:创建文件**

写入 `app/api/ai/advice-stream/route.ts`:

```typescript
import { streamText } from "ai"
import type { DailyLog, UserProfile } from "@/lib/types"
import {
  createAIClient,
  extractAIConfig,
  validateModelConfig,
} from "@/lib/ai/client"
import { handleAIError, AIError } from "@/lib/ai/errors"
import { formatDailyStatusForAI } from "@/lib/utils"

export async function POST(req: Request) {
  try {
    const { dailyLog, userProfile } = (await req.json()) as {
      dailyLog: DailyLog
      userProfile: UserProfile
    }
    if (!dailyLog || !userProfile) {
      throw new AIError("INVALID_INPUT", "Missing required data")
    }

    const aiConfig = extractAIConfig(req)
    validateModelConfig(aiConfig.agentModel)

    const currentWeight =
      dailyLog.weight && dailyLog.weight > 0 ? dailyLog.weight : userProfile.weight

    const prompt = `
      你是一个专业的健康顾问，请根据用户的健康数据提供个性化的建议。

      用户资料:
      - 体重: ${currentWeight} kg
      - 身高: ${userProfile.height} cm
      - 年龄: ${userProfile.age} 岁
      - 性别: ${
        userProfile.gender === "male"
          ? "男"
          : userProfile.gender === "female"
          ? "女"
          : "其他"
      }
      - 活动水平: ${
        (
          {
            sedentary: "久坐不动",
            light: "轻度活跃",
            moderate: "中度活跃",
            active: "高度活跃",
            very_active: "非常活跃",
          } as Record<string, string>
        )[userProfile.activityLevel] || userProfile.activityLevel
      }
      - 健康目标: ${
        (
          {
            lose_weight: "减重",
            maintain: "保持体重",
            gain_weight: "增重",
            build_muscle: "增肌",
            improve_health: "改善健康",
          } as Record<string, string>
        )[userProfile.goal] || userProfile.goal
      }
      ${userProfile.targetWeight ? `- 目标体重: ${userProfile.targetWeight} kg` : ""}
      ${userProfile.targetCalories ? `- 目标每日卡路里: ${userProfile.targetCalories} kcal` : ""}
      ${(() => {
        const notesContent = [
          userProfile.notes,
          userProfile.professionalMode && userProfile.medicalHistory
            ? `\n\n详细医疗信息:\n${userProfile.medicalHistory}`
            : "",
          userProfile.professionalMode && userProfile.lifestyle
            ? `\n\n生活方式信息:\n${userProfile.lifestyle}`
            : "",
          userProfile.professionalMode && userProfile.healthAwareness
            ? `\n\n健康认知与期望:\n${userProfile.healthAwareness}`
            : "",
        ]
          .filter(Boolean)
          .join("")
        return notesContent ? `- 其他注意事项: ${notesContent}` : ""
      })()}

      今日健康数据 (${dailyLog.date}):
      - 总卡路里摄入: ${dailyLog.summary.totalCaloriesConsumed.toFixed(0)} kcal
      - 总卡路里消耗: ${dailyLog.summary.totalCaloriesBurned.toFixed(0)} kcal
      - 净卡路里: ${(
        dailyLog.summary.totalCaloriesConsumed - dailyLog.summary.totalCaloriesBurned
      ).toFixed(0)} kcal
      - 宏量营养素分布: 碳水 ${dailyLog.summary.macros.carbs.toFixed(
        1,
      )}g, 蛋白质 ${dailyLog.summary.macros.protein.toFixed(
        1,
      )}g, 脂肪 ${dailyLog.summary.macros.fat.toFixed(1)}g

      食物记录:
      ${dailyLog.foodEntries
        .map(
          (entry) =>
            `- ${entry.food_name} (${entry.consumed_grams}g): ${entry.total_nutritional_info_consumed.calories.toFixed(
              0,
            )} kcal${entry.time_period ? ` - ${entry.time_period}` : ""}`,
        )
        .join("\n")}

      运动记录:
      ${dailyLog.exerciseEntries
        .map(
          (entry) =>
            `- ${entry.exercise_name} (${entry.duration_minutes}分钟): ${entry.calories_burned_estimated.toFixed(
              0,
            )} kcal`,
        )
        .join("\n")}

      ${
        dailyLog.dailyStatus
          ? `每日状态:\n${formatDailyStatusForAI(dailyLog.dailyStatus)}\n`
          : ""
      }

      请提供个性化、可操作的健康建议，包括饮食和运动方面的具体建议。建议应该是积极、鼓励性的，并且与用户的健康目标相符。
      ${
        dailyLog.dailyStatus
          ? "请特别考虑用户的每日状态（压力、心情、健康状况、睡眠质量）对建议的影响。"
          : ""
      }
      请用中文回答，不超过300字，不需要分段，直接给出建议内容。
    `

    const result = await streamText({
      model: createAIClient(aiConfig.agentModel),
      prompt,
    })

    return result.toTextStreamResponse()
  } catch (error) {
    return handleAIError(error)
  }
}
```

- [ ] **Step 2:TS 编译检查**

Run:
```bash
pnpm tsc --noEmit
```

Expected:pass。

- [ ] **Step 3:Commit**

```bash
git add app/api/ai/advice-stream/route.ts
git commit -m "feat(ai): migrate advice-stream route (toTextStreamResponse preserved)"
```

---

## Task 14:迁移 `chat` 路由(Data Stream 聊天,保留所有 systemPrompt 逻辑)

**Files:**
- Create: `app/api/ai/chat/route.ts`

**注意:** 该文件在原位有 509 行(大量 `console.log` 和复杂 systemPrompt 构建)。**按 Spec 第 9 节 Non-Goals,本次只改路径和导入,不清理 log、不抽 systemPrompt**。逐行 copy 现有 `app/api/openai/chat/route.ts`,只替换:
  - `createOpenAI` 调用改为 `createAIClient`
  - `x-ai-config` 解析改为 `extractAIConfig`
  - 末尾 catch 改为 `handleAIError`

- [ ] **Step 1:复制现有 chat 路由逻辑到新路径**

读:`app/api/openai/chat/route.ts`(509 行)

写入 `app/api/ai/chat/route.ts`:保留全部 `console.log` 与 systemPrompt 构建逻辑,仅做以下 4 处替换:

**(a)顶部 imports 从:**
```typescript
import { streamText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { formatDailyStatusForAI } from "@/lib/utils"
```

**改为:**
```typescript
import { streamText } from "ai"
import {
  createAIClient,
  extractAIConfig,
  validateModelConfig,
} from "@/lib/ai/client"
import { handleAIError, AIError } from "@/lib/ai/errors"
import { formatDailyStatusForAI } from "@/lib/utils"
```

**(b)配置解析块(原 `route.ts:123-161`)从:**
```typescript
const aiConfigStr = req.headers.get("x-ai-config")
// ...
if (!aiConfigStr) return Response.json({ error: "AI configuration not found" }, { status: 400 })
let aiConfig
try { aiConfig = JSON.parse(aiConfigStr); /* ... console.log */ }
catch (e) { /* ... */ return Response.json({ error: "Invalid AI configuration format" }, { status: 400 }) }
const modelConfig = aiConfig.chatModel
// ...
if (!modelConfig?.name || !modelConfig?.baseUrl || !modelConfig?.apiKey) {
  return Response.json({ error: "Incomplete AI configuration" }, { status: 400 })
}
```

**改为:**
```typescript
const aiConfig = extractAIConfig(req)
const modelConfig = aiConfig.chatModel
validateModelConfig(modelConfig)
console.log("Chat model config:", {
  name: modelConfig.name,
  baseUrl: modelConfig.baseUrl,
  hasApiKey: !!modelConfig.apiKey,
})
```

**(c)createOpenAI 块(原 `route.ts:471-490`)从:**
```typescript
const openai = createOpenAI({
  baseURL: modelConfig.baseUrl.endsWith("/v1") ? modelConfig.baseUrl : `${modelConfig.baseUrl}/v1`,
  apiKey: modelConfig.apiKey,
})
const cleanMessages = messages.map((msg: any) => ({ role: msg.role, content: msg.content }))
const result = await streamText({
  model: openai(modelConfig.name),
  system: systemPrompt,
  messages: cleanMessages,
})
return result.toDataStreamResponse()
```

**改为:**
```typescript
const cleanMessages = messages.map((msg: any) => ({ role: msg.role, content: msg.content }))
const result = await streamText({
  model: createAIClient(modelConfig),
  system: systemPrompt,
  messages: cleanMessages,
})
return result.toDataStreamResponse()
```

**(d)末尾 catch(原 `route.ts:496-508`)从:**
```typescript
} catch (error) {
  console.error("=== Chat API Error ===")
  console.error("Error details:", error)
  console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace")
  return Response.json(
    { error: "Failed to process chat request", details: error instanceof Error ? error.message : String(error) },
    { status: 500 },
  )
}
```

**改为:**
```typescript
} catch (error) {
  console.error("=== Chat API Error ===")
  console.error("Error details:", error)
  console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace")
  return handleAIError(error)
}
```

**(e)入参校验(原 `route.ts:117-120`)从:**
```typescript
if (!messages || !Array.isArray(messages)) {
  console.error("Invalid messages format:", messages)
  return Response.json({ error: "Invalid messages format" }, { status: 400 })
}
```

**改为:**
```typescript
if (!messages || !Array.isArray(messages)) {
  console.error("Invalid messages format:", messages)
  throw new AIError("INVALID_INPUT", "Invalid messages format")
}
```

其余所有 console.log、systemPrompt 构建代码、专家角色处理、记忆块处理等**保持原样**。

- [ ] **Step 2:TS 编译检查**

Run:
```bash
pnpm tsc --noEmit
```

Expected:pass。如报 `AIError` 重复声明或未使用,检查是否正确 import/使用。

- [ ] **Step 3:Commit**

```bash
git add app/api/ai/chat/route.ts
git commit -m "feat(ai): migrate chat route (streamText preserved, use createAIClient)"
```

---

## Task 15:迁移 `models` 路由(保留原生 fetch,AI SDK 不覆盖 /v1/models)

**Files:**
- Create: `app/api/ai/models/route.ts`

- [ ] **Step 1:创建文件**

写入 `app/api/ai/models/route.ts`:

```typescript
import { handleAIError, AIError } from "@/lib/ai/errors"
import type { OpenAIModelList } from "@/lib/ai/types"

export async function POST(req: Request) {
  try {
    const { baseUrl, apiKey } = await req.json()
    if (!baseUrl || !apiKey) {
      throw new AIError("INVALID_INPUT", "Base URL and API Key are required")
    }

    const normalizedBase = baseUrl.endsWith("/v1")
      ? baseUrl.slice(0, -3)
      : baseUrl.endsWith("/")
      ? baseUrl.slice(0, -1)
      : baseUrl

    const url = `${normalizedBase}/v1/models`
    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new AIError(
        "UPSTREAM_ERROR",
        `Failed to fetch models: ${response.status} ${response.statusText} - ${errorText}`,
      )
    }

    const result = (await response.json()) as OpenAIModelList
    return Response.json(result)
  } catch (error) {
    return handleAIError(error)
  }
}
```

- [ ] **Step 2:TS 编译检查**

Run:
```bash
pnpm tsc --noEmit
```

Expected:pass。

- [ ] **Step 3:Commit**

```bash
git add app/api/ai/models/route.ts
git commit -m "feat(ai): migrate models route with native fetch (AI SDK doesn't cover /v1/models)"
```

---

## Task 16:迁移 `test-model` 路由(用 generateText 探活)

**Files:**
- Create: `app/api/ai/test-model/route.ts`

- [ ] **Step 1:创建文件**

写入 `app/api/ai/test-model/route.ts`:

```typescript
import { generateText } from "ai"
import type { ModelConfig } from "@/lib/types"
import { createAIClient, validateModelConfig } from "@/lib/ai/client"
import { handleAIError } from "@/lib/ai/errors"

export async function POST(req: Request) {
  try {
    const { modelConfig, modelType } = (await req.json()) as {
      modelConfig: ModelConfig
      modelType?: "agentModel" | "chatModel" | "visionModel"
    }
    validateModelConfig(modelConfig)

    let testPrompt = "Hello, this is a test message. Please respond with 'Test successful'."
    if (modelType === "visionModel") {
      testPrompt =
        "This is a test for vision model text capabilities. Please respond with 'Vision model test successful'."
    } else if (modelType === "agentModel") {
      testPrompt = "This is a test for agent model. Please respond with 'Agent model test successful'."
    } else if (modelType === "chatModel") {
      testPrompt = "This is a test for chat model. Please respond with 'Chat model test successful'."
    }

    const { text } = await generateText({
      model: createAIClient(modelConfig),
      prompt: testPrompt,
    })

    if (text && text.toLowerCase().includes("test successful")) {
      return Response.json({ success: true, message: "Model test successful" })
    }
    return Response.json({
      success: true,
      message: "Model responded but with unexpected content",
      response: text,
    })
  } catch (error) {
    return handleAIError(error)
  }
}
```

- [ ] **Step 2:TS 编译检查**

Run:
```bash
pnpm tsc --noEmit
```

Expected:pass。

- [ ] **Step 3:Commit**

```bash
git add app/api/ai/test-model/route.ts
git commit -m "feat(ai): migrate test-model route to generateText"
```

---

## Task 17:更新 `app/[locale]/page.tsx` 的 4 处 fetch URL

**Files:**
- Modify: `app/[locale]/page.tsx:172, 223, 581, 592`

- [ ] **Step 1:替换 `line 172`**

找:
```typescript
const response = await fetch("/api/openai/tef-analysis", {
```

改:
```typescript
const response = await fetch("/api/ai/tef-analysis", {
```

- [ ] **Step 2:替换 `line 223`**

找:
```typescript
const response = await fetch("/api/openai/smart-suggestions", {
```

改:
```typescript
const response = await fetch("/api/ai/smart-suggestions", {
```

- [ ] **Step 3:替换 `line 581`**

找:
```typescript
const response = await fetch("/api/openai/parse-with-images", {
```

改:
```typescript
const response = await fetch("/api/ai/parse-with-images", {
```

- [ ] **Step 4:替换 `line 592`**

找:
```typescript
const response = await fetch("/api/openai/parse", {
```

改:
```typescript
const response = await fetch("/api/ai/parse", {
```

- [ ] **Step 5:grep 验证本文件无残留 `/api/openai/` 引用**

Run:
```bash
grep -n "api/openai" app/[locale]/page.tsx
```

Expected:无输出(所有引用已改)。

- [ ] **Step 6:Commit**

```bash
git add app/\[locale\]/page.tsx
git commit -m "refactor(ai): update page.tsx fetch URLs to /api/ai/*"
```

---

## Task 18:更新 `components/agent-advice.tsx` 的 fetch URL

**Files:**
- Modify: `components/agent-advice.tsx:58`

- [ ] **Step 1:替换 fetch URL**

找:
```typescript
const response = await fetch("/api/openai/advice-stream", {
```

改:
```typescript
const response = await fetch("/api/ai/advice-stream", {
```

- [ ] **Step 2:grep 验证**

Run:
```bash
grep -n "api/openai" components/agent-advice.tsx
```

Expected:无输出。

- [ ] **Step 3:Commit**

```bash
git add components/agent-advice.tsx
git commit -m "refactor(ai): update agent-advice fetch URL to /api/ai/advice-stream"
```

---

## Task 19:更新两个 chat 页面的 `useChat` api 参数

**Files:**
- Modify: `app/[locale]/chat/page.tsx:480`
- Modify: `app/chat/page.tsx:590`

- [ ] **Step 1:替换 `app/[locale]/chat/page.tsx:480`**

找:
```typescript
api: "/api/openai/chat",
```

改:
```typescript
api: "/api/ai/chat",
```

- [ ] **Step 2:替换 `app/chat/page.tsx:590`**

找:
```typescript
api: "/api/openai/chat",
```

改:
```typescript
api: "/api/ai/chat",
```

- [ ] **Step 3:grep 验证两文件均无残留**

Run:
```bash
grep -n "api/openai" app/\[locale\]/chat/page.tsx app/chat/page.tsx
```

Expected:无输出。

- [ ] **Step 4:Commit**

```bash
git add app/\[locale\]/chat/page.tsx app/chat/page.tsx
git commit -m "refactor(ai): update useChat api to /api/ai/chat"
```

---

## Task 20:更新 `app/[locale]/settings/page.tsx`(类型 import + 2 处 fetch URL)

**Files:**
- Modify: `app/[locale]/settings/page.tsx:20, 346, 454`

- [ ] **Step 1:替换类型 import `line 20`**

找:
```typescript
import type { OpenAIModel } from "@/lib/openai-client"
```

改:
```typescript
import type { OpenAIModel } from "@/lib/ai/types"
```

- [ ] **Step 2:替换 models fetch `line 346`**

找:
```typescript
const response = await fetch("/api/models", {
```

改:
```typescript
const response = await fetch("/api/ai/models", {
```

- [ ] **Step 3:替换 test-model fetch `line 454`**

找:
```typescript
const response = await fetch("/api/test-model", {
```

改:
```typescript
const response = await fetch("/api/ai/test-model", {
```

- [ ] **Step 4:grep 验证**

Run:
```bash
grep -nE "api/models|api/test-model|api/openai|lib/openai-client" app/\[locale\]/settings/page.tsx
```

Expected:无输出。

- [ ] **Step 5:TS 编译检查**

Run:
```bash
pnpm tsc --noEmit
```

Expected:pass(此时 `lib/openai-client.ts` 仍未删除,但 settings 已不依赖它)。

- [ ] **Step 6:Commit**

```bash
git add app/\[locale\]/settings/page.tsx
git commit -m "refactor(ai): update settings page imports and fetch URLs"
```

---

## Task 21:全局 grep 确认无残留 + 删除旧文件

**Files:**
- Delete: `lib/openai-client.ts`
- Delete: `app/api/openai/`(整个目录)
- Delete: `app/api/models/`(整个目录)
- Delete: `app/api/test-model/`(整个目录)

- [ ] **Step 1:全局 grep 确认无引用**

Run:
```bash
grep -rn "api/openai\|/api/models\|/api/test-model\|lib/openai-client\|OpenAICompatibleClient" \
  --include="*.ts" --include="*.tsx" \
  --exclude-dir=node_modules --exclude-dir=.next \
  --exclude-dir=docs
```

Expected:无输出。若有残留(除 `docs/` 外),先修复再继续。`docs/` 下的 spec/plan 引用允许保留。

- [ ] **Step 2:删除旧文件**

Run:
```bash
rm lib/openai-client.ts
rm -rf app/api/openai
rm -rf app/api/models
rm -rf app/api/test-model
```

- [ ] **Step 3:TS 编译检查**

Run:
```bash
pnpm tsc --noEmit
```

Expected:pass。若报错,说明 Step 1 的 grep 有遗漏,立即排查。

- [ ] **Step 4:Commit**

```bash
git add -A
git commit -m "refactor(ai): remove legacy OpenAICompatibleClient and /api/openai routes"
```

---

## Task 22:手工回归验证(启动 dev server 跑完整功能矩阵)

**Files:** 无改动,仅验证。

- [ ] **Step 1:启动 dev server**

Run:
```bash
pnpm dev
```

在浏览器打开 `http://localhost:3000`,确保有效的 NewAPI 配置已保存(设置页)。

- [ ] **Step 2:跑回归测试矩阵(Spec 第 11 节)**

依次手工验证以下场景,每完成一项勾选:

  - [ ] **文本解析食物**:首页输入食物文本 → 调用 `/api/ai/parse` → 看到多餐次、每项有 log_id(UUID)、`is_estimated` 标记
  - [ ] **文本解析运动**:首页输入运动文本 → 有氧 + 力量训练都能识别
  - [ ] **多图识别(食物)**:上传 2+ 张食物图 → 调用 `/api/ai/parse-with-images` → 返回结构化数据
  - [ ] **多图识别(运动)**:上传 2+ 张运动图 → 同上
  - [ ] **TEF 分析**:在含咖啡的一日饮食后 → 触发 TEF 分析 → multiplier 在 1.0~1.3 之间
  - [ ] **智能建议**:有 7 天数据后 → 生成 → 6 个类别都有返回(或部分"分析暂时不可用")
  - [ ] **每日建议(流式)**:首页点生成建议 → `agent-advice` 逐字显示 → 点中断按钮能停下
  - [ ] **健康对话**:`/chat` 页面 → useChat 多轮 → `<think>` 块识别正常 → `[MEMORY_UPDATE_REQUEST]` 识别正常
  - [ ] **模型列表**:设置页"刷新模型"按钮 → 能拉到模型列表
  - [ ] **测试模型连通性**:设置页 Agent/Chat/Vision 三个模型的"测试连接"按钮 → 都返回 "Test successful"
  - [ ] **配置缺失**:新打开一个隐身窗口(无 localStorage)→ 直接跳到 `/` 并尝试用 AI 功能 → 前端应正确处理 400 响应
  - [ ] **NewAPI 故障**:设置页把 baseURL 改成错误值 → 触发任何 AI 功能 → 收到 502(`UPSTREAM_ERROR`)

- [ ] **Step 3:网络面板检查响应 body 结构**

在浏览器 Network 面板观察:
- 成功响应 body:与原格式一致(如 `{ food: [...] }`, `{ advice: "..." }`)
- 失败响应 body:含 `{ error: string, code: "<AIErrorCode>" }`

- [ ] **Step 4:console 观察无未捕获异常**

浏览器 console 和 dev server 终端均不应出现 uncaught exception 或 500 错误(除非是故意触发的 NewAPI 故障场景)。

- [ ] **Step 5:停止 dev server,无 commit**

无代码改动,跳过 commit。

---

## Task 23:PR 准备(不直接提交 PR,只准备)

**Files:** 无代码改动。

- [ ] **Step 1:查看本分支的提交历史**

Run:
```bash
git log --oneline SnapFit-AI-Personal-Edition..feat/ai-sdk-unification
```

Expected:约 18~20 个 commit,对应 Task 2~21 的代码变更。

- [ ] **Step 2:查看 diff 摘要**

Run:
```bash
git diff --stat SnapFit-AI-Personal-Edition..feat/ai-sdk-unification
```

Expected:
- 删除:`lib/openai-client.ts`(约 182 行)
- 删除:`app/api/openai/*`(约 9 个路由)
- 删除:`app/api/models/route.ts`、`app/api/test-model/route.ts`
- 新增:`lib/ai/*`(client/errors/types/schemas)
- 新增:`app/api/ai/*`(9 个路由)
- 修改:4~5 个前端文件的 fetch URL 和 import

- [ ] **Step 3:交给用户决策**

通知用户本地分支已完成,询问是否推送到远端 / 开 PR / 直接合并回 `SnapFit-AI-Personal-Edition`。

不自动 `git push`,不自动 `gh pr create`。

---

## Self-Review

**1. Spec coverage(对照 spec 各节)**

| Spec 章节 | 覆盖任务 |
|---|---|
| § 3 架构总览(`lib/ai/` 四模块 + `app/api/ai/*` + 前端改动) | Task 2-6 基础设施 + Task 7-16 路由 + Task 17-20 前端 |
| § 4.1 工厂函数 | Task 4 |
| § 4.2 Zod schema | Task 5-6 |
| § 4.3 错误处理 | Task 3 |
| § 4.4 路由骨架 | Task 7-16 都用这个骨架 |
| § 5 路由迁移矩阵 | Task 7-16 覆盖全部 9 路由 |
| § 6 数据流 | 各路由任务内体现 |
| § 7 错误处理(HTTP 状态 + body 格式) | Task 3 `handleAIError` + 路由 catch |
| § 8 前端改动清单 | Task 17-20 |
| § 10 迁移顺序(10 阶段) | Task 2-21 对应上 9 阶段 + 手测 |
| § 11 回归测试矩阵 | Task 22 |
| § 12 风险与对策 | Task 21 Step 1 grep 预防残留;Task 22 覆盖故障场景 |
| § 13 回滚策略(独立分支 + 多 commit) | Task 1 创建分支 + 每 task 单 commit |

**Spec Non-Goals 已严格遵守:**
- 未清理 `chat/route.ts` 的 console.log(Task 14 明确保留)
- 未抽 systemPrompt 到 `lib/ai/prompts/`(prompt 保持内联)
- 未引入 `streamObject`
- 未引入单元测试框架(Zod schema 单测标注为"可选 followup")
- 未改 `x-ai-config` header 机制

**2. Placeholder 扫描**

plan 中无 "TBD" / "TODO" / "实现细节略"。每个代码 step 包含完整可执行代码。Task 9 的 parse-image 路由的 prompt 已包含完整字段说明。

**3. Type consistency**

- `createAIClient(modelConfig)` 签名统一(Task 4 定义、Task 7-16 消费)
- `AIError(code, message, cause?)` 构造签名统一
- `extractAIConfig(req)` / `validateModelConfig(modelConfig)` 命名贯穿始终
- `FoodParseSchema` / `ExerciseParseSchema` / `TEFAnalysisSchema` / `SmartSuggestionCategorySchema` 命名一致,Task 5/6 定义、Task 7-11 导入名称一致
- `mode: "json"` 所有 `generateObject` 调用都传此参数

**4. 依赖顺序**

Task 1-6(基础设施) → Task 7-16(路由,依赖基础设施)→ Task 17-20(前端,依赖路由存在)→ Task 21(删除,依赖前端已改完)→ Task 22-23(验证与 PR 准备)。无循环依赖。

---

## 附录:如果遇到问题

### AI SDK 版本 API 差异

如果执行时发现 `NoObjectGeneratedError.isInstance` / `APICallError.isInstance` 不存在,改为 `instanceof`:
```typescript
if (error instanceof NoObjectGeneratedError) { /* ... */ }
if (error instanceof APICallError) { /* ... */ }
```

如果 `generateObject({ mode: "json" })` 的 `mode` 参数名称在当前 AI SDK 版本已改为 `output: 'object'`,查 `@ai-sdk/ai` 版本文档对齐。

### Zod transform 与 AI SDK 的交互

若 `generateObject` 返回的 `object` 没应用 `.transform`(例如 log_id 为空),检查 AI SDK 是否默认使用 `safeParse`。若需要,在路由中再手动 `FoodParseSchema.parse(object)` 跑一次。

### `mode: "json"` 与 prompt 中"请直接输出 JSON"的重复

两者并存无害 —— `mode: "json"` 控制 HTTP `response_format`,prompt 文案控制模型理解。保持现状(不删 prompt 中的 JSON 描述)以免某些模型因只靠 response_format 失效。

### Task 14 做完后 chat 路由超长

完成 Task 14 后,新的 `app/api/ai/chat/route.ts` 预计仍有 500+ 行,其中 200+ 行是 console.log、230+ 行是 systemPrompt 构建。这是 Spec 明确的 Non-Goal,不要在本 PR 中清理。清理可作为后续独立 PR。
