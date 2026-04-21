# 人体肌肉疲劳热力图 · 设计文档

**Date**: 2026-04-21
**Status**: Draft, awaiting review
**Scope**: 新增 SnapFit AI 主页的"今日恢复状态"卡片,根据过去 3 天的运动记录可视化各肌群的疲劳/恢复程度。

---

## 1. 目标

用户每天打开应用,一眼就能看到"身体哪里还没恢复、哪里可以继续练"。

核心使用场景:每日决策训练部位。核心价值:**不用翻历史记录即可判断今天该练什么**。

不在本次范围:训练建议、疲劳预测、历史趋势、细颗粒度肌群(>14 个)、按训练容量加权。

---

## 2. 关键决策

| # | 维度 | 决定 |
|---|---|---|
| 1 | AI 值域约束 | prompt 明确枚举 + schema 用 `transform(filter)` 过滤脏值(不用 `z.enum` 硬拒,避免整条 entry fail) |
| 2 | 颗粒度 | 中等,14 个肌群 |
| 3 | 可视化库 | `react-muscle-highlighter` (原生 intensity 梯度 + React 19 兼容) |
| 4 | 疲劳算法 | 纯日期分级:今 100% / 昨 60% / 前 30% / ≥3 天前 0%。同肌群多日出现,取**最近一次** |
| 5 | 集成位置 | `app/[locale]/page.tsx` 右侧栏第 3 张卡片(与"体重"、"活动水平"并列) |
| 6 | 前后视图 | **并排显示**,不切换 |
| 7 | 交互 | **info bar 模式**(hover/click 到哪,卡片下方固定区域显示部位名 + 最近训练) |
| 8 | 历史数据 | **忽略不符合新 enum 的旧记录**(不做迁移) |

---

## 3. 架构总览

```
① 用户输入 ──► AI 解析(prompt 枚举约束 + schema transform 过滤脏值)
                        │
                        ▼
② IndexedDB "healthLogs" ──► useMuscleFatigue(selectedDate, refreshTrigger)
                                         │
                                         ▼
③ MuscleFatigueCard ──► react-muscle-highlighter (前/后 SVG)
                │
                └──► info bar (hover 显示中文名 + 最近训练)

④ i18n: lib/muscle-groups.ts 的 MuscleKey ↔ messages/{zh,en}.json 的 muscleLabels
```

**新增文件(4)**

| 文件 | 职责 |
|---|---|
| `lib/muscle-groups.ts` | 14 个 MuscleKey 枚举、前/后视图分组、(可能需要的)库 slug 映射 |
| `lib/muscle-fatigue.ts` | 纯函数 `computeMuscleFatigue(logs)`(可单测) |
| `hooks/use-muscle-fatigue.ts` | 读 IndexedDB 过去 3 天 + 调用纯函数 + 状态管理 |
| `components/muscle-fatigue-card.tsx` | 卡片 UI:前后 SVG + info bar + 空态 |

**修改文件(7)**

| 文件 | 改动 |
|---|---|
| `lib/ai/schemas/parse.ts:51` | `muscle_groups` 从 `z.array(z.string())` 改为 `z.array(z.string()).transform(filter-by-MuscleKey)` |
| `app/api/ai/parse/route.ts:98, 113` | prompt 换成英文枚举说明 + 英文示例 |
| `app/api/ai/parse-image/route.ts:113, 128` | 同上 |
| `app/api/ai/parse-with-images/route.ts:120, 135` | 同上 |
| `app/[locale]/page.tsx` | 右侧栏新增 `<MuscleFatigueCard/>`(约 1017 行后) |
| `components/exercise-entry-card.tsx:170-172` | 显示肌肉群时用 i18n label(不直接 join 原始 key) |
| `messages/zh.json`, `messages/en.json` | 新增 `dashboard.muscleFatigue.*` 命名空间(title / subtitle / empty / whenToday 等 + muscleLabels) |

**不改文件**

- `app/api/ai/chat/route.ts:90`,`app/chat/page.tsx:736` — 只把 `muscle_groups` 作为 LLM 上下文,英文 key 不影响 chat 理解。

**新增依赖**

- `react-muscle-highlighter@^1.2.0`(peerDeps `^18 || ^19`,最新 1.2.0)

---

## 4. 枚举与 i18n

### 4.1 `lib/muscle-groups.ts`

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

