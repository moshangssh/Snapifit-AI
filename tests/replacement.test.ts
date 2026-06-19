import { describe, expect, it } from "vitest"
import { STRENGTH_EXERCISES } from "@/lib/workout/engine/catalog"
import { classifyASRisk, filterASSafe } from "@/lib/workout/engine/as-safety"
import { findReplacement } from "@/lib/workout/engine/replacement"

describe("exercise replacement", () => {
  it("falls back to intermediate variants when the novice core pool is exhausted", () => {
    const original = STRENGTH_EXERCISES.find(
      (exercise) =>
        exercise.tags.includes("NOVICE_CORE") &&
        exercise.primaryMuscle === "CHEST" &&
        exercise.mechanics === "COMPOUND" &&
        exercise.equipment === "MACHINE",
    )
    const noviceCore = STRENGTH_EXERCISES.filter((exercise) =>
      exercise.tags.includes("NOVICE_CORE"),
    )
    const exhaustedNoviceChestCompounds = noviceCore
      .filter(
        (exercise) =>
          exercise.primaryMuscle === original?.primaryMuscle &&
          exercise.mechanics === original?.mechanics,
      )
      .map((exercise) => exercise.id)

    expect(original).toBeTruthy()

    const replacement = original
      ? findReplacement(original, noviceCore, exhaustedNoviceChestCompounds)
      : undefined

    expect(replacement?.primaryMuscle).toBe(original?.primaryMuscle)
    expect(replacement?.mechanics).toBe(original?.mechanics)
    expect(replacement?.tags).toContain("INTERMEDIATE_VARIANT")
  })

  it("never falls back to an AS-locked movement when categories stay locked", () => {
    // 真实场景：器械肩推举是新手核心池里唯一的 SHOULDERS+COMPOUND 动作。
    // 它的唯一安全替代（杠铃片前平举驱动）一旦被用户拉黑，fallback 池里就只剩
    // 坐姿哑铃推举——一个过顶推举（overhead_press）。AS 安全锁必须挡住它。
    const original = STRENGTH_EXERCISES.find(
      (exercise) =>
        exercise.tags.includes("NOVICE_CORE") &&
        exercise.primaryMuscle === "SHOULDERS" &&
        exercise.mechanics === "COMPOUND" &&
        exercise.equipment === "MACHINE",
    )
    expect(original).toBeTruthy()

    // 调用方按 novice-engine.ts 的方式构建“默认锁定”的 AS 安全核心池。
    const asSafeNovicePool = filterASSafe(
      STRENGTH_EXERCISES.filter((exercise) =>
        exercise.tags.includes("NOVICE_CORE"),
      ),
      [],
    )

    // 模拟用户已拉黑该肌群/机制下所有 AS 安全的同类动作，逼出风险 fallback。
    const blockedSafeAlternatives = STRENGTH_EXERCISES.filter(
      (exercise) =>
        exercise.primaryMuscle === original?.primaryMuscle &&
        exercise.mechanics === original?.mechanics &&
        classifyASRisk(exercise) === null,
    ).map((exercise) => exercise.id)

    const replacement = original
      ? findReplacement(original, asSafeNovicePool, blockedSafeAlternatives, [])
      : undefined

    // 默认锁定下，宁可不替换也不得返回 AS 风险动作（undefined 是安全结果）。
    expect(replacement ? classifyASRisk(replacement) : null).toBeNull()
  })

  it("allows an unlocked risk category to surface in the fallback", () => {
    const original = STRENGTH_EXERCISES.find(
      (exercise) =>
        exercise.tags.includes("NOVICE_CORE") &&
        exercise.primaryMuscle === "SHOULDERS" &&
        exercise.mechanics === "COMPOUND" &&
        exercise.equipment === "MACHINE",
    )
    expect(original).toBeTruthy()

    const asSafeNovicePool = filterASSafe(
      STRENGTH_EXERCISES.filter((exercise) =>
        exercise.tags.includes("NOVICE_CORE"),
      ),
      ["overhead_press"],
    )

    // 同样屏蔽安全替代，使可选项仅剩风险动作——只有解锁后它才应出现。
    const blockedSafeAlternatives = STRENGTH_EXERCISES.filter(
      (exercise) =>
        exercise.primaryMuscle === original?.primaryMuscle &&
        exercise.mechanics === original?.mechanics &&
        classifyASRisk(exercise) === null,
    ).map((exercise) => exercise.id)

    const replacement = original
      ? findReplacement(original, asSafeNovicePool, blockedSafeAlternatives, [
          "overhead_press",
        ])
      : undefined

    // 解锁过顶按压后，过顶推举重新成为合法替换候选。
    expect(replacement?.primaryMuscle).toBe("SHOULDERS")
    expect(classifyASRisk(replacement!)).toBe("overhead_press")
  })
})
