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
}

function createRequest(body: unknown) {
  return new Request("http://localhost/api/ai/advice-stream", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-ai-config": JSON.stringify(validAIConfig),
    },
    body: JSON.stringify(body),
  })
}

describe("advice-stream route", () => {
  beforeEach(() => {
    createAIClientMock.mockReset().mockReturnValue("mock-model")
    extractAIConfigMock.mockReset().mockReturnValue(validAIConfig)
    streamTextMock.mockReset().mockResolvedValue({
      toTextStreamResponse: () => new Response("建议内容"),
    })
    validateModelConfigMock.mockReset()
  })

  it("streams with the shared advice prompt", async () => {
    const { POST } = await import("@/app/api/ai/advice-stream/route")

    const response = await POST(createRequest({ dailyLog, userProfile }))

    expect(response.status).toBe(200)
    const prompt = streamTextMock.mock.calls[0]?.[0]?.prompt as string
    expect(prompt).toContain("你是一个专业的健康顾问")
    expect(prompt).toContain("今日维持热量: 2300 kcal")
  })

  it("rejects a body without dailyLog or userProfile", async () => {
    const { POST } = await import("@/app/api/ai/advice-stream/route")

    const response = await POST(createRequest({ userProfile }))

    expect(response.status).toBeGreaterThanOrEqual(400)
    expect(streamTextMock).not.toHaveBeenCalled()
  })
})
