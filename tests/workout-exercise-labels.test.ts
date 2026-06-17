import { describe, expect, it } from "vitest"
import { getWorkoutExerciseLabels } from "@/lib/workout/exercise-labels"

describe("workout exercise labels", () => {
  it("derives AS label for stored sessions created before labels existed", () => {
    expect(
      getWorkoutExerciseLabels({
        catalogExerciseId: "08cde7c0-5988-4190-b12b-b0b565d113f6",
      }),
    ).toEqual(["AS"])
  })

  it("does not duplicate AS labels", () => {
    expect(
      getWorkoutExerciseLabels({
        catalogExerciseId: "08cde7c0-5988-4190-b12b-b0b565d113f6",
        labels: ["AS"],
      }),
    ).toEqual(["AS"])
  })
})
