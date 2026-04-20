# AI 调用链路整合设计(Vercel AI SDK 单一方案)

- **日期**:2026-04-19
- **分支基线**:`SnapFit-AI-Personal-Edition`
- **状态**:Design approved,pending implementation plan

## 1. 背景与动机

项目当前存在**两套并行的 AI 调用实现**,被并列使用在 `app/api/openai/*` 的 9 个路由中:

### 第一套:Vercel AI SDK
- 依赖:`ai`、`@ai-sdk/openai`(均已在 `package.json` 中)
- 用于流式场景:
  - `app/api/openai/chat/route.ts:1-2,486` — `streamText` 聊天
  - `app/api/openai/advice-stream/route.ts:1-2,120` — `streamText` 流式建议
- 客户端消费:`app/[locale]/chat/page.tsx:6,479`、`app/chat/page.tsx:6,589` 的 `useChat` hook

### 第二套:自研 `OpenAICompatibleClient`
- 实现:`lib/openai-client.ts:1-182`,手写 fetch `/v1/chat/completions`
- 用于非流式 / 结构化 JSON 场景:
  - `parse/route.ts`、`parse-image/route.ts`、`parse-with-images/route.ts`(食物/运动/图像解析)
  - `tef-analysis/route.ts`(TEF 分析)
  - `smart-suggestions/route.ts`、`advice/route.ts`(建议)
  - `test-model/route.ts`、`models/route.ts`(配置与模型列表)

### 关键技术约束:NewAPI 网关

所有 AI 流量(GPT-5、Gemini 3.1 Pro、Claude 等)都通过用户部署的 **NewAPI** 聚合网关分发,以 OpenAI 兼容格式(`/v1/chat/completions`)对外暴露。用户**不直连** OpenAI / Google / Anthropic 原厂 API。

这意味着:
- 不需要 `@ai-sdk/google`、`@ai-sdk/anthropic` 等 provider 专用包
- 只需 `@ai-sdk/openai` + 自定义 `baseURL` 指向 NewAPI
- provider 特有参数(Gemini thinking、OpenAI structured outputs 等)受限于 NewAPI 的透传能力

### 为什么要整合

1. **两套并存无技术必要**:AI SDK 完全覆盖自研客户端的全部用途(流式、非流式、视觉、JSON 输出)
2. **样板代码重复**:9 个路由中重复的 `new OpenAICompatibleClient(...)` + `JSON.parse(text)` + 手工字段兜底
3. **结构化输出不健壮**:现有做法是"prompt 里描述 JSON 结构 → AI 返回文本 → `JSON.parse` 无类型校验",AI 乱输出会直接运行时错误
4. **显式重复**:`advice/route.ts`(非流式)与 `advice-stream/route.ts`(流式)是同一功能的两种实现

## 2. 核心决策摘要

| 决策点 | 结论 | 依据 |
|---|---|---|
| SDK 选型 | 统一到 `@ai-sdk/openai` + 自定义 baseURL | NewAPI 使所有流量都是 OpenAI 兼容格式 |
| 结构化输出 | 全量引入 Zod schema,`generateObject` 替代手写 prompt+JSON.parse | AI SDK 核心增值,类型与运行时安全 |
| API 路径 | `/api/openai/*` → `/api/ai/*`(全部重命名) | 语义更准确,反映多模型后端 |
| 迁移节奏 | 一步到位(单 PR,多 commit) | 彻底去历史包袱 |
| 工厂抽象深度 | 薄工厂,返回 AI SDK `LanguageModel` | 避免再造一个"下一个 OpenAICompatibleClient" |
| 错误响应 body | `{ error: string, code: AIErrorCode }` | 兼容现有前端,`code` 留给未来精细处理 |
| `x-ai-config` header | 保持原样,不改 | 避免扩大范围 |
| `chat/route.ts` 清理 | 本次不做,仅改路径 | 200+ 行 console.log 和 systemPrompt 拆分属独立议题 |
| 流式错误协议 | 保持现状(AI SDK 的 data stream 错误) | 避免扩大范围 |
| 单元测试框架 | 本次不引入,留作 followup | Zod schema 单测可作为后续独立 PR |

