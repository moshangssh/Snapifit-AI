import { beforeEach, describe, expect, it, vi } from "vitest"
import type { DailyLog, UserProfile } from "@/lib/types"

const {
  createAIClientMock,
  extractAIConfigMock,
  streamTextMock,
  validateModelConfigMock,
} = vi.hoisted(() => ({
  createAIClientMock: vi.fn(),
  extractAIConfigMock: vi.fn(),
  streamTextMock: vi.fn(),
  validateModelConfigMock: vi.fn(),
}))

vi.mock("ai", () => ({
  streamText: streamTextMock,
}))

vi.mock("@/lib/ai/client", () => ({
  createAIClient: createAIClientMock,
  extractAIConfig: extractAIConfigMock,
  validateModelConfig: validateModelConfigMock,
}))

const validAIConfig = {
  chatModel: {
    name: "gpt-chat-test",
    baseUrl: "https://api.example.com",
    apiKey: "sk-test",
  },
}

const userProfile: UserProfile = {
  weight: 72,
  height: 176,
  age: 30,
  gender: "male",
  activityLevel: "moderate",
  goal: "lose_weight",
}

const healthData: DailyLog = {
  date: "2026-06-24",
  foodEntries: [],
  exerciseEntries: [],
  summary: {
    totalCaloriesConsumed: 1800,
    totalCaloriesBurned: 300,
    macros: { carbs: 180, protein: 120, fat: 60 },
    micronutrients: {},
  },
  baselineExpenditure: 2000,
  tefAnalysis: {
    baseTEF: 180,
    baseTEFPercentage: 10,
    enhancementMultiplier: 1.25,
    enhancedTEF: 230,
    enhancementFactors: ["咖啡因"],
    analysisTimestamp: "2026-06-24T04:00:00.000Z",
  },
}

function createRequest(body: unknown) {
  return new Request("http://localhost/api/ai/chat", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-ai-config": JSON.stringify(validAIConfig),
    },
    body: JSON.stringify(body),
  })
}

describe("chat route daily energy snapshot", () => {
  beforeEach(() => {
    createAIClientMock.mockReset().mockReturnValue("mock-model")
    extractAIConfigMock.mockReset().mockReturnValue(validAIConfig)
    streamTextMock.mockReset().mockResolvedValue({
      toDataStreamResponse: () => new Response("ok"),
    })
    validateModelConfigMock.mockReset()
  })

  it("passes daily energy snapshot context to the chat system prompt", async () => {
    const { POST } = await import("@/app/api/ai/chat/route")

    await POST(
      createRequest({
        messages: [{ role: "user", content: "今天还能怎么吃" }],
        userProfile,
        healthData,
      }),
    )

    const systemPrompt = streamTextMock.mock.calls[0]?.[0]?.system as string
    expect(systemPrompt).toContain("今日维持热量: 2300 kcal")
    expect(systemPrompt).toContain("今日热量预算: 1900 kcal")
    expect(systemPrompt).toContain("热量平衡: -500 kcal")
    expect(systemPrompt).toContain("宏量目标: 蛋白质 130g, 碳水 242g, 脂肪 46g")
    expect(systemPrompt).not.toContain("代谢提示")
    expect(systemPrompt).toContain("单日热量平衡只是当天决策估算")
    expect(systemPrompt).not.toContain("NEAT 动态法")
    expect(systemPrompt).not.toContain("今日总消耗")
    expect(systemPrompt).not.toContain("TEF增强")
  })
})
