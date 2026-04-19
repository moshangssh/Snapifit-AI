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
