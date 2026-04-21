# 人体肌肉疲劳热力图 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 SnapFit AI 主页右侧栏新增"今日恢复状态"卡片,根据过去 3 天的运动记录可视化各肌群的疲劳程度。

**Architecture:** AI 层用 prompt + Zod `transform` 把自由字符串 muscle_groups 收敛到 14 个英文枚举;hook 从 IndexedDB 读 3 天 DailyLog,通过纯函数 `computeMuscleFatigue` 算出每个肌群的 intensity/daysAgo/lastExercise,再喂给 `react-muscle-highlighter` 渲染前后 SVG;UI 用固定位置的 info bar 替代浮层 tooltip,兼容 hover 和 click。

**Tech Stack:** Next.js 15.2.4 · React 19 · TypeScript · Tailwind · shadcn/ui · next-intl · Zod · ai-sdk · **新依赖** `react-muscle-highlighter@^1.2.0`

**Spec:** `docs/superpowers/specs/2026-04-21-muscle-fatigue-heatmap-design.md`

---

## 测试策略说明

本仓库没有测试框架(package.json 无 test script、无 vitest/jest/testing-library),spec §11 明确**不引入测试基础设施**。因此本 plan 的每个 task 使用:

- **类型检查**:`npx tsc --noEmit` 作为每步后的快速验证护栏
- **纯函数保持可测结构**(T2 里写的 `computeMuscleFatigue` 是 pure,未来装 vitest 后可 1 行 import 直接测)
- **端到端手动验收**:T10 按 spec §11.3 清单逐项通过
- **AI 探索式验证**:T10 的"AI 合规率"采样

每个 task 自成 commit。commit 消息按项目既有风格:`feat(scope): ...` / `refactor(scope): ...` 等。

---

## 文件总览

**新增(4)**

| 文件 | 职责 |
|---|---|
| `lib/muscle-groups.ts` | 14 个 `MuscleKey` 枚举、前/后分组、`MUSCLE_KEY_SET` 运行时检查集合 |
| `lib/muscle-fatigue.ts` | 纯函数 `computeMuscleFatigue(logs)` + 相关类型 |
| `hooks/use-muscle-fatigue.ts` | 读 IndexedDB 过去 3 天 + 调用纯函数 + 状态管理 |
| `components/muscle-fatigue-card.tsx` | 右侧卡片 UI:前后 SVG + info bar + 空态 |

**修改(7)**

| 文件 | 改动位置 |
|---|---|
| `lib/ai/schemas/parse.ts` | 第 51 行 muscle_groups 定义改 transform |
| `app/api/ai/parse/route.ts` | 第 98、113 行 prompt 描述 + 示例英文化 |
| `app/api/ai/parse-image/route.ts` | 第 113、128 行 同上 |
| `app/api/ai/parse-with-images/route.ts` | 第 120、135 行 同上 |
| `messages/zh.json` | `dashboard` 命名空间下新增 `muscleFatigue` 子对象 |
| `messages/en.json` | 同上,值换英文 |
| `components/exercise-entry-card.tsx` | 第 170-172 行 肌肉群渲染改用 i18n label |
| `app/[locale]/page.tsx` | import + 右侧栏 space-y-8 div 末尾追加 `<MuscleFatigueCard/>` |

**依赖(+1)**:`react-muscle-highlighter`

---

## Task 1: 建立 MuscleKey 枚举基础层

**Files:**
- Create: `lib/muscle-groups.ts`

- [ ] **Step 1: 创建 `lib/muscle-groups.ts`**

```ts
export const MUSCLE_KEYS = [
  "chest",
  "abs",
  "obliques",
  "upper-back",
  "lower-back",
  "front-deltoids",
  "back-deltoids",
  "biceps",
  "triceps",
  "forearms",
  "quadriceps",
  "hamstrings",
  "glutes",
  "calves",
] as const

export type MuscleKey = typeof MUSCLE_KEYS[number]

export const MUSCLE_KEY_SET: ReadonlySet<string> = new Set(MUSCLE_KEYS)

export const FRONT_MUSCLES: readonly MuscleKey[] = [
  "chest",
  "abs",
  "obliques",
  "front-deltoids",
  "biceps",
  "forearms",
  "quadriceps",
]

export const BACK_MUSCLES: readonly MuscleKey[] = [
  "upper-back",
  "lower-back",
  "back-deltoids",
  "triceps",
  "glutes",
  "hamstrings",
  "calves",
]
```

