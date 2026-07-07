import { beforeEach, describe, expect, it, vi } from "vitest"
import type { DailyLog, UserProfile } from "@/lib/types"

const {
  createAIClientMock,
  extractAIConfigMock,
  generateTextMock,
  validateModelConfigMock,
} = vi.hoisted(() => ({
  createAIClientMock: vi.fn(),
  extractAIConfigMock: vi.fn(),
  generateTextMock: vi.fn(),
  validateModelConfigMock: vi.fn(),
}))

vi.mock("ai", () => ({
  generateText: generateTextMock,
}))

vi.mock("@/lib/ai/client", () => ({
  createAIClient: createAIClientMock,
  extractAIConfig: extractAIConfigMock,
  validateModelConfig: validateModelConfigMock,
}))

const validAIConfig = {
  agentModel: {
    name: "gpt-test",
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

const dailyLog: DailyLog = {
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
  return new Request("http://localhost/api/ai/advice", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-ai-config": JSON.stringify(validAIConfig),
    },
    body: JSON.stringify(body),
  })
}

describe("advice route daily energy snapshot", () => {
  beforeEach(() => {
    createAIClientMock.mockReset().mockReturnValue("mock-model")
    extractAIConfigMock.mockReset().mockReturnValue(validAIConfig)
    generateTextMock.mockReset().mockResolvedValue({ text: "建议内容" })
    validateModelConfigMock.mockReset()
  })

  it("passes daily energy snapshot context to the advice prompt", async () => {
    const { POST } = await import("@/app/api/ai/advice/route")

    await POST(createRequest({ dailyLog, userProfile }))

    const prompt = generateTextMock.mock.calls[0]?.[0]?.prompt as string
    expect(prompt).toContain("今日维持热量: 2300 kcal")
    expect(prompt).toContain("今日热量预算: 1900 kcal")
    expect(prompt).toContain("热量平衡: -500 kcal")
    expect(prompt).toContain("宏量目标: 蛋白质 130g, 碳水 242g, 脂肪 46g")
    expect(prompt).not.toContain("代谢提示")
    expect(prompt).toContain("单日热量平衡只是当天决策估算")
    expect(prompt).not.toContain("净卡路里")
  })
})
