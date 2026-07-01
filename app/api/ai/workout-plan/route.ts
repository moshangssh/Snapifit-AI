import { AIError, handleAIError } from "@/lib/ai/errors"
import { planWorkout, type PlanWorkoutResult } from "@/lib/workout/prescription"

function insufficientHistoryMessage(
  result: Extract<PlanWorkoutResult, { kind: "insufficientHistory" }>,
): string {
  if (result.nextPhase === "advanced") {
    return `进阶阶段基准动作候选不足：需要至少 ${result.required} 个候选动作，当前只有 ${result.have} 个。请继续中级训练以积累更多动作数据。`
  }

  return `基准动作候选不足：需要至少覆盖 ${result.required} 个训练组（胸/背/肩/腿/臂/核心），当前只训练了 ${result.have} 个训练组。请继续新手训练。`
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      effectiveUserWeightKg,
      userProfile,
      fatigueSnapshot,
      trainingState,
      recentWorkoutSessionSummaries,
    } = body

    if (
      typeof effectiveUserWeightKg !== "number" ||
      effectiveUserWeightKg <= 0 ||
      !userProfile ||
      !fatigueSnapshot
    ) {
      throw new AIError("INVALID_INPUT", "Invalid workout plan input")
    }

    const result = planWorkout({
      effectiveUserWeightKg,
      fatigueSnapshot,
      trainingState,
      recentWorkoutSessionSummaries,
    })

    switch (result.kind) {
      case "prescription":
        // plan 自带 sessionAudit / microcycleAudit 审计快照
        return Response.json(result.plan)
      case "needBenchmarkSelection":
        return Response.json({
          needBenchmarkSelection: true,
          nextPhase: result.nextPhase,
          reason: result.reason,
          benchmarkCandidates: result.candidates,
          trainingState: result.trainingState,
        })
      case "insufficientHistory":
        throw new AIError(
          "INSUFFICIENT_TRAINING_HISTORY",
          insufficientHistoryMessage(result),
        )
    }
  } catch (error) {
    return handleAIError(error)
  }
}