## 3. 架构总览

三层重构:

```
┌─ ① 基础设施层(新增) ───────────────────────┐
│ lib/ai/                                       │
│ ├── client.ts      createAIClient + helpers   │
│ ├── schemas/       Zod schema(按业务分文件) │
│ ├── errors.ts      AIError + handleAIError    │
│ └── types.ts       OpenAIModel / OpenAIModelList │
└───────────────────────────────────────────────┘
                    │
                    ▼
┌─ ② API 层(改名) ────────────────────────────┐
│ app/api/ai/                                   │
│ ├── parse/route.ts                            │
│ ├── parse-image/route.ts                      │
│ ├── parse-with-images/route.ts                │
│ ├── tef-analysis/route.ts                     │
│ ├── smart-suggestions/route.ts                │
│ ├── advice/route.ts                           │
│ ├── advice-stream/route.ts                    │
│ ├── chat/route.ts                             │
│ └── models/route.ts                           │
└───────────────────────────────────────────────┘
                    │
                    ▼
┌─ ③ 客户端调用层(全量更新 URL) ──────────────┐
│ app/[locale]/page.tsx(4 处 fetch)           │
│ components/agent-advice.tsx(1 处 fetch)     │
│ app/[locale]/chat/page.tsx(useChat api)      │
│ app/chat/page.tsx(useChat api)               │
└───────────────────────────────────────────────┘

要删除:
- lib/openai-client.ts(整个文件 182 行)
- app/api/openai/(整个目录)
- 各路由里重复的 parseJSONResponse / response_format / JSON.parse 样板

要保留(不修改):
- 所有业务逻辑、数据模型、UI 组件
- prompt 文案(只改调用方式,不改内容)
- x-ai-config header 机制
```

## 4. 关键组件形态

### 4.1 工厂函数 `lib/ai/client.ts`

薄工厂设计:只返回 AI SDK 的 `LanguageModel`,不封装额外 API。

```typescript
import { createOpenAI } from "@ai-sdk/openai"
import type { AIConfig } from "@/lib/types"
import { AIError } from "./errors"

type ModelConfig = AIConfig["agentModel"]

export function createAIClient(modelConfig: ModelConfig) {
  // 兜住 baseUrl 的 /v1 尾缀(来自现 chat/route.ts:472 的逻辑)
  const baseURL = modelConfig.baseUrl.endsWith("/v1")
    ? modelConfig.baseUrl
    : `${modelConfig.baseUrl}/v1`
  const provider = createOpenAI({ baseURL, apiKey: modelConfig.apiKey })
  return provider(modelConfig.name)
}

export function extractAIConfig(req: Request): AIConfig {
  const raw = req.headers.get("x-ai-config")
  if (!raw) throw new AIError("MISSING_CONFIG", "AI configuration not found")
  try {
    return JSON.parse(raw) as AIConfig
  } catch {
    throw new AIError("INVALID_CONFIG", "Invalid AI configuration format")
  }
}

export function validateModelConfig(modelConfig: ModelConfig | undefined): asserts modelConfig is ModelConfig {
  if (!modelConfig?.name || !modelConfig?.baseUrl || !modelConfig?.apiKey) {
    throw new AIError("INCOMPLETE_CONFIG", "Incomplete AI configuration")
  }
}
```

**设计原则**:路由里继续直接调用 AI SDK 原生 API(`generateObject({ model, schema, ... })` 等),工厂只解决"AIConfig 到 LanguageModel 的转换"这一件事。

### 4.2 Zod schema 目录 `lib/ai/schemas/`

按业务路由拆分文件:

```
lib/ai/schemas/
├── parse.ts                # FoodParseSchema, ExerciseParseSchema
├── tef-analysis.ts         # TEFAnalysisSchema
├── smart-suggestions.ts    # SmartSuggestionsSchema
└── index.ts                # re-export
```

#### 4.2.1 示例:`lib/ai/schemas/parse.ts`

