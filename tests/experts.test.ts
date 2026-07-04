import { describe, expect, it } from "vitest"
import {
  DEFAULT_EXPERT_ID,
  EXPERT_ROLES,
  expertDisplayName,
  getExpertRole,
} from "@/lib/ai/experts"

describe("expert roles module", () => {
  it("defines six experts with unique ids and complete copy", () => {
    expect(EXPERT_ROLES).toHaveLength(6)
    expect(new Set(EXPERT_ROLES.map((expert) => expert.id)).size).toBe(6)
    for (const expert of EXPERT_ROLES) {
      expect(expert.name.length).toBeGreaterThan(0)
      expect(expert.title.length).toBeGreaterThan(0)
      expect(expert.systemPrompt).toContain("[MEMORY_UPDATE_REQUEST]")
      expect(expert.welcomeMessage.title.length).toBeGreaterThan(0)
    }
  })

  it("resolves the selected expert and falls back to the default", () => {
    expect(getExpertRole("metabolism").name).toBe("代谢专家")
    expect(getExpertRole("no-such-expert").id).toBe(DEFAULT_EXPERT_ID)
    expect(getExpertRole(undefined).id).toBe(DEFAULT_EXPERT_ID)
  })

  it("maps every expert id to its display name and echoes unknown ids", () => {
    for (const expert of EXPERT_ROLES) {
      expect(expertDisplayName(expert.id)).toBe(expert.name)
    }
    expect(expertDisplayName("mystery")).toBe("mystery")
  })
})