// 运行时检查集合,schema transform / hook 纯函数 / UI 兜底共用
export const MUSCLE_KEY_SET: ReadonlySet<string> = new Set(MUSCLE_KEYS)

export const FRONT_MUSCLES: readonly MuscleKey[] = [
  "chest", "abs", "obliques", "front-deltoids",
  "biceps", "forearms", "quadriceps",
]

export const BACK_MUSCLES: readonly MuscleKey[] = [
  "upper-back", "lower-back", "back-deltoids",
  "triceps", "glutes", "hamstrings", "calves",
]

// 如果 react-muscle-highlighter 的 Slug 和我们的 key 不一致,在这里做局部映射
// 实现时以库 README 为准;若完全一致,此表可省略
// export const MUSCLE_TO_LIB_SLUG: Record<MuscleKey, string> = { ... }
```

> 不收 head/neck(健身场景不练);不额外切分前/中/后三角肌(中颗粒度)。

### 4.2 AI Schema(`lib/ai/schemas/parse.ts`)

```ts
import { MUSCLE_KEYS, MUSCLE_KEY_SET } from "@/lib/muscle-groups"

// 现状第 51 行:muscle_groups: z.array(z.string()).optional()
// 改为:
muscle_groups: z
  .array(z.string())
  .optional()
  .transform(arr =>
    arr?.filter((s): s is typeof MUSCLE_KEYS[number] =>
      MUSCLE_KEY_SET.has(s),
    ),
  ),
```

> **设计要点**:不用 `z.enum(MUSCLE_KEYS)` 直接 enforce,是为了容错 —— AI 偶发返回 "胸部" 时不会让整条 entry validation 失败,过滤后留空数组即可。严格的值域约束靠 prompt + transform 组合实现,类型上仍精确到 `MuscleKey[]`。

### 4.3 AI Prompt(3 处同步改)

- `app/api/ai/parse/route.ts:98` 前后
- `app/api/ai/parse-image/route.ts:113` 前后
- `app/api/ai/parse-with-images/route.ts:120` 前后

将现有:

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

示例输出里的肌群值同步英文化:

```json
"muscle_groups": ["quadriceps", "glutes"]
```

### 4.4 i18n(`messages/zh.json` / `en.json`)

挂在既有 `dashboard` 命名空间下:

```jsonc
"dashboard": {
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
}
```

`en.json` 结构一致,value 英文(Chest / Abs / Obliques / ...)。

---

## 5. 纯函数 `computeMuscleFatigue`

`lib/muscle-fatigue.ts`:

```ts
import { MUSCLE_KEYS, MUSCLE_KEY_SET, type MuscleKey } from "@/lib/muscle-groups"
import type { DailyLog } from "@/lib/types"

export type FatigueState = {
  intensity: 0 | 30 | 60 | 100
  daysAgo: 0 | 1 | 2 | null
  lastExerciseName: string | null
}

export type MuscleFatigueMap = Partial<Record<MuscleKey, FatigueState>>

const INTENSITY_BY_DAYS: Record<0 | 1 | 2, 100 | 60 | 30> = {
  0: 100, 1: 60, 2: 30,
}