```typescript
import { z } from "zod"
import { v4 as uuidv4 } from "uuid"

const NutritionalInfoSchema = z.object({
  calories: z.number(),
  carbohydrates: z.number(),
  protein: z.number(),
  fat: z.number(),
  fiber: z.number().optional(),
})

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
      muscle_groups: z.array(z.string()),
      is_estimated: z.boolean(),
    }),
  ),
})

export type FoodParseResult = z.infer<typeof FoodParseSchema>
export type ExerciseParseResult = z.infer<typeof ExerciseParseSchema>
```

**关键收益**:
- `log_id` 通过 `transform` 在 Zod 解析阶段自动注入,无需路由手工 `forEach + uuidv4`
- 枚举 `meal_type`、`time_period`、`exercise_type` 在 Zod 阶段强校验
- TypeScript 类型从 schema 推导,路由与消费方(`app/[locale]/page.tsx` 等)共享类型

#### 4.2.2 示例:`lib/ai/schemas/tef-analysis.ts`

```typescript
import { z } from "zod"

export const TEFAnalysisSchema = z.object({
  enhancementMultiplier: z
    .number()
    .transform((v) => Math.max(1.0, Math.min(1.3, v))),   // clamp,而非 reject
  enhancementFactors: z.array(z.string()),
  detailedAnalysis: z
    .object({
      caffeineAnalysis: z.string().optional(),
      spicyFoodAnalysis: z.string().optional(),
      coldDrinkAnalysis: z.string().optional(),
      timingAnalysis: z.string().optional(),
      medicationAnalysis: z.string().optional(),
    })
    .default({}),
  recommendations: z.array(z.string()).default([]),
  confidence: z.number().default(0.5),
})

export type TEFAnalysisResult = z.infer<typeof TEFAnalysisSchema>
```

**注意**:`enhancementMultiplier` 用 `.transform` clamp 而非 `.min/.max`,保留原 `tef-analysis/route.ts:110` 的"越界则夹紧"防御性行为。不使用 `.min(1.0).max(1.3)`,因为那会在值越界时直接抛 `ZodError`,与原逻辑不一致。

### 4.3 错误处理 `lib/ai/errors.ts`

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

### 4.4 路由统一骨架

取代当前每个路由末尾重复的 catch + `console.error` + 500 模板。

```typescript
import { generateObject } from "ai"
import { createAIClient, extractAIConfig, validateModelConfig } from "@/lib/ai/client"
import { handleAIError, AIError } from "@/lib/ai/errors"
import { FoodParseSchema, ExerciseParseSchema } from "@/lib/ai/schemas/parse"

export async function POST(req: Request) {
  try {
    const aiConfig = extractAIConfig(req)
    validateModelConfig(aiConfig.agentModel)

    const { text, type, userWeight } = await req.json()
    if (!text) throw new AIError("INVALID_INPUT", "No text provided")

    const schema = type === "food" ? FoodParseSchema : ExerciseParseSchema
    if (!schema) throw new AIError("INVALID_INPUT", "Invalid type")

    const model = createAIClient(aiConfig.agentModel)
    // prompt 字符串在路由内联构造,保留原 prompt 文案(参见 Non-Goals)
    const prompt = `请分析以下文本中描述的${type === "food" ? "食物" : "运动"}...`

    const { object } = await generateObject({
      model,
      schema,
      mode: "json",   // NewAPI 兼容:走 json_object 不走 json_schema
      prompt,
    })

    return Response.json(object)
  } catch (error) {
    return handleAIError(error)
  }
}
```

## 5. 路由迁移矩阵