- [ ] **Step 2: 类型检查**

Run: `npx tsc --noEmit`
Expected: 无错误(退出码 0,无输出)

- [ ] **Step 3: Commit**

```bash
git add lib/muscle-groups.ts
git commit -m "feat(muscle-fatigue): add canonical muscle group enum and front/back grouping"
```

---

## Task 2: 实现 `computeMuscleFatigue` 纯函数

**Files:**
- Create: `lib/muscle-fatigue.ts`

- [ ] **Step 1: 创建 `lib/muscle-fatigue.ts`**

```ts
import { MUSCLE_KEY_SET, type MuscleKey } from "@/lib/muscle-groups"
import type { DailyLog } from "@/lib/types"

export type FatigueState = {
  intensity: 0 | 30 | 60 | 100
  daysAgo: 0 | 1 | 2 | null
  lastExerciseName: string | null
}

export type MuscleFatigueMap = Partial<Record<MuscleKey, FatigueState>>

const INTENSITY_BY_DAYS: Record<0 | 1 | 2, 100 | 60 | 30> = {
  0: 100,
  1: 60,
  2: 30,
}

/**
 * logsByDaysAgo[0] = 基准日, [1] = 前一日, [2] = 前二日。
 * 日期由近到远遍历,同肌群首次命中即采用,实现"取最近一次"。
 * 忽略不在 MUSCLE_KEY_SET 中的旧数据(spec 决策 #8)。
 */
export function computeMuscleFatigue(
  logsByDaysAgo: Array<DailyLog | null>,
): MuscleFatigueMap {
  const result: MuscleFatigueMap = {}

  for (let daysAgo = 0; daysAgo <= 2; daysAgo++) {
    const log = logsByDaysAgo[daysAgo]
    if (!log?.exerciseEntries) continue

    for (const entry of log.exerciseEntries) {
      if (!entry.muscle_groups) continue
      for (const raw of entry.muscle_groups) {
        if (!MUSCLE_KEY_SET.has(raw)) continue
        const key = raw as MuscleKey
        if (result[key]) continue

        result[key] = {
          intensity: INTENSITY_BY_DAYS[daysAgo as 0 | 1 | 2],
          daysAgo: daysAgo as 0 | 1 | 2,
          lastExerciseName: entry.exercise_name,
        }
      }
    }
  }

  return result
}
```

- [ ] **Step 2: 类型检查**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add lib/muscle-fatigue.ts
git commit -m "feat(muscle-fatigue): add pure computeMuscleFatigue function"
```

---

## Task 3: Schema `transform` 过滤非法 muscle_groups

**Files:**
- Modify: `lib/ai/schemas/parse.ts:51`

- [ ] **Step 1: 在文件顶部添加 import**

在 `lib/ai/schemas/parse.ts` 第 1-2 行(现有 `import { z }` 和 `import { v4 as uuidv4 }` 下方)插入:

```ts
import { MUSCLE_KEYS, MUSCLE_KEY_SET } from "@/lib/muscle-groups"
```

- [ ] **Step 2: 修改 muscle_groups 定义**

在 `lib/ai/schemas/parse.ts` 中找到:

```ts
      muscle_groups: z.array(z.string()).optional(),
```

替换为:

```ts
      muscle_groups: z
        .array(z.string())
        .optional()
        .transform(arr =>
          arr?.filter((s): s is typeof MUSCLE_KEYS[number] =>
            MUSCLE_KEY_SET.has(s),
          ),
        ),
