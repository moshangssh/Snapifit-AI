import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { WhatCanIEatCard } from "@/components/what-can-i-eat-card"
import type {
  DailyLog,
  MealPlanBudgetSnapshot,
  MealPlanSuggestion,
  UserProfile,
} from "@/lib/types"

const budgetSnapshot: MealPlanBudgetSnapshot = {
  date: "2026-06-12",
  baselineExpenditure: 1800,
  recordedExerciseCalories: 0,
  targetCalories: 2000,
  consumedCalories: 1000,
  remainingCalories: 1000,
  macroTargets: { protein: 120, carbohydrates: 200, fat: 60 },
  remainingMacros: { protein: 60, carbohydrates: 100, fat: 30 },
  remainingMealSlots: ["dinner"],
  summaryText: "今天还可吃约 1000 kcal · 蛋白还差 60g · 脂肪还可约 30g",
}

const dailyLog = {
  date: "2026-06-12",
  foodEntries: [],
  exerciseEntries: [],
  summary: {
    totalCaloriesConsumed: 1000,
    totalCaloriesBurned: 0,
    macros: { carbs: 100, protein: 60, fat: 30 },
    micronutrients: {},
  },
} as unknown as DailyLog

const userProfile = {
  weight: 70,
  height: 175,
  age: 30,
  gender: "male",
  activityLevel: "moderate",
  goal: "maintain",
} as unknown as UserProfile

function makeSuggestion(
  overrides: Partial<MealPlanSuggestion> = {},
): MealPlanSuggestion {
  return {
    generatedAt: "2026-06-12T12:00:00.000Z",
    inputPreference: "",
    budgetSnapshot,
    summary: "今天先把晚餐定下来,加餐余量晚点再说。",
    items: [
      {
        title: "鸡胸藜麦碗",
        kind: "combo",
        foods: ["鸡胸肉", "藜麦", "西兰花"],
        portionHint: "鸡胸 120g + 藜麦 80g",
        bestFor: "稳妥正餐",
        nutrition: { calories: 520, protein: 48, carbohydrates: 45, fat: 12 },
        isProteinPick: true,
      },
      {
        title: "牛肉汤面",
        kind: "single",
        foods: ["牛肉汤面"],
        portionHint: "1 碗",
        bestFor: "想吃热汤",
        nutrition: { calories: 600, protein: 24, carbohydrates: 78, fat: 16 },
      },
      {
        title: "三文鱼饭团套餐",
        kind: "combo",
        foods: ["三文鱼饭团", "味噌汤"],
        portionHint: "饭团 2 个 + 味噌汤 1 碗",
        bestFor: "日料口味",
        nutrition: { calories: 560, protein: 30, carbohydrates: 70, fat: 14 },
      },
    ],
    ...overrides,
  }
}

function render(node: Parameters<typeof renderToStaticMarkup>[0]) {
  return renderToStaticMarkup(node)
}

describe("WhatCanIEatCard", () => {
  const baseProps = {
    dailyLog,
    userProfile,
    budgetSnapshot,
    workbenchHref: "/workbench?date=2026-06-12",
    onSuggestionSave: () => {},
  }

  it("renders the empty-state hint and no eating options before a suggestion exists", () => {
    const html = render(<WhatCanIEatCard {...baseProps} />)

    expect(html).toContain("今天还能吃什么")
    expect(html).toContain("给你 3 种吃法，挑一种")
    expect(html).not.toContain("鸡胸藜麦碗")
    expect(html).not.toContain("补蛋白之选")
  })

  it("renders exactly the suggested eating options with calories and protein", () => {
    const html = render(
      <WhatCanIEatCard {...baseProps} suggestion={makeSuggestion()} />,
    )

    expect(html).toContain("鸡胸藜麦碗")
    expect(html).toContain("牛肉汤面")
    expect(html).toContain("三文鱼饭团套餐")
    expect(html).toContain("520 kcal")
    expect(html).toContain("蛋白 48g")
    // combo / single 标签分别渲染
    expect(html).toContain("组合")
    expect(html).toContain("单点")
    // 食材列表用 / 连接
    expect(html).toContain("鸡胸肉 / 藜麦 / 西兰花")
  })

  it("renders the protein-pick badge only on the server-marked item", () => {
    const html = render(
      <WhatCanIEatCard {...baseProps} suggestion={makeSuggestion()} />,
    )
    const badgeMatches = html.match(/补蛋白之选/g) ?? []

    expect(badgeMatches).toHaveLength(1)
  })

  it("omits the protein-pick badge when no item is marked", () => {
    const suggestion = makeSuggestion()
    const html = render(
      <WhatCanIEatCard
        {...baseProps}
        suggestion={{
          ...suggestion,
          items: suggestion.items.map(({ isProteinPick: _drop, ...item }) => item),
        }}
      />,
    )

    expect(html).not.toContain("补蛋白之选")
  })

  it("renders an over-budget warning and the estimate disclaimer", () => {
    const suggestion = makeSuggestion()
    const html = render(
      <WhatCanIEatCard
        {...baseProps}
        suggestion={{
          ...suggestion,
          items: suggestion.items.map((item, index) =>
            index === 1
              ? {
                  ...item,
                  slightlyOverBudget: true,
                  warning: "这个吃法可能超过今日剩余额度(1050 kcal),记录前请确认份量。",
                }
              : item,
          ),
        }}
      />,
    )

    expect(html).toContain("可能超过今日剩余额度")
    expect(html).toContain("营养值为 AI 估算")
    expect(html).toContain("记录前请在工作台确认份量")
  })

  it("caps the rendered list at three options even if more are returned", () => {
    const suggestion = makeSuggestion()
    const html = render(
      <WhatCanIEatCard
        {...baseProps}
        suggestion={{
          ...suggestion,
          items: [
            ...suggestion.items,
            {
              title: "不该出现的第四条",
              kind: "single",
              foods: ["多余项"],
              portionHint: "1 份",
              bestFor: "超量",
              nutrition: { calories: 400, protein: 20, carbohydrates: 40, fat: 10 },
            },
          ],
        }}
      />,
    )

    expect(html).not.toContain("不该出现的第四条")
  })

  it("links the record action to the provided workbench href", () => {
    const html = render(
      <WhatCanIEatCard
        {...baseProps}
        workbenchHref="/workbench?date=2026-06-12"
      />,
    )

    expect(html).toContain('href="/workbench?date=2026-06-12"')
  })
})
