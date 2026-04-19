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
