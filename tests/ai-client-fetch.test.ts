import { afterEach, describe, expect, it, vi } from "vitest"
import {
  AIRequestError,
  DEFAULT_AI_CONFIG,
  aiConfigHeader,
  postAI,
  postAIStream,
  readStoredAIConfig,
} from "@/lib/ai/client-fetch"
import type { AIConfig } from "@/lib/types"

const storedConfig: AIConfig = {
  agentModel: { name: "m-agent", baseUrl: "https://api.example.com", apiKey: "sk-1" },
  chatModel: { name: "m-chat", baseUrl: "https://api.example.com", apiKey: "sk-2" },
  visionModel: { name: "m-vision", baseUrl: "https://api.example.com", apiKey: "sk-3" },
}

function stubLocalStorage(raw: string | null) {
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => (key === "aiConfig" ? raw : null),
    },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("readStoredAIConfig", () => {
  it("falls back to the default config during SSR", () => {
    expect(readStoredAIConfig()).toEqual(DEFAULT_AI_CONFIG)
  })

  it("returns the stored config when present", () => {
    stubLocalStorage(JSON.stringify(storedConfig))

    expect(readStoredAIConfig()).toEqual(storedConfig)
  })

  it("falls back to the default config when missing or corrupted", () => {
    stubLocalStorage(null)
    expect(readStoredAIConfig()).toEqual(DEFAULT_AI_CONFIG)

    stubLocalStorage("{not json")
    expect(readStoredAIConfig()).toEqual(DEFAULT_AI_CONFIG)
  })
})

describe("aiConfigHeader", () => {
  it("serializes the explicit config into x-ai-config", () => {
    expect(aiConfigHeader(storedConfig)).toEqual({
      "x-ai-config": JSON.stringify(storedConfig),
    })
  })

  it("reads the stored config when none is passed", () => {
    stubLocalStorage(JSON.stringify(storedConfig))

    expect(aiConfigHeader()).toEqual({
      "x-ai-config": JSON.stringify(storedConfig),
    })
  })
})

describe("postAI", () => {
  it("POSTs JSON with the config header and returns the parsed body", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ advice: "ok" }), { status: 200 }),
    ) as unknown as typeof fetch

    const result = await postAI<{ advice: string }>(
      "/api/ai/advice",
      { hello: 1 },
      { aiConfig: storedConfig, fetchImpl },
    )

    expect(result).toEqual({ advice: "ok" })
    const [path, init] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(path).toBe("/api/ai/advice")
    expect(init.method).toBe("POST")
    expect(init.headers["Content-Type"]).toBe("application/json")
    expect(init.headers["x-ai-config"]).toBe(JSON.stringify(storedConfig))
    expect(init.body).toBe(JSON.stringify({ hello: 1 }))
  })

  it("passes AbortSignal through to fetch", async () => {
    const controller = new AbortController()
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ advice: "ok" }), { status: 200 }),
    ) as unknown as typeof fetch

    await postAI("/api/ai/advice", {}, {
      aiConfig: storedConfig,
      fetchImpl,
      signal: controller.signal,
    })

    const [, init] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(init.signal).toBe(controller.signal)
  })

  it("propagates fetch rejections without wrapping them", async () => {
    const networkError = new TypeError("fetch failed")
    const fetchImpl = vi.fn(async () => {
      throw networkError
    }) as unknown as typeof fetch

    const error = await postAI("/api/ai/advice", {}, {
      aiConfig: storedConfig,
      fetchImpl,
    }).catch((caught) => caught)

    expect(error).toBe(networkError)
  })

  it("throws AIRequestError with the server message on non-2xx", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ error: "模型未配置" }), { status: 400 }),
    ) as unknown as typeof fetch

    const error = (await postAI("/api/ai/advice", {}, {
      aiConfig: storedConfig,
      fetchImpl,
    }).catch((caught) => caught)) as AIRequestError

    expect(error).toBeInstanceOf(AIRequestError)
    expect(error.status).toBe(400)
    expect(error.message).toBe("模型未配置")
    expect(error.payload).toEqual({ error: "模型未配置" })
  })

  it("falls back to a generic message when the error body is not JSON", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response("boom", { status: 502 }),
    ) as unknown as typeof fetch

    const error = (await postAI("/api/ai/advice", {}, {
      aiConfig: storedConfig,
      fetchImpl,
    }).catch((caught) => caught)) as AIRequestError

    expect(error).toBeInstanceOf(AIRequestError)
    expect(error.message).toBe("AI 请求失败 (502)")
    expect(error.payload).toBeNull()
  })
})

describe("postAIStream", () => {
  it("returns the raw response for stream consumers", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response("chunk", { status: 200 }),
    ) as unknown as typeof fetch

    const response = await postAIStream("/api/ai/advice-stream", {}, {
      aiConfig: storedConfig,
      fetchImpl,
    })

    expect(response.status).toBe(200)
    expect(await response.text()).toBe("chunk")
  })
})