| 原路径 | 新路径 | AI SDK API | Schema / 输出类型 |
|---|---|---|---|
| `app/api/openai/parse` | `app/api/ai/parse` | `generateObject` + `mode: "json"` | `FoodParseSchema` / `ExerciseParseSchema` |
| `app/api/openai/parse-image` | `app/api/ai/parse-image` | `generateObject`(`messages` 含图像 part) | 同上 |
| `app/api/openai/parse-with-images` | `app/api/ai/parse-with-images` | `generateObject`(`messages` 含多图) | 同上 |
| `app/api/openai/tef-analysis` | `app/api/ai/tef-analysis` | `generateObject` + `mode: "json"` | `TEFAnalysisSchema` |
| `app/api/openai/smart-suggestions` | `app/api/ai/smart-suggestions` | `generateObject` + `mode: "json"` | `SmartSuggestionsSchema` |
| `app/api/openai/advice` | `app/api/ai/advice` | **`generateText`**(返回自由文本) | 无 |
| `app/api/openai/advice-stream` | `app/api/ai/advice-stream` | `streamText` + `toDataStreamResponse` | 无 |
| `app/api/openai/chat` | `app/api/ai/chat` | `streamText` + `toDataStreamResponse` | 无 |
| `app/api/models` | `app/api/ai/models` | **原生 fetch**(AI SDK 不覆盖 `/v1/models`) | 无 |
| `app/api/test-model` | `app/api/ai/test-model` | `generateText`(测试模型是否能对话) | 无 |

**关键点**:`advice/route.ts` 返回 `{ advice: string }` 自由文本,**不使用** `generateObject`(无 schema)。

## 6. 数据流

### 6.1 通用请求链路

```
客户端
  fetch("/api/ai/parse", {
    headers: { "x-ai-config": JSON.stringify(aiConfig) },
    body: JSON.stringify({ text, type }),
  })
        ↓
路由(app/api/ai/parse/route.ts)
  const aiConfig = extractAIConfig(req)          // 抛 MISSING_CONFIG / INVALID_CONFIG
  validateModelConfig(aiConfig.agentModel)       // 抛 INCOMPLETE_CONFIG
  const model = createAIClient(aiConfig.agentModel)
  await generateObject({ model, schema, mode: "json", prompt })
        ↓
@ai-sdk/openai
  POST {baseUrl}/v1/chat/completions
    body: { model, messages, response_format: { type: "json_object" } }
        ↓
NewAPI 网关 → 上游模型(GPT-5 / Gemini / Claude)
```

### 6.2 结构化响应链路

```
上游返回 JSON 字符串
  → AI SDK JSON.parse
  → Zod schema 校验
    ├─ 通过 → 返回强类型 object
    └─ 失败 → AI SDK 自动重试(默认最多 2 次,带修正 prompt)
               └─ 仍失败 → 抛 NoObjectGeneratedError
                          → 路由 catch → handleAIError → 502 + SCHEMA_MISMATCH
```

### 6.3 流式响应链路(chat、advice-stream)

```
路由:
  const result = await streamText({ model, system, messages })
  return result.toDataStreamResponse()

客户端:
  app/[locale]/chat/page.tsx     — useChat({ api: "/api/ai/chat" })
  components/agent-advice.tsx    — fetch 手工读 reader,decode,append
```

**流式协议与前端消费方式保持不变**,仅路径从 `/api/openai/*` 改为 `/api/ai/*`。

### 6.4 图像路由数据流

```typescript
await generateObject({
  model,
  schema: FoodParseSchema,
  mode: "json",
  messages: [{
    role: "user",
    content: [
      { type: "text", text: prompt },
      { type: "image", image: imageBase64 },
      // 多图追加更多 image part
    ],
  }],
})
```

替代当前 `lib/openai-client.ts:86-95` 手工构造 `image_url: { url: image }` 的逻辑。

## 7. 错误处理

### 7.1 HTTP 状态码映射

| AIErrorCode | HTTP | 触发场景 |
|---|---|---|
| `MISSING_CONFIG` | 400 | 请求缺 `x-ai-config` header |
| `INVALID_CONFIG` | 400 | header JSON.parse 失败 |
| `INCOMPLETE_CONFIG` | 400 | `modelConfig` 的 name/baseUrl/apiKey 某项缺失 |
| `INVALID_INPUT` | 400 | 请求 body 参数缺失或非法 |
| `UPSTREAM_ERROR` | 502 | NewAPI 返回非 2xx,或 AI SDK `APICallError`/`RetryError` |
| `SCHEMA_MISMATCH` | 502 | Zod 重试后仍失败(`NoObjectGeneratedError`) |
| `UNKNOWN` | 500 | 未分类错误,兜底 |