```

- [ ] **Step 3: 类型检查**

Run: `npx tsc --noEmit`
Expected: 无错误

**注意:**如果 tsc 报 `ExerciseParseResult` 相关错误,原因是 `ExerciseEntry.muscle_groups?: string[]`(`lib/types.ts:45`)比新 schema 宽。这是**预期的兼容性缓冲**,TS 协变会吃这个宽松类型,不应报错。如果确实报错,在 `lib/types.ts:45` 同步收紧为 `muscle_groups?: MuscleKey[]`(要加 import)。

- [ ] **Step 4: Commit**

```bash
git add lib/ai/schemas/parse.ts
git commit -m "refactor(ai): narrow muscle_groups to MuscleKey via transform filter"
```

---

## Task 4: 同步修改 3 个 AI parse route prompt

**Files:**
- Modify: `app/api/ai/parse/route.ts:98, 113`
- Modify: `app/api/ai/parse-image/route.ts:113, 128`
- Modify: `app/api/ai/parse-with-images/route.ts:120, 135`

3 个 route 的 exercise prompt 结构相同,替换文本也相同。

- [ ] **Step 1: 修改 `app/api/ai/parse/route.ts`**

找到第 98 行:

```
      - muscle_groups: 锻炼的肌肉群
```

替换为:

```
      - muscle_groups: 锻炼的主要肌肉群,必须从以下固定英文枚举中选择(不要用中文):
          chest, abs, obliques, upper-back, lower-back,
          front-deltoids, back-deltoids, biceps, triceps, forearms,
          quadriceps, hamstrings, glutes, calves
        仅列主要肌群(1-3 个),不列次要协同肌。纯有氧(跑步、骑行)返回空数组。
```

然后找到第 113 行:

```
            "muscle_groups": ["腿部", "核心"],
```

替换为:

```
            "muscle_groups": ["quadriceps", "glutes"],
```

- [ ] **Step 2: 修改 `app/api/ai/parse-image/route.ts`**

在第 113 行(`- muscle_groups: 锻炼的肌肉群`)和第 128 行(`"muscle_groups": ["腿部", "核心"]`)做完全相同的两处替换。

- [ ] **Step 3: 修改 `app/api/ai/parse-with-images/route.ts`**

在第 120 行和第 135 行做完全相同的两处替换。

- [ ] **Step 4: 类型检查**

Run: `npx tsc --noEmit`
Expected: 无错误(prompt 是字符串字面量,不影响类型)

- [ ] **Step 5: Commit**

```bash
git add app/api/ai/parse/route.ts app/api/ai/parse-image/route.ts app/api/ai/parse-with-images/route.ts
git commit -m "refactor(ai): constrain muscle_groups prompt to fixed English enum"
```

---

## Task 5: 新增 `dashboard.muscleFatigue` i18n 命名空间

**Files:**
- Modify: `messages/zh.json`
- Modify: `messages/en.json`

- [ ] **Step 1: 在 `messages/zh.json` 的 `"dashboard": { ... }` 对象内追加 `muscleFatigue` 子对象**

具体插入位置:在 `dashboard` 对象的**第一层子键**之一旁边加一个新键。保持 JSON 语法正确。

```jsonc
"muscleFatigue": {
  "title": "今日恢复状态",
  "subtitle": "过去 3 天训练影响",
  "empty": "暂无近期训练记录,记录运动后这里会显示肌肉恢复状态",
  "viewFront": "前",
  "viewBack": "后",
  "whenToday": "今天刚练过",
  "whenYesterday": "昨天练过",
  "whenDayBefore": "前天练过",
  "whenRecovered": "已恢复",
  "legendToday": "今",
  "legendYesterday": "昨",
  "legendDayBefore": "前",
  "legendRecovered": "恢复",
  "muscleLabels": {
    "chest": "胸部",
    "abs": "腹肌",
    "obliques": "腹斜肌",
    "upper-back": "上背",
    "lower-back": "下背",
    "front-deltoids": "前三角肌",
    "back-deltoids": "后三角肌",
    "biceps": "肱二头肌",
    "triceps": "肱三头肌",
    "forearms": "前臂",
    "quadriceps": "股四头肌",
    "hamstrings": "腘绳肌",
    "glutes": "臀肌",
    "calves": "小腿"
  }
}
```

- [ ] **Step 2: 在 `messages/en.json` 的 `"dashboard"` 对象内追加同结构对象**

```jsonc
"muscleFatigue": {
  "title": "Recovery Today",
  "subtitle": "Based on the past 3 days",
  "empty": "No recent workouts yet. Log an exercise and muscle recovery will appear here.",
  "viewFront": "Front",
  "viewBack": "Back",
  "whenToday": "Trained today",
  "whenYesterday": "Trained yesterday",
  "whenDayBefore": "Trained 2 days ago",
  "whenRecovered": "Recovered",
  "legendToday": "Today",
  "legendYesterday": "1d",
  "legendDayBefore": "2d",
  "legendRecovered": "Recovered",
  "muscleLabels": {
    "chest": "Chest",
    "abs": "Abs",
    "obliques": "Obliques",
    "upper-back": "Upper back",
    "lower-back": "Lower back",
    "front-deltoids": "Front delts",
    "back-deltoids": "Rear delts",
    "biceps": "Biceps",
    "triceps": "Triceps",
    "forearms": "Forearms",
    "quadriceps": "Quads",
    "hamstrings": "Hamstrings",
    "glutes": "Glutes",
    "calves": "Calves"
  }
}
```

- [ ] **Step 3: 验证 JSON 语法**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/zh.json','utf8')); JSON.parse(require('fs').readFileSync('messages/en.json','utf8')); console.log('OK')"`
Expected: 输出 `OK`

