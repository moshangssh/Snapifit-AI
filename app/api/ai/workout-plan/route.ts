import { AIError, handleAIError } from "@/lib/ai/errors"
import {
  detectPhaseTransition,
  generateSession,
} from "@/lib/workout/engine/adaptive-engine"
import { getBenchmarkCandidateDetails } from "@/lib/workout/engine/benchmark-selection"
import { STRENGTH_EXERCISES } from "@/lib/workout/engine/catalog"
import {
  normalizeTrainingState,
} from "@/lib/workout/engine/training-state"

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

    const normalizedTrainingState = normalizeTrainingState(trainingState)
    const phaseTransition = detectPhaseTransition(normalizedTrainingState)

    if (phaseTransition.phaseTransitionReady) {
      const candidatePool =
        phaseTransition.nextPhase === "advanced"
          ? STRENGTH_EXERCISES.filter((exercise) =>
              (normalizedTrainingState.benchmarkExerciseIds ?? []).includes(
                exercise.id,
              ),
            )
          : STRENGTH_EXERCISES
      const benchmarkCandidates = getBenchmarkCandidateDetails(
        recentWorkoutSessionSummaries ?? [],
        candidatePool,
      )

      if (phaseTransition.nextPhase === "intermediate") {
        // 验证候选质量：至少要有 6 个训练组覆盖，且有实际训练记录
        const trainedCandidates = benchmarkCandidates.filter(
          (candidate) => candidate.trainingCount > 0,
        )
        const trainedGroups = new Set(
          trainedCandidates.map((candidate) => candidate.trainingGroup),
        )

        if (trainedGroups.size < 6) {
          throw new AIError(
            "INSUFFICIENT_TRAINING_HISTORY",
            `基准动作候选不足：需要至少覆盖 6 个训练组（胸/背/肩/腿/臂/核心），当前只训练了 ${trainedGroups.size} 个训练组。请继续新手训练。`,
          )
        }
      }

      return Response.json({
        needBenchmarkSelection: true,
        nextPhase: phaseTransition.nextPhase,
        reason: phaseTransition.reason,
        benchmarkCandidates,
        trainingState: {
          ...normalizedTrainingState,
          phaseTransitionReady: true,
          // 清除已完成的手动降级记录
          manualDowngrade: undefined,
        },
      })
    }

    return Response.json(
      generateSession(normalizedTrainingState, {
        effectiveUserWeightKg,
        recentWorkoutSessionSummaries: recentWorkoutSessionSummaries ?? [],
        fatigueSnapshot,
      }),
    )
  } catch (error) {
    return handleAIError(error)
  }
}
