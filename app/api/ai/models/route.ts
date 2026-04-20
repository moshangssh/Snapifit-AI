import { handleAIError, AIError } from "@/lib/ai/errors"
import type { OpenAIModelList } from "@/lib/ai/types"

export async function POST(req: Request) {
  try {
    const { baseUrl, apiKey } = await req.json()
    if (!baseUrl || !apiKey) {
      throw new AIError("INVALID_INPUT", "Base URL and API Key are required")
    }

    const normalizedBase = baseUrl.endsWith("/v1")
      ? baseUrl.slice(0, -3)
      : baseUrl.endsWith("/")
      ? baseUrl.slice(0, -1)
      : baseUrl

    const url = `${normalizedBase}/v1/models`
    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new AIError(
        "UPSTREAM_ERROR",
        `Failed to fetch models: ${response.status} ${response.statusText} - ${errorText}`,
      )
    }

    const result = (await response.json()) as OpenAIModelList
    return Response.json(result)
  } catch (error) {
    return handleAIError(error)
  }
}
