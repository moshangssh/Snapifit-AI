import type { AIConfig } from "@/lib/types"

/** localStorage 中 AI 配置的存储键,与 settings 页面的 useLocalStorage 一致。 */
const AI_CONFIG_STORAGE_KEY = "aiConfig"

export const DEFAULT_AI_CONFIG: AIConfig = {
  agentModel: { name: "gpt-4o", baseUrl: "https://api.openai.com", apiKey: "" },
  chatModel: { name: "gpt-4o", baseUrl: "https://api.openai.com", apiKey: "" },
  visionModel: { name: "gpt-4o", baseUrl: "https://api.openai.com", apiKey: "" },
}

/**
 * 读取 localStorage 里的 AI 配置(与 useLocalStorage("aiConfig") 同源)。
 * SSR、无存储或损坏数据时回退到默认配置。
 */
export function readStoredAIConfig(): AIConfig {
  if (typeof window === "undefined") return DEFAULT_AI_CONFIG

  try {
    const raw = window.localStorage.getItem(AI_CONFIG_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AIConfig) : DEFAULT_AI_CONFIG
  } catch {
    return DEFAULT_AI_CONFIG
  }
}

/**
 * x-ai-config 传输约定的客户端单点,与服务端 extractAIConfig 对称。
 * 不传 aiConfig 时自动读取存储的配置。
 */
export function aiConfigHeader(aiConfig?: AIConfig): Record<string, string> {
  return { "x-ai-config": JSON.stringify(aiConfig ?? readStoredAIConfig()) }
}

/** 非 2xx 响应的统一错误模式:带状态码与服务端返回的 payload。 */
export class AIRequestError extends Error {
  readonly status: number
  readonly payload: unknown

  constructor(status: number, payload: unknown) {
    const fromPayload =
      payload && typeof payload === "object"
        ? ((payload as { message?: unknown; error?: unknown }).message ??
          (payload as { message?: unknown; error?: unknown }).error)
        : undefined
    super(typeof fromPayload === "string" ? fromPayload : `AI 请求失败 (${status})`)
    this.name = "AIRequestError"
    this.status = status
    this.payload = payload
  }
}

/** postAI 需要的最小 fetch 形状,兼容全局 fetch 与注入的实现。 */
export type AIFetchLike = (
  input: string,
  init?: RequestInit,
) => Promise<Response>

export interface PostAIOptions {
  /** 显式指定配置(如队列任务里入队时捕获的配置);缺省读当前存储。 */
  aiConfig?: AIConfig
  signal?: AbortSignal
  /** 可注入的 fetch 实现,供测试与后台任务使用。 */
  fetchImpl?: AIFetchLike
}

/**
 * 调一个 AI 能力(流式):POST JSON + 自动附 x-ai-config,非 2xx 抛
 * AIRequestError,成功返回原始 Response 供调用方消费流。
 */
export async function postAIStream(
  path: string,
  body: unknown,
  options: PostAIOptions = {},
): Promise<Response> {
  const fetchImpl = options.fetchImpl ?? fetch
  const response = await fetchImpl(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...aiConfigHeader(options.aiConfig),
    },
    body: JSON.stringify(body),
    signal: options.signal,
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new AIRequestError(response.status, payload)
  }

  return response
}

/** 调一个 AI 能力(JSON):同 postAIStream,成功时解析并返回 JSON。 */
export async function postAI<T = unknown>(
  path: string,
  body: unknown,
  options: PostAIOptions = {},
): Promise<T> {
  const response = await postAIStream(path, body, options)
  return (await response.json()) as T
}
