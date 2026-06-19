import { describe, expect, it } from "vitest"
import { STRENGTH_EXERCISES, type Exercise } from "@/lib/workout/engine/catalog"
import {
  AS_RISK_CATEGORIES,
  classifyASRisk,
  filterASSafe,
  isASSafe,
} from "@/lib/workout/engine/as-safety"

function byName(name: string): Exercise {
  const exercise = STRENGTH_EXERCISES.find((item) => item.name === name)
  if (!exercise) throw new Error(`Unknown exercise: ${name}`)
  return exercise
}

describe("AS safety classification", () => {
  it("classifies barbell squat/hinge/standing calf raise as axial lower-body risk", () => {
    expect(classifyASRisk(byName("杠铃深蹲"))).toBe("axial_loaded_lower")
    expect(classifyASRisk(byName("缺口硬拉"))).toBe("axial_loaded_lower")
    // 站姿杠铃提踵：杠铃扛于上背，与深蹲同为脊柱轴向压缩
    expect(classifyASRisk(byName("杠铃提踵"))).toBe("axial_loaded_lower")
  })

  it("classifies barbell/dumbbell overhead press as overhead-press risk", () => {
    expect(classifyASRisk(byName("杠铃推举"))).toBe("overhead_press")
    expect(classifyASRisk(byName("坐姿哑铃推举"))).toBe("overhead_press")
  })

  it("classifies barbell explosive compound lifts (杠铃台阶上步) as olympic risk", () => {
    // movementPattern=compound + equipment=BARBELL → olympic_lift, locked by default.
    // (#51 removed 抓举/Snatch from the catalog; the structural rule still covers any
    // such lift — 杠铃台阶上步 carries the exact tags 抓举 had.)
    expect(classifyASRisk(byName("杠铃台阶上步"))).toBe("olympic_lift")
  })

  it("treats machine/neutral movements as inherently safe", () => {
    expect(classifyASRisk(byName("器械肩推举"))).toBeNull()
    expect(classifyASRisk(byName("窄距45度腿举"))).toBeNull()
  })

  it("locks risk movements by default but allows them once unlocked", () => {
    const squat = byName("杠铃深蹲")

    expect(isASSafe(squat)).toBe(false)
    expect(isASSafe(squat, ["axial_loaded_lower"])).toBe(true)
    expect(isASSafe(squat, ["overhead_press"])).toBe(false)
  })

  it("filters the full strength pool down to AS-safe movements by default", () => {
    const safe = filterASSafe(STRENGTH_EXERCISES)

    expect(safe.every((exercise) => classifyASRisk(exercise) === null)).toBe(true)
    expect(safe.length).toBeLessThan(STRENGTH_EXERCISES.length)
    expect(AS_RISK_CATEGORIES).toContain("axial_loaded_lower")
  })
})