/**
 * logsByDaysAgo[0] = 基准日, [1] = 前一日, [2] = 前二日
 * 日期由近到远遍历,同肌群首次命中即采用(实现"取最近一次")
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
        if (!MUSCLE_KEY_SET.has(raw)) continue  // 决策 #8:忽略非 enum 值
        const key = raw as MuscleKey
        if (result[key]) continue  // 已有更近记录

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

---

## 6. Hook `use-muscle-fatigue`

`hooks/use-muscle-fatigue.ts`:

```ts
"use client"

import { useEffect, useState } from "react"
import { format, subDays } from "date-fns"
import { useIndexedDB } from "@/hooks/use-indexed-db"
import { computeMuscleFatigue, type MuscleFatigueMap } from "@/lib/muscle-fatigue"
import type { DailyLog } from "@/lib/types"

export function useMuscleFatigue(selectedDate: Date, refreshTrigger = 0) {
  const { getData, isInitializing } = useIndexedDB("healthLogs")
  const [byMuscle, setByMuscle] = useState<MuscleFatigueMap>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (isInitializing) return
    let cancelled = false
    setIsLoading(true)

    const keys = [0, 1, 2].map(n =>
      format(subDays(selectedDate, n), "yyyy-MM-dd"),
    )

    Promise.all(keys.map(k => getData(k) as Promise<DailyLog | null>))
      .then(logs => {
        if (cancelled) return
        setByMuscle(computeMuscleFatigue(logs))
        setIsLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setByMuscle({})
        setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [selectedDate, refreshTrigger, isInitializing, getData])

  return {
    byMuscle,
    isLoading,
    hasAnyRecord: Object.keys(byMuscle).length > 0,
  }
}
```

**关键点**

- `cancelled` flag 防竞态(快速翻日期时旧响应不覆盖新状态)
- 错误静默降级(清空 map + `isLoading=false`,不弹 toast)
- 基准日是 `selectedDate` 不是 `new Date()` — 用户回看历史日时,小红人反映**那天**的状态,与 `DailySummary`、`ManagementCharts` 一致
- `refreshTrigger` 复用主页既有的 `chartRefreshTrigger`,新录入运动后自动刷新

---

## 7. 组件 `MuscleFatigueCard`

`components/muscle-fatigue-card.tsx`:

### 7.1 样式风格

用与 `体重`、`活动水平` 两张卡一致的 `health-card p-8 space-y-6`(参见 `app/[locale]/page.tsx:967-1005`)。icon 用 `Activity`(lucide-react),紫青色调已由 `bg-primary` 继承。

### 7.2 结构骨架

```tsx
"use client"
import dynamic from "next/dynamic"
import { useState, useMemo } from "react"
import { Activity } from "lucide-react"
import { useMuscleFatigue } from "@/hooks/use-muscle-fatigue"
import { useTranslation } from "@/hooks/use-i18n"
import {
  FRONT_MUSCLES, BACK_MUSCLES, type MuscleKey,
} from "@/lib/muscle-groups"
import type { MuscleFatigueMap, FatigueState } from "@/lib/muscle-fatigue"

// dynamic + ssr:false 防止库内部 window 访问触发 hydration mismatch
const BodyHighlighter = dynamic(
  () => import("react-muscle-highlighter").then(m => m.BodyHighlighter),
  {
    ssr: false,
    loading: () => <div className="h-[200px] bg-muted/40 rounded" />,
  },
)

const INTENSITY_COLOR: Record<0 | 30 | 60 | 100, string> = {
  100: "#ef4444",  // red-500
   60: "#f97316",  // orange-500
   30: "#eab308",  // yellow-500
    0: "#e5e7eb",  // slate-200
}

type Props = { selectedDate: Date; refreshTrigger?: number }

export function MuscleFatigueCard({ selectedDate, refreshTrigger }: Props) {
  const t = useTranslation("dashboard")
  const { byMuscle, isLoading, hasAnyRecord } =
    useMuscleFatigue(selectedDate, refreshTrigger)
  const [hovered, setHovered] = useState<MuscleKey | null>(null)

  const toSvgData = (keys: readonly MuscleKey[]) =>
    keys.map(k => {
      const st = byMuscle[k]
      const intensity = st?.intensity ?? 0
      return {
        slug: k,                   // 或 MUSCLE_TO_LIB_SLUG[k],以库为准
        intensity,
        color: INTENSITY_COLOR[intensity as 0 | 30 | 60 | 100],
      }
    })

  const front = useMemo(() => toSvgData(FRONT_MUSCLES), [byMuscle])
  const back  = useMemo(() => toSvgData(BACK_MUSCLES), [byMuscle])

  return (
    <div className="health-card p-8 space-y-6">
      <Header t={t} />

      {isLoading ? (
        <div className="h-[220px] animate-pulse rounded-lg bg-muted" />
      ) : !hasAnyRecord ? (
        <EmptyState t={t} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <ViewPanel type="anterior" data={front} label={t("muscleFatigue.viewFront")} onHover={setHovered} />
            <ViewPanel type="posterior" data={back}  label={t("muscleFatigue.viewBack")}  onHover={setHovered} />
          </div>
          <HoverInfo muscle={hovered} byMuscle={byMuscle} t={t} />
          <Legend t={t} />
        </>
      )}
    </div>
  )
}
```

### 7.3 info bar(hover 显示详情)

```tsx
function HoverInfo({ muscle, byMuscle, t }) {
  const state = muscle ? byMuscle[muscle] : null
  if (!muscle || !state) {
    return <div className="h-10" />  // 固定占位,避免布局抖动
  }
  const whenKey =
    state.daysAgo === 0 ? "whenToday"
    : state.daysAgo === 1 ? "whenYesterday"
    : state.daysAgo === 2 ? "whenDayBefore"
    : "whenRecovered"

  return (
    <div className="text-sm text-center px-3 py-2 rounded-md bg-muted h-auto min-h-10">
      <span className="font-medium">
        {t(`muscleFatigue.muscleLabels.${muscle}`)}
      </span>
      <span className="mx-2 text-muted-foreground">·</span>
      <span>{t(`muscleFatigue.${whenKey}`)}</span>
      {state.lastExerciseName && (
        <div className="text-xs text-muted-foreground mt-0.5">
          {state.lastExerciseName}
        </div>
      )}
    </div>
  )
}
```

**为什么不用浮层 Tooltip**

- react-muscle-highlighter 的 hover/click API 尚未在本 spec 阶段验证,info bar 模式同时支持 hover 和 click 回调,降低了 API 假设风险
- 移动端没有 hover 概念,浮层 Tooltip 天然对触屏不友好
- 固定位置更稳,不会遮挡其他肌肉

### 7.4 空态

```tsx
function EmptyState({ t }) {
  return (
    <div className="text-center py-8 text-sm text-muted-foreground">
      <Activity className="h-10 w-10 mx-auto mb-3 opacity-40" />
      <p>{t("muscleFatigue.empty")}</p>
    </div>
  )
}
```

**不**显示全绿小人 — 避免用户误以为"加载失败"或"数据错误"。

### 7.5 Legend

```tsx
function Legend({ t }) {
  return (
    <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
      <LegendDot color="#ef4444" label={t("muscleFatigue.legendToday")} />
      <LegendDot color="#f97316" label={t("muscleFatigue.legendYesterday")} />
      <LegendDot color="#eab308" label={t("muscleFatigue.legendDayBefore")} />
      <LegendDot color="#e5e7eb" label={t("muscleFatigue.legendRecovered")} />
    </div>
  )
}
```

---

## 8. 主页集成点

`app/[locale]/page.tsx` 的右侧栏(现结构约 966-1055):

```tsx
<div className="space-y-8">
  <div className="health-card p-8 space-y-6">{/* 现有:今日体重 */}</div>
  <div className="health-card p-8 space-y-6">{/* 现有:活动水平 */}</div>

  {/* 新增:今日恢复状态 */}
  <MuscleFatigueCard
    selectedDate={selectedDate}
    refreshTrigger={chartRefreshTrigger}
  />