### 7.2 响应 body 格式

```json
// 成功(无变化)
{ "food": [...] }
{ "advice": "..." }

// 失败(新增 code,保留 error 兼容现有前端)
{ "error": "AI 返回的数据不符合预期结构", "code": "SCHEMA_MISMATCH" }
```

### 7.3 前端影响

零破坏性变更。现有前端只读 `response.ok` 和 `response.statusText`:

- `app/[locale]/page.tsx:181-190`、`236-239`:`if (!response.ok) console.warn`
- `components/agent-advice.tsx:71-73`:`throw new Error(response.statusText)`

新 `code` 字段作为**未来能力储备**,前端在本次整合中不读。

### 7.4 流式错误

流式响应 HTTP 200 之后发生的错误不能再改状态码。保持现状:

- `chat` 用 `streamText().toDataStreamResponse()`,错误自动编码进 data stream,`useChat` 自动识别
- `advice-stream` 同理,`agent-advice.tsx` 手工读流时已有 AbortError 处理

**不在本次范围内引入新流式错误协议。**

## 8. 前端改动清单

| 文件 | 行号 | 改动 |
|---|---|---|
| `app/[locale]/page.tsx` | 172 | `/api/openai/tef-analysis` → `/api/ai/tef-analysis` |
| `app/[locale]/page.tsx` | 223 | `/api/openai/smart-suggestions` → `/api/ai/smart-suggestions` |
| `app/[locale]/page.tsx` | 581 | `/api/openai/parse-with-images` → `/api/ai/parse-with-images` |
| `app/[locale]/page.tsx` | 592 | `/api/openai/parse` → `/api/ai/parse` |
| `components/agent-advice.tsx` | 58 | `/api/openai/advice-stream` → `/api/ai/advice-stream` |
| `app/[locale]/chat/page.tsx` | `useChat` api 参数 | 指向 `/api/ai/chat` |
| `app/chat/page.tsx` | `useChat` api 参数 | 指向 `/api/ai/chat` |
| `app/[locale]/settings/page.tsx:20` | `import` | `OpenAIModel` 类型的 import 路径改为 `@/lib/ai/types` |

模型类型接口 `OpenAIModel` 和 `OpenAIModelList`(当前在 `lib/openai-client.ts:171-181`)迁移到 `lib/ai/types.ts`,供 `settings/page.tsx` 消费。迁移顺序上,类型迁移(步骤 8)必须在删除 `lib/openai-client.ts`(步骤 9)之前完成。

## 9. 范围外(Non-Goals)

本次整合**明确不做**以下事项,以防止 scope creep:

- 清理 `chat/route.ts` 的 200+ 行 `console.log`(独立 followup PR)
- 抽取 systemPrompt 或 prompt 字符串到 `lib/ai/prompts/`(独立 followup);本次整合中 **prompt 字符串保持在路由内联**,仅迁移调用方式和文件路径
- 引入 `streamObject`(流式结构化输出)
- 改造 `x-ai-config` header 机制(cookie / session / 环境变量)
- 引入完整单元测试框架(vitest/jest)
- 前端为 `code` 字段新增精细错误分支 UI
- 调整 prompt 文案(只改调用方式,文案原样保留)

## 10. 迁移顺序(PR 内部的 commit 拆分)

虽然"一步到位"(单 PR),但 PR 内部按 logical order 拆 commit,便于 review 与二分定位:

1. 搭基础设施:`lib/ai/client.ts`、`lib/ai/errors.ts`、`lib/ai/schemas/*.ts`(不改任何路由)
2. 平移最简路由验证模式:`tef-analysis` → `/api/ai/tef-analysis`
3. 批量迁 `generateObject` 路由:`parse`、`parse-image`、`parse-with-images`、`smart-suggestions`
4. 迁 `generateText` 路由:`advice`
5. 迁 `streamText` 路由:`chat`、`advice-stream`
6. 迁 `models`、`test-model` 路由
7. 前端 fetch URL 全局替换
8. 迁移 `OpenAIModel` 类型定义到 `lib/ai/types.ts`
9. 删除 `lib/openai-client.ts` 和 `app/api/openai/` 目录
10. 本地 `pnpm dev` 手测完整回归矩阵

