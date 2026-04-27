import { describe, expect, it } from "vitest"
import {
  createExportedHealthData,
  normalizeImportedHealthData,
} from "@/lib/health-data-export"

describe("health data export format", () => {
  it("creates v2 export data with all health stores", () => {
    const exported = createExportedHealthData({
      userProfile: { weight: 70 },
      aiConfig: { agentModel: { name: "m", baseUrl: "u", apiKey: "k" } },
      stores: {
        healthLogs: { "2026-04-23": { date: "2026-04-23" } },
        aiMemories: { coach: { content: "remember" } },
        workoutSessions: { s1: { sessionId: "s1" } },
        workoutSessionMeta: { singleton: { activeSessionId: "s1" } },
      },
      exportedAt: "2026-04-27T00:00:00.000Z",
    })

    expect(exported.version).toBe(2)
    expect(Object.keys(exported.stores)).toEqual([
      "healthLogs",
      "aiMemories",
      "workoutSessions",
      "workoutSessionMeta",
    ])
  })

  it("normalizes legacy export data without deleting workout stores", () => {
    const normalized = normalizeImportedHealthData({
      userProfile: { weight: 72 },
      aiConfig: { agentModel: { name: "m" } },
      healthLogs: { "2026-04-23": { date: "2026-04-23" } },
      aiMemories: { coach: { content: "legacy" } },
    })

    expect(normalized.userProfile).toEqual({ weight: 72 })
    expect(normalized.stores.healthLogs).toEqual({
      "2026-04-23": { date: "2026-04-23" },
    })
    expect(normalized.stores.aiMemories).toEqual({
      coach: { content: "legacy" },
    })
    expect(normalized.stores.workoutSessions).toBeUndefined()
    expect(normalized.stores.workoutSessionMeta).toBeUndefined()
  })
})