- [ ] **Step 4: Commit**

```bash
git add messages/zh.json messages/en.json
git commit -m "feat(i18n): add dashboard.muscleFatigue translations (zh + en)"
```

---

## Task 6: 实现 `useMuscleFatigue` hook

**Files:**
- Create: `hooks/use-muscle-fatigue.ts`

- [ ] **Step 1: 创建 `hooks/use-muscle-fatigue.ts`**

```ts
"use client"

import { useEffect, useState } from "react"
import { format, subDays } from "date-fns"
import { useIndexedDB } from "@/hooks/use-indexed-db"
import {
  computeMuscleFatigue,
  type MuscleFatigueMap,
} from "@/lib/muscle-fatigue"
import type { DailyLog } from "@/lib/types"

export function useMuscleFatigue(selectedDate: Date, refreshTrigger = 0) {
  const { getData, isInitializing } = useIndexedDB("healthLogs")
  const [byMuscle, setByMuscle] = useState<MuscleFatigueMap>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (isInitializing) return
    let cancelled = false
    setIsLoading(true)

    const keys = [0, 1, 2].map((n) =>
      format(subDays(selectedDate, n), "yyyy-MM-dd"),
    )

    Promise.all(keys.map((k) => getData(k) as Promise<DailyLog | null>))
      .then((logs) => {
        if (cancelled) return
        setByMuscle(computeMuscleFatigue(logs))
        setIsLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setByMuscle({})
        setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedDate, refreshTrigger, isInitializing, getData])

  return {
    byMuscle,
    isLoading,
    hasAnyRecord: Object.keys(byMuscle).length > 0,
  }
}
```

- [ ] **Step 2: 类型检查**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add hooks/use-muscle-fatigue.ts
git commit -m "feat(muscle-fatigue): add useMuscleFatigue hook reading past 3 days"
```

---

## Task 7: 安装库 + 实现 `MuscleFatigueCard` 组件

**Files:**
- Create: `components/muscle-fatigue-card.tsx`
- Modify: `package.json` / `pnpm-lock.yaml`(通过 pnpm add 自动)
- 可能 Modify: `lib/muscle-groups.ts`(如需 slug 映射)

- [ ] **Step 1: 安装依赖**

Run: `pnpm add react-muscle-highlighter`
Expected: 成功安装,`package.json` 出现新依赖

- [ ] **Step 2: 验证库的实际导出和 API**

Run: `cat node_modules/react-muscle-highlighter/dist/types/index.d.ts`
Expected: 看到组件导出和 props 类型。

**核心要确认的点:**
1. 主组件名(可能是 `BodyHighlighter`、`MuscleHighlighter` 或 `HumanBody`)
2. 前/后视图的区分方式(props `type` / `variant` / 两个独立组件)
3. data 数组项的字段名:是 `slug`、`muscle`、`bodyPart` 还是别的
4. 颜色指定方式:逐项 `color` 还是全局 colorScale + `intensity`
5. 交互回调名:`onPartHover`、`onPartClick`、`onMusclePress` 等

如果导出没有对应组件,或 slug 值域与我们的 `MuscleKey` 不一致,在 `lib/muscle-groups.ts` 末尾追加适配层:

```ts
// 库的 Slug 值域与我们的 MuscleKey 若不一致,在这里做局部映射
export const MUSCLE_TO_LIB_SLUG: Record<MuscleKey, string> = {
  "chest": "chest",
  "abs": "abs",
  // ... 按库的实际 slug 填
}
```

然后 commit 适配层:
```bash
git add lib/muscle-groups.ts
git commit -m "feat(muscle-fatigue): add slug mapping to react-muscle-highlighter"
```

若库的 slug 与我们完全一致,跳过此映射层。

- [ ] **Step 3: 创建 `components/muscle-fatigue-card.tsx`**

以下代码中的 `BodyHighlighter` import、props 名称**需要按 Step 2 的实际 API 调整**(若你发现命名不同,做等效替换)。

```tsx
"use client"