## 11. 回归测试矩阵

现有代码库无单元测试,以手工回归为主。

| 场景 | 验证点 | 涉及路由 |
|---|---|---|
| 文本解析食物 | 多餐次、自动 uuid、`is_estimated` 标记 | parse |
| 文本解析运动 | 有氧 + 力量训练 | parse |
| 单图识别 | 食物图片 → 结构化字段完整 | parse-image |
| 多图识别 | 2+ 张同时上传 | parse-with-images |
| TEF 分析 | 含咖啡因餐后 multiplier 在 1.0~1.3 | tef-analysis |
| 智能建议 | 7 天数据 → 返回结构化输出 | smart-suggestions |
| 每日建议(流式) | `agent-advice.tsx` SSE 逐字展示、中断(AbortController) | advice-stream |
| 每日建议(非流式) | 返回 `{ advice: string }` | advice |
| 健康对话 | `useChat` 多轮、`<think>` 块、`[MEMORY_UPDATE_REQUEST]` 识别 | chat |
| 模型列表 | 设置页拉取模型成功 | models |
| 测试模型连通性 | 设置页"测试连接"按钮 | test-model |
| 配置缺失 | 新浏览器直接调 AI → 400 + `MISSING_CONFIG` | 任意 |
| NewAPI 故障 | 错误的 baseUrl → 502 + `UPSTREAM_ERROR` | 任意 |
| Zod schema 失败 | 上游返回不合法 JSON → 502 + `SCHEMA_MISMATCH` | parse 类 |

## 12. 风险与对策

| 风险 | 影响 | 对策 |
|---|---|---|
| NewAPI 对 `response_format: json_object` 支持因模型而异 | 部分模型的 generateObject 会 100% 失败 | 错误返回 `SCHEMA_MISMATCH`,用户可切换支持的模型;文案可引导用户检查模型 |
| AI SDK 默认重试 2 次,token 消耗增加 | 成本上升 | 观察实际失败率,必要时调 `maxRetries: 1` |
| `NoObjectGeneratedError` 在某些场景下可能遮蔽真实原因 | 调试困难 | `handleAIError` 保留 `cause` 链,`console.error` 打印完整错误 |
| `chat/route.ts` 体积大(509 行),迁移时易漏改 | 回归风险 | 只改路径和导入,不动逻辑;单独 commit 便于回滚 |
| 前端忘改某处 fetch URL 导致 404 | 功能失效 | 删除 `app/api/openai/` 目录后,任何漏改会立即 404 暴露 |
| `OpenAIModel` 类型迁移导致 `settings/page.tsx` 编译失败 | Build 阻断 | 类型迁移在删除 `lib/openai-client.ts` 之前完成 |
| NewAPI 本身偶发 panic(已观察到) | 间歇性失败 | 通过 `APICallError` → `UPSTREAM_ERROR`(502)暴露,用户可重试 |

## 13. 回滚策略

- 独立分支 `feat/ai-sdk-unification`,不 squash commits(10 个 commit 对应上述 10 个阶段)
- 上线后出问题,`git revert` 单个 commit 或整个 PR
- 保留 `SnapFit-AI-Personal-Edition` 分支不动,合并前最后一次比对

## 14. 实施后的成果

- 删除:`lib/openai-client.ts`(182 行)+ 各路由重复样板(估计 200~300 行)
- 新增:`lib/ai/`(client + errors + schemas,估计 300~400 行)
- 净变化:代码量大致持平,但**类型安全、可测试性、可扩展性显著提升**
- 未来开启 Gemini / Claude 等原生能力的路径打通(只需新增 provider 包,不再受自研客户端约束 — 虽然当前 NewAPI 场景下用不上)