</div>
```

import 加在文件顶部既有 `ExerciseEntryCard` / `DailySummary` import 相邻处。

## 9. `exercise-entry-card.tsx` 适配

`components/exercise-entry-card.tsx:170-172` 把 muscle_groups 直接 join 为字符串。schema 切英文后必须改成 i18n:

```tsx
// 顶部新增:
import { useTranslation } from "@/hooks/use-i18n"
import { MUSCLE_KEY_SET, type MuscleKey } from "@/lib/muscle-groups"

// 组件内:
const tDashboard = useTranslation("dashboard")

const renderMuscle = (raw: string) =>
  MUSCLE_KEY_SET.has(raw)
    ? tDashboard(`muscleFatigue.muscleLabels.${raw as MuscleKey}`)
    : raw  // 老记录/未知值原样显示

// 第 170-172 行:
{entry.muscle_groups && entry.muscle_groups.length > 0 && (
  <p className="text-xs text-muted-foreground">
    {t('muscleGroups')}: {entry.muscle_groups.map(renderMuscle).join(", ")}
  </p>
)}
```

- 显式用 `MUSCLE_KEY_SET.has` 判断,不依赖 `next-intl` 的 `defaultMessage` API(该 API 是否存在需以实际版本为准)

---

## 10. 错误处理与风险

### 10.1 错误处理矩阵

| 场景 | 行为 | 对用户 |
|---|---|---|
| IndexedDB 失败 | hook catch 后清空 map,`isLoading=false`,不弹 toast | 卡片显示空态,核心流程不中断 |
| `muscle_groups` 含非枚举值 | `computeMuscleFatigue` 过滤(决策 #8) | 老记录直接跳过,不影响着色 |
| 未来日期 | 3 个 key 全空 | 空态 |
| 零训练记录 | `hasAnyRecord=false` | 空态 |
| 库 SSR 崩溃 | `dynamic({ssr:false})` 预防 | 首屏加载占位,无报错 |

### 10.2 风险清单

**R1 — AI 偶发返回非 enum 值(最高优先级)**

- 缓解:schema 用 `transform` 过滤而非 `z.enum` enforce,脏值被丢弃,entry 照样入库
- 残余风险:用户录入的运动 muscle_groups 可能为空,小红人本次不上色 — 可接受

**R2 — react-muscle-highlighter 的 SSR/hydration 问题**

- 缓解:`next/dynamic` + `ssr: false` + loading placeholder(已内建在组件里)
- Fallback 逐级降级:
  1. 先切 `react-body-highlighter@2.0.5`(原 brainstorm 提案的库,4 年未更新但广泛使用,peerDeps `>=16` 实际兼容 React 19,可能需要 `--legacy-peer-deps`)。没有原生 intensity,需自行按 0/30/60/100 分层给 `highlighted` 数组上色
  2. 若 1 仍失败,底牌是 `body-highlighter` (lahaxearnaud,vanilla JS) 自包 React wrapper —— 工作量 +0.5 天

**R3 — 库的 hover/click API 与 spec 假设不一致**

- 缓解:info bar 模式兼容 hover 和 click 两种事件
- Fallback:外层 `onMouseMove`/`onClick` listener,从 `event.target` 读 `data-muscle-slug`

**R4 — 库 slug 与我们的 MuscleKey 命名不对齐**

- 缓解:`lib/muscle-groups.ts` 预留 `MUSCLE_TO_LIB_SLUG` 映射表,单点适配

---

## 11. 测试策略

项目尚未引入测试框架,本次**不引入 vitest/jest**(避免 scope creep),靠结构 + 手动验收 + 现有 tsc/lint 护栏。

### 11.1 可测结构(已落实)

- `computeMuscleFatigue` 是纯函数,输入 `Array<DailyLog | null>`,输出 `MuscleFatigueMap`,未来引入 vitest 后 1 行 import 即可单测

### 11.2 现有护栏

- `pnpm build` — TS 全量检查捕获 schema、i18n key、prop 类型错
- `pnpm lint` — ESLint

### 11.3 手动验收清单

**数据层**

- [ ] 录"卧推 5×8 80kg" → DB 的 `muscle_groups` 是英文枚举(如 `["chest", "triceps"]`)
- [ ] 用诱导性文本"我练了胸部" 测试:AI 若返 `["胸部"]`,transform 后变 `[]`;运动 entry 依然成功入库

**疲劳算法**

- [ ] 今天录胸训 → 前视图胸部立即红色
- [ ] 昨天练胸,今天不练 → 橙色
- [ ] 前天练胸 → 黄色
- [ ] 3 天前练胸 → 已恢复
- [ ] 连续 3 天都练胸 → 取最近 = 红色

**UI**

- [ ] 新用户首次打开 → 显示空态文案(**不是**全绿小人)
- [ ] 悬浮/点击已练过的肌肉 → info bar 显示"胸部 · 今天刚练过 · Bench Press"
- [ ] 悬浮/点击已恢复的肌肉 → info bar 保持固定占位,不显示内容,不抖动
- [ ] 翻到过去某天 → 小红人反映那天的恢复状态
- [ ] 375px 窄屏 → 卡片不溢出,前后 SVG 仍可辨
- [ ] zh ↔ en 切换 → 文案全覆盖

**集成回归**

- [ ] `exercise-entry-card` 显示中文肌肉名(如"胸部, 肱三头肌")
- [ ] 原有食物解析、其他运动解析、chat 流程**无变化**
- [ ] 首次 SSR 刷新 → 控制台无 `window is not defined` 或 hydration 警告

**性能**

- [ ] 快速连点不同日期 → Network 无叠压,显示内容以最后选中日为准(`cancelled` flag 生效)

### 11.4 AI 探索式验证

录 10 条不同描述的运动,统计 muscle_groups 合规率,期望 ≥ 90%。个位数脏值靠 transform 兜住。

---

## 12. 不在本次范围(未来扩展)

- 细颗粒度(20+ 肌群,区分前/中/后三角肌、上/下胸等)
- 按训练容量/强度加权的疲劳算法
- 点击肌肉弹 Popover 展示近 3 天该肌群所有训练明细
- 历史数据一次性迁移脚本(中文 → 英文枚举)
- 深色模式下的颜色主题调整(MVP 先用同色)
- 推送/提醒:"你的胸肌已恢复,今天可以训练"