import dynamic from "next/dynamic"
import { useMemo, useState } from "react"
import { Activity } from "lucide-react"

import { useMuscleFatigue } from "@/hooks/use-muscle-fatigue"
import { useTranslation } from "@/hooks/use-i18n"
import {
  FRONT_MUSCLES,
  BACK_MUSCLES,
  type MuscleKey,
} from "@/lib/muscle-groups"

// 防止库内部访问 window 导致 SSR / hydration 问题
const BodyHighlighter = dynamic(
  () =>
    import("react-muscle-highlighter").then(
      (m) =>
        // 若主组件名不叫 BodyHighlighter,按 Step 2 的发现改这里
        (m as { BodyHighlighter: React.ComponentType<unknown> })
          .BodyHighlighter,
    ),
  {
    ssr: false,
    loading: () => <div className="h-[200px] bg-muted/40 rounded" />,
  },
)

const INTENSITY_COLOR: Record<0 | 30 | 60 | 100, string> = {
  100: "#ef4444", // red-500
  60: "#f97316",  // orange-500
  30: "#eab308",  // yellow-500
  0: "#e5e7eb",   // slate-200
}

type Props = {
  selectedDate: Date
  refreshTrigger?: number
}

export function MuscleFatigueCard({ selectedDate, refreshTrigger }: Props) {
  const t = useTranslation("dashboard.muscleFatigue")
  const { byMuscle, isLoading, hasAnyRecord } = useMuscleFatigue(
    selectedDate,
    refreshTrigger,
  )
  const [hovered, setHovered] = useState<MuscleKey | null>(null)

  const buildData = (keys: readonly MuscleKey[]) =>
    keys.map((k) => {
      const intensity = byMuscle[k]?.intensity ?? 0
      return {
        slug: k,
        intensity,
        color: INTENSITY_COLOR[intensity as 0 | 30 | 60 | 100],
      }
    })

  const front = useMemo(
    () => buildData(FRONT_MUSCLES),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [byMuscle],
  )
  const back = useMemo(
    () => buildData(BACK_MUSCLES),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [byMuscle],
  )

  const hoveredState = hovered ? byMuscle[hovered] : null
  const whenKey =
    hoveredState?.daysAgo === 0
      ? "whenToday"
      : hoveredState?.daysAgo === 1
        ? "whenYesterday"
        : hoveredState?.daysAgo === 2
          ? "whenDayBefore"
          : "whenRecovered"

  return (
    <div className="health-card p-8 space-y-6">
      <div className="flex items-center space-x-4">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-white">
          <Activity className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">{t("title")}</h3>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="h-[220px] animate-pulse rounded-lg bg-muted" />
      ) : !hasAnyRecord ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          <Activity className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>{t("empty")}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col items-center">
              {/* 按 Step 2 的 API 调整 props:可能是 type="anterior" 或 variant="front" 等 */}
              <BodyHighlighter
                {...({
                  type: "anterior",
                  data: front,
                  onPartHover: (slug: string) =>
                    setHovered(slug as MuscleKey),
                  onPartClick: (slug: string) =>
                    setHovered(slug as MuscleKey),
                } as unknown as Record<string, unknown>)}
              />
              <span className="text-xs text-muted-foreground mt-1">
                {t("viewFront")}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <BodyHighlighter
                {...({
                  type: "posterior",
                  data: back,
                  onPartHover: (slug: string) =>
                    setHovered(slug as MuscleKey),
                  onPartClick: (slug: string) =>
                    setHovered(slug as MuscleKey),
                } as unknown as Record<string, unknown>)}
              />
              <span className="text-xs text-muted-foreground mt-1">
                {t("viewBack")}
              </span>
            </div>
          </div>

          <div className="min-h-10">
            {hovered && hoveredState ? (
              <div className="text-sm text-center px-3 py-2 rounded-md bg-muted">
                <span className="font-medium">
                  {t(`muscleLabels.${hovered}`)}
                </span>
                <span className="mx-2 text-muted-foreground">·</span>
                <span>{t(whenKey)}</span>
                {hoveredState.lastExerciseName && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {hoveredState.lastExerciseName}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
            <LegendDot color="#ef4444" label={t("legendToday")} />
            <LegendDot color="#f97316" label={t("legendYesterday")} />
            <LegendDot color="#eab308" label={t("legendDayBefore")} />
            <LegendDot color="#e5e7eb" label={t("legendRecovered")} />
          </div>
        </>
      )}
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span
        className="inline-block w-2.5 h-2.5 rounded-sm"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  )
}
```

> **关于 `BodyHighlighter` props 的类型擦除 `as unknown as Record<string, unknown>`:**这只是临时逃生阀,避免在 Step 2 确认真实 props 类型之前 tsc 报错。Step 2 若已拿到库的 `.d.ts` 精确类型,**去掉这个 cast**,直接用库导出的 props 类型。这是 Task 7 结束前必须做的清理。

- [ ] **Step 4: 类型检查**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 5: 最小化运行验证**

Run: `pnpm dev`,在浏览器打开 `http://localhost:3000/zh`(或项目默认 locale),暂时**不用**集成到主页(还没到 T9),用浏览器 DevTools Console 里 `import` 做轻量检查 — 或者直接跳过此步,留到 T9 + T10 验证。

