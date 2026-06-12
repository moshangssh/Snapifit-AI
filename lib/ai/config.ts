import type { AIConfig, ModelConfig } from "@/lib/types"

const AI_CONFIG_MODEL_FIELDS = [
  { key: "agentModel", label: "工作模型 / Agents 模型" },
  { key: "chatModel", label: "对话模型" },
  { key: "visionModel", label: "视觉模型" },
] as const

export type OptionalAIConfigValidationResult =
  | { valid: true; configuredCount: number }
  | { valid: false; message: string }

function hasValue(value: string) {
  return value.trim().length > 0
}

export function isCompleteModelConfig(model: ModelConfig) {
  return hasValue(model.name) && hasValue(model.baseUrl) && hasValue(model.apiKey)
}

export function validateOptionalAIConfig(aiConfig: AIConfig): OptionalAIConfigValidationResult {
  let configuredCount = 0

  for (const { key, label } of AI_CONFIG_MODEL_FIELDS) {
    const model = aiConfig[key]

    if (!hasValue(model.apiKey)) {
      continue
    }

    if (!hasValue(model.name) || !hasValue(model.baseUrl)) {
      return {
        valid: false,
        message: `${label}已填写 API Key，请补齐模型名称和 Base URL`,
      }
    }

    configuredCount += 1
  }

  if (configuredCount === 0) {
    return {
      valid: false,
      message: "请至少完整配置一个 AI 模型",
    }
  }

  return { valid: true, configuredCount }
}
