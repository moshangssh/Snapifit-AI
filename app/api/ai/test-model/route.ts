import { generateText } from "ai"
import type { ModelConfig } from "@/lib/types"
import { createAIClient, validateModelConfig } from "@/lib/ai/client"
import { handleAIError } from "@/lib/ai/errors"

export async function POST(req: Request) {
  try {
    const { modelConfig, modelType } = (await req.json()) as {
      modelConfig: ModelConfig
      modelType?: "agentModel" | "chatModel" | "visionModel"
    }
    validateModelConfig(modelConfig)

    let testPrompt = "Hello, this is a test message. Please respond with 'Test successful'."
    if (modelType === "visionModel") {
      testPrompt =
        "This is a test for vision model text capabilities. Please respond with 'Vision model test successful'."
    } else if (modelType === "agentModel") {
      testPrompt = "This is a test for agent model. Please respond with 'Agent model test successful'."
    } else if (modelType === "chatModel") {
      testPrompt = "This is a test for chat model. Please respond with 'Chat model test successful'."
    }

    const { text } = await generateText({
      model: createAIClient(modelConfig),
      prompt: testPrompt,
    })

    if (text && text.toLowerCase().includes("test successful")) {
      return Response.json({ success: true, message: "Model test successful" })
    }
    return Response.json({
      success: true,
      message: "Model responded but with unexpected content",
      response: text,
    })
  } catch (error) {
    return handleAIError(error)
  }
}