- [ ] **Step 6: Commit**

```bash
git add components/muscle-fatigue-card.tsx package.json pnpm-lock.yaml
git commit -m "feat(muscle-fatigue): add MuscleFatigueCard with react-muscle-highlighter"
```

---

## Task 8: 适配 `exercise-entry-card` 显示中文肌肉名

**Files:**
- Modify: `components/exercise-entry-card.tsx`(顶部 imports + 组件体内 + 第 170-172 行)

- [ ] **Step 1: 添加新 imports**

在 `components/exercise-entry-card.tsx` 第 13 行(`import { useTranslation } from "@/hooks/use-i18n"`)下方加一行:

```tsx
import { MUSCLE_KEY_SET, type MuscleKey } from "@/lib/muscle-groups"
```

- [ ] **Step 2: 在组件内(第 22 行 `const t = ...` 下方)新增一个翻译 hook 和 render helper**

在现有 `const t = useTranslation('dashboard.exerciseCard')` 下方加:

```tsx
  const tFatigue = useTranslation('dashboard.muscleFatigue')

  const renderMuscle = (raw: string) =>
    MUSCLE_KEY_SET.has(raw)
      ? tFatigue(`muscleLabels.${raw as MuscleKey}`)
      : raw
```

- [ ] **Step 3: 替换第 170-172 行的 join 渲染**

找到:

```tsx
              {entry.muscle_groups && (
                <p className="text-xs text-muted-foreground">{t('muscleGroups')}: {entry.muscle_groups.join(", ")}</p>
              )}
```

替换为:

```tsx
              {entry.muscle_groups && entry.muscle_groups.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {t('muscleGroups')}: {entry.muscle_groups.map(renderMuscle).join(", ")}
                </p>
              )}
```

- [ ] **Step 4: 类型检查**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 5: Commit**

```bash
git add components/exercise-entry-card.tsx
git commit -m "refactor(ui): render muscle_groups via i18n label map"
```

---

## Task 9: 集成到主页右侧栏

**Files:**
- Modify: `app/[locale]/page.tsx`(顶部 import + 右侧栏 `<div className="space-y-8">` 末尾)

- [ ] **Step 1: 添加 import**

在 `app/[locale]/page.tsx` 第 21 行(`import { ExerciseEntryCard } from "@/components/exercise-entry-card"`)下方插入一行:

```tsx
import { MuscleFatigueCard } from "@/components/muscle-fatigue-card"
```

- [ ] **Step 2: 在右侧栏追加卡片**

在 `app/[locale]/page.tsx` 里找到右侧栏容器 `<div className="space-y-8">`(开头约在第 966 行,结束约在第 1041-1042 行)。

