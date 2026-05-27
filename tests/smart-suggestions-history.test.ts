import { describe, expect, it } from "vitest"
import {
  formatSmartSuggestionsAge,
  formatSmartSuggestionsDate,
  resolvePeriodSmartAnalysisForDate,
  resolveSmartSuggestionsForDate,
} from "@/lib/smart-suggestions-history"
import type {
  PeriodSmartAnalysisResponse,
  SmartSuggestionsResponse,
} from "@/lib/types"

function suggestionsFor(date: string): SmartSuggestionsResponse {
  return {
    dataDate: date,
    generatedAt: `${date}T08:00:00.000Z`,
    suggestions: [
      {
        key: "nutrition",
        category: "营养建议",
        priority: "medium",
        summary: "保持当前节奏",
        suggestions: [
          {
            title: "补足蛋白质",
            description: "晚餐增加优质蛋白。",
            actionable: true,
            icon: "🥗",
          },
        ],
      },
    ],
  }
}

function periodAnalysisFor(
  range: "7d" | "30d",
  startDate: string,
  endDate: string,
): PeriodSmartAnalysisResponse {
  return {
    range,
    startDate,
    endDate,
    generatedAt: `${endDate}T08:00:00.000Z`,
    dataDays: range === "7d" ? 5 : 20,
    minDataDays: range === "7d" ? 3 : 14,
    summary: "周期表现稳定。",
    highlights: ["执行稳定"],
    risks: ["晚餐偏晚"],
    suggestions: [
      {
        key: "period-nutrition",
        category: "周期营养复盘",
        priority: "medium",
        summary: "继续保持。",
        suggestions: [
          {
            title: "提前安排晚餐",
            description: "尽量在训练后两小时内完成晚餐。",
            actionable: true,
            icon: "🥗",
          },
        ],
      },
    ],
  }
}

describe("smart suggestions history", () => {
  it("prefers current-day suggestions when available", () => {
    const resolved = resolveSmartSuggestionsForDate(
      {
        "2026-05-21": suggestionsFor("2026-05-21"),
        "2026-05-22": suggestionsFor("2026-05-22"),
      },
      "2026-05-22",
    )

    expect(resolved?.date).toBe("2026-05-22")
    expect(resolved?.daysAgo).toBe(0)
  })

  it("falls back to the nearest previous day with generated suggestions", () => {
    const resolved = resolveSmartSuggestionsForDate(
      {
        "2026-05-19": suggestionsFor("2026-05-19"),
        "2026-05-21": suggestionsFor("2026-05-21"),
      },
      "2026-05-23",
    )

    expect(resolved?.date).toBe("2026-05-21")
    expect(resolved?.daysAgo).toBe(2)
  })

  it("ignores future, empty, and invalid suggestion records", () => {
    const resolved = resolveSmartSuggestionsForDate(
      {
        "2026-05-24": suggestionsFor("2026-05-24"),
        "2026-05-22": { ...suggestionsFor("2026-05-22"), suggestions: [] },
        invalid: suggestionsFor("2026-05-21"),
        "2026-05-20": suggestionsFor("2026-05-20"),
      },
      "2026-05-23",
    )

    expect(resolved?.date).toBe("2026-05-20")
    expect(resolved?.daysAgo).toBe(3)
  })

  it("formats recency labels for today, yesterday, the day before, and older records", () => {
    expect(formatSmartSuggestionsAge(0)).toBe("今日")
    expect(formatSmartSuggestionsAge(1)).toBe("昨日")
    expect(formatSmartSuggestionsAge(2)).toBe("前日")
    expect(formatSmartSuggestionsAge(5)).toBe("5天前")
  })

  it("formats date keys without shifting across time zones", () => {
    expect(formatSmartSuggestionsDate("2026-05-01")).toContain("2026")
    expect(formatSmartSuggestionsDate("2026-05-01")).toContain("5")
    expect(formatSmartSuggestionsDate("2026-05-01")).toContain("1")
  })

  it("prefers current period analysis when available", () => {
    const resolved = resolvePeriodSmartAnalysisForDate(
      {
        "7d:2026-05-21": periodAnalysisFor("7d", "2026-05-15", "2026-05-21"),
        "7d:2026-05-23": periodAnalysisFor("7d", "2026-05-17", "2026-05-23"),
      },
      "7d",
      "2026-05-23",
    )

    expect(resolved?.endDate).toBe("2026-05-23")
    expect(resolved?.daysAgo).toBe(0)
  })

  it("falls back to the nearest previous period analysis in the same range", () => {
    const resolved = resolvePeriodSmartAnalysisForDate(
      {
        "7d:2026-05-19": periodAnalysisFor("7d", "2026-05-13", "2026-05-19"),
        "7d:2026-05-21": periodAnalysisFor("7d", "2026-05-15", "2026-05-21"),
        "30d:2026-05-22": periodAnalysisFor("30d", "2026-04-23", "2026-05-22"),
      },
      "7d",
      "2026-05-23",
    )

    expect(resolved?.endDate).toBe("2026-05-21")
    expect(resolved?.daysAgo).toBe(2)
    expect(resolved?.analysis.range).toBe("7d")
  })

  it("ignores future, empty, mismatched range, and mismatched key records for periods", () => {
    const resolved = resolvePeriodSmartAnalysisForDate(
      {
        "7d:2026-05-24": periodAnalysisFor("7d", "2026-05-18", "2026-05-24"),
        "7d:2026-05-22": {
          ...periodAnalysisFor("7d", "2026-05-16", "2026-05-22"),
          suggestions: [],
        },
        "7d:2026-05-21": periodAnalysisFor("30d", "2026-04-22", "2026-05-21"),
        "7d:2026-05-20": periodAnalysisFor("7d", "2026-05-13", "2026-05-19"),
        "7d:2026-05-18": periodAnalysisFor("7d", "2026-05-12", "2026-05-18"),
      },
      "7d",
      "2026-05-23",
    )

    expect(resolved?.endDate).toBe("2026-05-18")
    expect(resolved?.daysAgo).toBe(5)
  })
})
