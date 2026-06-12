import { describe, expect, it } from "vitest"

import {
  findRecentWeightSource,
  formatRecentWeightSourceLabel,
  formatWeightSource,
} from "@/lib/weight-display"

describe("weight display labels", () => {
  const selectedDate = new Date("2026-05-24T12:00:00+08:00")

  it("labels recent logged weights relative to the selected date", () => {
    expect(formatRecentWeightSourceLabel("2026-05-23", selectedDate)).toBe("昨日")
    expect(formatRecentWeightSourceLabel("2026-05-22", selectedDate)).toBe("前日")
    expect(formatRecentWeightSourceLabel("2026-05-21", selectedDate)).toBe("3天前")
    expect(formatRecentWeightSourceLabel("2026-05-19", selectedDate)).toBe("5天前")
  })

  it("uses the concrete date once the logged weight is older than six days", () => {
    expect(formatRecentWeightSourceLabel("2026-05-17", selectedDate)).toBe(
      "2026-05-17",
    )
  })

  it("formats the source label with the logged weight", () => {
    expect(
      formatWeightSource(
        { date: "2026-05-23", weight: 71.2 },
        selectedDate,
      ),
    ).toBe("昨日 71.2 kg")
  })

  it("finds the nearest valid logged weight before the selected date", async () => {
    const logs = new Map([
      ["2026-05-23", { weight: undefined }],
      ["2026-05-22", { weight: 0 }],
      ["2026-05-21", { weight: 70.4 }],
    ])

    await expect(
      findRecentWeightSource(selectedDate, 5, async (dateKey) => logs.get(dateKey) ?? null),
    ).resolves.toEqual({ date: "2026-05-21", weight: 70.4 })
  })
})