该容器内已有两张 card(体重 card 约 967-1005 行 + 活动水平 card 约 1007-1041 行)。在活动水平 card 的 `</div>` 闭合**之后**、容器的 `</div>` **之前**,追加:

```tsx
              <MuscleFatigueCard
                selectedDate={selectedDate}
                refreshTrigger={chartRefreshTrigger}
              />
```

缩进要对齐同级兄弟(约 14 空格)。

- [ ] **Step 3: 类型检查**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 4: 本地运行 smoke 检查**

Run: `pnpm dev`
在浏览器打开 `http://localhost:3000/zh`。
Expected: 首页右侧栏下方看到一张"今日恢复状态"卡片(空态或小红人)。控制台无报错。

- [ ] **Step 5: Commit**

```bash
git add app/[locale]/page.tsx
git commit -m "feat(dashboard): mount MuscleFatigueCard in right column"
```

---

## Task 10: 端到端手动验收

**Files:** (无代码改动,验收跑通 spec §11.3 清单)

- [ ] **Step 1: 完整构建验证**

Run: `pnpm build`
Expected: build 成功完成,无 TS / lint 错误

若构建报 `react-muscle-highlighter` 相关的 SSR 问题,确认 `MuscleFatigueCard` 里 `dynamic({ ssr: false })` 已正确写好;若问题仍在,按 spec §10.2 R2 的 fallback 降级(先试 `react-body-highlighter@2.0.5` + `--legacy-peer-deps`,再不行切 `body-highlighter`)。

- [ ] **Step 2: 启动 dev server**

Run: `pnpm dev`(如果 Task 9 Step 4 已启动,复用)

- [ ] **Step 3: 跑数据层验收**

- [ ] 打开主页,在"运动"tab 录入一条 "卧推 5×8 80kg"
- [ ] 等待 AI 解析完成,展开该条 entry card,确认显示中文肌肉名(如"胸部, 肱三头肌")
- [ ] 打开浏览器 DevTools → Application → IndexedDB → `healthApp` → `healthLogs`,找到今日 log,确认该 entry 的 `muscle_groups` 字段是英文枚举(如 `["chest", "triceps"]`)

- [ ] **Step 4: 跑疲劳算法验收**

在日期选择器手动模拟 4 天的训练数据(或用现有数据):

- [ ] 今天录一条胸训 → 前视图胸部立即变红(100%)
- [ ] 翻到昨天录一条胸训,今天不练 → 胸部显示橙色(60%)
- [ ] 翻到前天录一条胸训 → 胸部显示黄色(30%)
- [ ] 翻到 3 天前录一条胸训,后 3 天不练 → 胸部回到灰色(已恢复)
- [ ] 连续 3 天都练胸 → 取最近 = 红色

- [ ] **Step 5: 跑 UI / 交互验收**

- [ ] 在没有任何运动记录的新日期 → 卡片显示空态文案,**不是**全绿小人
- [ ] 悬浮/点击已练过的肌肉 → info bar 显示"胸部 · 今天刚练过 · Bench Press"
- [ ] 悬浮/点击已恢复的肌肉 → info bar 区域保持固定占位,不抖动
- [ ] 选日期翻到过去某天 → 小红人反映那天的状态
- [ ] 在 Chrome DevTools 切 375px 窄屏 → 卡片不溢出,前后 SVG 仍可辨认
- [ ] 切换 locale 到 `/en` → 文案、tooltip、肌肉名全部变英文

- [ ] **Step 6: 跑集成回归验收**

- [ ] `exercise-entry-card` 里展示中文肌肉名(不是 `chest, triceps`)
- [ ] 原有食物解析、其他运动解析不受影响
- [ ] 打开 `/chat`,询问"我最近练了什么"→ AI 回答正常(即便 muscle_groups 是英文 key,chat LLM 能消化)
- [ ] 硬刷新主页 → 控制台无 `window is not defined`、无 hydration 警告

- [ ] **Step 7: 跑性能验收**

- [ ] 在日期选择器快速连点不同日期 6-8 次 → Network 面板无叠压,最终显示的是最后选中日对应的数据(`cancelled` flag 生效)

- [ ] **Step 8: AI 合规率探索**

