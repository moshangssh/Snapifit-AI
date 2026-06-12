import { describe, expect, it } from "vitest"
import { validateOptionalAIConfig } from "@/lib/ai/config"
import type { AIConfig } from "@/lib/types"

const defaultAIConfig: AIConfig = {
  agentModel: { name: "gpt-4o", baseUrl: "https://api.openai.com", apiKey: "" },
  chatModel: { name: "gpt-4o", baseUrl: "https://api.openai.com", apiKey: "" },
  visionModel: { name: "gpt-4o", baseUrl: "https://api.openai.com", apiKey: "" },
}

describe("optional AI config validation", () => {
  it("allows saving when only one model has an API key", () => {
    const result = validateOptionalAIConfig({
      ...defaultAIConfig,
      agentModel: {
        ...defaultAIConfig.agentModel,
        apiKey: "sk-agent",
      },
    })

    expect(result.valid).toBe(true)
    if (!result.valid) {
      throw new Error(result.message)
    }
    expect(result.configuredCount).toBe(1)
  })

  it("requires at least one fully configured model", () => {
    const result = validateOptionalAIConfig(defaultAIConfig)

    expect(result.valid).toBe(false)
    if (result.valid) {
      throw new Error("Expected validation to fail")
    }
    expect(result.message).toBe("请至少完整配置一个 AI 模型")
  })

  it("rejects a model with an API key but missing name or base URL", () => {
    const result = validateOptionalAIConfig({
      ...defaultAIConfig,
      chatModel: {
        name: "",
        baseUrl: "https://api.openai.com",
        apiKey: "sk-chat",
      },
    })

    expect(result.valid).toBe(false)
    if (result.valid) {
      throw new Error("Expected validation to fail")
    }
    expect(result.message).toBe("对话模型已填写 API Key，请补齐模型名称和 Base URL")
  })
})