录 10 次不同描述的运动测试 AI 是否遵守英文枚举约束:

- "bench press 4×8"(英文,强信号)
- "我做了 4 组深蹲"(中文 + 结构化)
- "跑了半小时"(纯有氧 — 期望 `muscle_groups: []`)
- "晨跑 5km"(纯有氧)
- "硬拉 5×5 100kg"
- "引体向上 4×8"
- "我做了瑜伽流动"(flexibility)
- "做了 20 分钟平板支撑和 50 个仰卧起坐"
- "打了 1 小时羽毛球"
- "plank 3 sets of 1 minute"

对每条,打开 IndexedDB 查看存储的 `muscle_groups` 值。合规率 = 值全在 MUSCLE_KEYS 里的条数 / 10。期望 ≥ 90%。脏值会被 Zod transform 过滤为 `[]`,entry 依然入库不崩溃。

- [ ] **Step 9: 如有小修,修完提交**

若 Step 3-8 中发现小 bug(文案 typo、颜色不对、间距异常等),在对应文件里修正,commit:

```bash
git add <fixed-files>
git commit -m "fix(muscle-fatigue): <description>"
```

若 AI 合规率 < 90%,考虑加强 prompt(如在 3 个 route 的 prompt 里加 "IMPORTANT: Use ONLY the English enum values listed, reject any Chinese.")并再跑 Step 8 的 10 条测试。

- [ ] **Step 10: 结束**

所有 checklist 通过。功能完成。

---

## Self-Review

### Spec coverage

| Spec 章节 | 覆盖 task |
|---|---|
| §2 决策 #1 值域约束 | T3 (schema transform) + T4 (prompt) |
| §2 决策 #2 颗粒度 | T1 (14 个 keys) |
| §2 决策 #3 库 | T7 (安装 + 集成) |
| §2 决策 #4 疲劳算法 | T2 (computeMuscleFatigue) |
| §2 决策 #5 集成位置 | T9 (主页右侧栏) |
| §2 决策 #6 前后并排 | T7 (组件 grid-cols-2) |
| §2 决策 #7 交互 | T7 (info bar) |
| §2 决策 #8 历史数据 | T2 (MUSCLE_KEY_SET 过滤) |
| §4.1 `lib/muscle-groups.ts` | T1 |
| §4.2 Schema | T3 |
| §4.3 Prompt | T4 |
| §4.4 i18n | T5 |
| §5 纯函数 | T2 |
| §6 Hook | T6 |
| §7 组件 | T7 |
| §8 主页集成 | T9 |
| §9 exercise-entry-card | T8 |
| §10.1 错误矩阵 | T2 过滤、T6 catch 清空、T7 `dynamic(ssr:false)` + 空态 |
| §10.2 R1 AI 脏值 | T3 transform 覆盖 |
| §10.2 R2 SSR | T7 dynamic 覆盖,T10 Step 1 fallback 预案 |
| §10.2 R3 hover API | T7 Step 2 确认 + info bar 模式容错 |
| §10.2 R4 slug 不一致 | T7 Step 2 里预留 MUSCLE_TO_LIB_SLUG |
| §11 测试 | T10 全部覆盖 |

无覆盖缺口。

### Placeholder scan

扫过全部 task,未发现 "TBD"、"TODO"、"fill in later"、"implement error handling" 等空占位符。T7 Step 2/3 里的 "按 Step 2 的实际 API 调整" 有明确的上下文(因为无法预判第三方库的 API 准确名称),不属于占位,属于"已在 Step 2 里抓取真实信息 + 在 Step 3 根据该信息调整"的闭环。

### Type consistency

- `MuscleKey`、`MUSCLE_KEYS`、`MUSCLE_KEY_SET`、`FRONT_MUSCLES`、`BACK_MUSCLES` 在 T1 定义,T2/T3/T6/T7/T8 全部 import 同名引用,无命名漂移
- `FatigueState`、`MuscleFatigueMap` 在 T2 定义,T6 import,T7 通过 hook 间接使用,命名一致
- `useMuscleFatigue(selectedDate, refreshTrigger)` 签名在 T6 定义,T7 使用一致
- `MuscleFatigueCard` props `{selectedDate, refreshTrigger}` 在 T7 定义,T9 使用一致

无签名不一致。
