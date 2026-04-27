# 智能训练计划与打卡闭环 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增独立训练页,让 AI 生成单次训练计划,用户按组打卡并在完成后回写 `DailyLog.exerciseEntries`,形成训练计划与历史反馈闭环。

**Architecture:** 以独立 `WorkoutSession` 作为主记录,组级计划值和实际值都保存在 session 中;完成训练时把 session 派生成现有 `ExerciseEntry[]`,兼容首页卡路里统计和肌肉疲劳计算。AI 分两条 route: `workout-plan` 负责一次性生成计划和待确认分析值,`workout-exercise-enrich` 只为用户替换过的动作补全肌群、MET 和卡路里。

**Tech Stack:** Next.js 15.2.4 · React 19 · TypeScript · Tailwind · shadcn/ui · next-intl · IndexedDB · Zod · AI SDK · Vitest

**Spec:** `docs/superpowers/specs/2026-04-23-workout-plan-checkin-loop-design.md`

---

## Scope Check

本 spec 涉及数据模型、AI route、IndexedDB、UI 和回写闭环,但它们围绕同一条“单次训练计划 session”主线,不是多个独立产品子系统。计划按依赖顺序拆成小任务,每个任务都能独立构建和验证。

---

## Testing Strategy

当前 `package.json` 只有 `build` 和 `lint`,没有测试框架。为避免纯函数闭环只能手测,本计划第一步引入 Vitest,只用于 node 环境下的 TypeScript 纯函数与 schema 测试。

验证层级:

- Pure functions: Vitest 覆盖 session 状态迁移、组同步、完成条件、`WorkoutSession -> ExerciseEntry[]`
- Schema: Vitest 覆盖 AI 输出 schema 和 fallback merge
- App build: `pnpm build` 验证 Next.js 页面、route、i18n、类型链路
- Manual smoke: 训练页生成、编辑、替换、跳过、完成、dashboard 回写

---

## File Structure

**Create**

| 文件 | 职责 |
|---|---|
| `vitest.config.ts` | Vitest 配置,支持 `@/` alias |
| `tests/workout-session.test.ts` | 纯函数核心测试 |
| `tests/workout-ai-schemas.test.ts` | AI schema 测试 |
| `lib/indexed-db.ts` | IndexedDB 名称、版本、store 名常量 |
| `lib/workout/types.ts` | WorkoutSession 专属类型,避免继续拉大 `lib/types.ts` |
| `lib/workout/session.ts` | session reducer、组同步、完成条件、ExerciseEntry 映射、fallback |
| `lib/workout/context.ts` | 从本地历史整理计划生成上下文 |
| `lib/ai/schemas/workout-plan.ts` | 训练计划生成 schema |
| `lib/ai/schemas/workout-exercise-enrich.ts` | 替换动作补全 schema |
| `app/api/ai/workout-plan/route.ts` | AI 生成训练计划 |
| `app/api/ai/workout-exercise-enrich/route.ts` | AI 补全替换动作分析字段 |
| `hooks/use-workout-sessions.ts` | 训练 session 的 IndexedDB 读写与活动 session 管理 |
| `components/workout/workout-exercise-card.tsx` | 单个动作卡与组级打卡交互 |
| `components/workout/workout-plan-workbench.tsx` | 训练工作台主体 |
| `app/[locale]/workout/page.tsx` | 独立训练页 |

**Modify**

| 文件 | 改动 |
|---|---|
| `package.json` | 增加 `test`/`test:watch` scripts 与 Vitest devDependency |
| `pnpm-lock.yaml` | 安装 Vitest 后自动更新 |
| `hooks/use-indexed-db.ts` | DB 版本升级并确保 workout stores 创建 |
| `hooks/use-date-records.ts` | 使用共享 IndexedDB 常量,避免版本冲突 |
| `hooks/use-export-reminder.ts` | 使用共享 IndexedDB 常量,避免版本冲突 |
| `hooks/use-ai-memory.ts` | 使用共享 IndexedDB 常量,避免版本冲突 |
| `app/[locale]/settings/page.tsx` | 所有手写 `indexedDB.open` 改用共享常量 |
| `components/main-nav.tsx` | 增加训练页导航入口 |
| `components/workout/workout-exercise-card.tsx` | 接入 `useTranslation("workout")` |
| `components/workout/workout-plan-workbench.tsx` | 接入 `useTranslation("workout")` |
| `app/[locale]/workout/page.tsx` | 接入 `useTranslation("workout")` |
| `messages/zh.json` | 新增 `navigation.workout` 与 `workout.*` 文案 |
| `messages/en.json` | 同上英文文案 |

---

## Task 1: Add Vitest Test Baseline

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `tests/workout-session.test.ts`

- [ ] **Step 1: Install Vitest**

Run: `pnpm add -D vitest`

Expected:

- `package.json` devDependencies includes `vitest`
- `pnpm-lock.yaml` updates
- command exits with code 0

- [ ] **Step 2: Add test scripts to `package.json`**

In `package.json`, replace the `scripts` object with:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import path from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
})
```

- [ ] **Step 4: Create a failing smoke test**

Create `tests/workout-session.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { createWorkoutSessionFromPlan } from "@/lib/workout/session"

describe("workout session core", () => {
  it("creates a current draft session for first use", () => {
    const session = createWorkoutSessionFromPlan({
      sessionRole: "current",
      effectiveUserWeightKg: 72,
      planContext: {
        generatedAt: "2026-04-23T00:00:00.000Z",
        userGoal: "gain_muscle",
        recentWorkoutSessionSummaries: [],
        recentExerciseEntries: [],
        fatigueSnapshot: {},
      },
      exercises: [
        {
          plannedExerciseName: "卧推",
          notes: "保持肩胛稳定",
          sets: [
            { plannedWeightKg: 60, plannedReps: 8 },
            { plannedWeightKg: 60, plannedReps: 8 },
          ],
          plannedAnalysis: {
            exerciseType: "strength",
            muscleGroups: ["chest", "triceps"],
            estimatedMets: 6,
            estimatedDurationMinutes: 12,
            caloriesBurnedEstimated: 86,
            isEstimated: true,
          },
        },
      ],
      now: "2026-04-23T09:00:00.000Z",
    })

    expect(session.sessionRole).toBe("current")
    expect(session.status).toBe("draft")
    expect(session.exercises[0].sets[0].actualWeightKg).toBe(60)
    expect(session.derived.totalSetCount).toBe(2)
  })
})
```

- [ ] **Step 5: Run the test and verify it fails**

Run: `pnpm test -- tests/workout-session.test.ts`

Expected: FAIL with module resolution error for `@/lib/workout/session`.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts tests/workout-session.test.ts
git commit -m "test(workout): 添加训练计划纯函数测试基线"
```

---

## Task 2: Implement Workout Types And Core Pure Functions

**Files:**
- Create: `lib/workout/types.ts`
- Create: `lib/workout/session.ts`
- Modify: `tests/workout-session.test.ts`

- [ ] **Step 1: Create `lib/workout/types.ts`**

```ts
import type { ExerciseEntry } from "@/lib/types"

export type WorkoutSessionRole = "current" | "next"
export type WorkoutSessionStatus =
  | "draft"
  | "active"
  | "finishing"
  | "completed"
  | "abandoned"

export type WorkoutExerciseAnalysisStatus =
  | "planned"
  | "stale"
  | "enriched"
  | "fallback"

export interface WorkoutExerciseAnalysis {
  exerciseType: ExerciseEntry["exercise_type"]
  muscleGroups: string[]
  estimatedMets: number
  estimatedDurationMinutes: number
  caloriesBurnedEstimated: number
  isEstimated: boolean
}

export interface WorkoutSessionSet {
  setIndex: number
  plannedWeightKg?: number
  plannedReps?: number
  actualWeightKg?: number
  actualReps?: number
  touched: {
    weight: boolean
    reps: boolean
  }
  isCompleted: boolean
  completedAt?: string
  isSkipped: boolean
}

export interface WorkoutSessionExercise {
  exerciseId: string
  plannedExerciseName: string
  actualExerciseName?: string
  notes?: string
  sets: WorkoutSessionSet[]
  isExerciseSkipped: boolean
  analysisStatus: WorkoutExerciseAnalysisStatus
  plannedAnalysis: WorkoutExerciseAnalysis
  enrichedAnalysis?: WorkoutExerciseAnalysis
}

export interface RecentWorkoutSessionSummary {
  completedAt: string
  exercises: Array<{
    exerciseName: string
    completedSets: number
    averageWeightKg?: number
    averageReps?: number
    wasReplaced: boolean
    wasSkipped: boolean
    muscleGroups: string[]
  }>
}

export interface ExerciseEntrySummary {
  date: string
  exerciseName: string
  exerciseType: ExerciseEntry["exercise_type"]
  sets?: number
  reps?: number
  weightKg?: number
  muscleGroups: string[]
}

export interface WorkoutPlanContextSnapshot {
  generatedAt: string
  userGoal: string
  recentWorkoutSessionSummaries: RecentWorkoutSessionSummary[]
  recentExerciseEntries: ExerciseEntrySummary[]
  fatigueSnapshot: Record<
    string,
    {
      intensity: 0 | 30 | 60 | 100
      daysAgo: 0 | 1 | 2 | null
      lastExerciseName: string | null
    }
  >
}

export interface WorkoutSessionDerived {
  completedSetCount: number
  totalSetCount: number
  skippedSetCount: number
  replacedExerciseCount: number
  exerciseCompletionRate: number
}

export interface WorkoutSession {
  sessionId: string
  sessionRole: WorkoutSessionRole
  status: WorkoutSessionStatus
  createdAt: string
  startedAt?: string
  completedAt?: string
  effectiveUserWeightKg: number
  planContext: WorkoutPlanContextSnapshot
  exercises: WorkoutSessionExercise[]
  derived: WorkoutSessionDerived
}

export interface WorkoutPlanExerciseDraft {
  plannedExerciseName: string
  notes?: string
  sets: Array<{
    plannedWeightKg?: number
    plannedReps?: number
  }>
  plannedAnalysis: WorkoutExerciseAnalysis
}

export interface CreateWorkoutSessionInput {
  sessionRole: WorkoutSessionRole
  effectiveUserWeightKg: number
  planContext: WorkoutPlanContextSnapshot
  exercises: WorkoutPlanExerciseDraft[]
  now: string
}
```

- [ ] **Step 2: Create `lib/workout/session.ts`**

```ts
import { v4 as uuidv4 } from "uuid"
import type { ExerciseEntry } from "@/lib/types"
import type {
  CreateWorkoutSessionInput,
  WorkoutExerciseAnalysis,
  WorkoutSession,
  WorkoutSessionDerived,
  WorkoutSessionExercise,
  WorkoutSessionSet,
} from "@/lib/workout/types"

export const FALLBACK_STRENGTH_ANALYSIS: WorkoutExerciseAnalysis = {
  exerciseType: "strength",
  muscleGroups: [],
  estimatedMets: 6,
  estimatedDurationMinutes: 10,
  caloriesBurnedEstimated: 50,
  isEstimated: true,
}

function recalculateDerived(exercises: WorkoutSessionExercise[]): WorkoutSessionDerived {
  const flatSets = exercises.flatMap((exercise) => exercise.sets)
  const totalSetCount = flatSets.filter((set) => !set.isSkipped).length
  const completedSetCount = flatSets.filter(
    (set) => !set.isSkipped && set.isCompleted,
  ).length
  const skippedSetCount = flatSets.filter((set) => set.isSkipped).length
  const replacedExerciseCount = exercises.filter(
    (exercise) => Boolean(exercise.actualExerciseName),
  ).length

  return {
    completedSetCount,
    totalSetCount,
    skippedSetCount,
    replacedExerciseCount,
    exerciseCompletionRate:
      totalSetCount === 0 ? 1 : completedSetCount / totalSetCount,
  }
}

export function refreshWorkoutSessionDerived(
  session: WorkoutSession,
): WorkoutSession {
  return {
    ...session,
    derived: recalculateDerived(session.exercises),
  }
}

export function createWorkoutSessionFromPlan(
  input: CreateWorkoutSessionInput,
): WorkoutSession {
  const exercises = input.exercises.map((exercise) => ({
    exerciseId: uuidv4(),
    plannedExerciseName: exercise.plannedExerciseName,
    notes: exercise.notes,
    isExerciseSkipped: false,
    analysisStatus: "planned" as const,
    plannedAnalysis: exercise.plannedAnalysis,
    sets: exercise.sets.map((set, index) => ({
      setIndex: index + 1,
      plannedWeightKg: set.plannedWeightKg,
      plannedReps: set.plannedReps,
      actualWeightKg: set.plannedWeightKg,
      actualReps: set.plannedReps,
      touched: {
        weight: false,
        reps: false,
      },
      isCompleted: false,
      isSkipped: false,
    })),
  }))

  return refreshWorkoutSessionDerived({
    sessionId: uuidv4(),
    sessionRole: input.sessionRole,
    status: "draft",
    createdAt: input.now,
    effectiveUserWeightKg: input.effectiveUserWeightKg,
    planContext: input.planContext,
    exercises,
    derived: {
      completedSetCount: 0,
      totalSetCount: 0,
      skippedSetCount: 0,
      replacedExerciseCount: 0,
      exerciseCompletionRate: 0,
    },
  })
}

export function updateWorkoutSetValue(
  session: WorkoutSession,
  exerciseId: string,
  setIndex: number,
  field: "weight" | "reps",
  value: number,
): WorkoutSession {
  const exercises = session.exercises.map((exercise) => {
    if (exercise.exerciseId !== exerciseId) return exercise

    const sets = exercise.sets.map((set) => {
      if (set.setIndex === setIndex) {
        return field === "weight"
          ? {
              ...set,
              actualWeightKg: value,
              touched: { ...set.touched, weight: true },
            }
          : {
              ...set,
              actualReps: value,
              touched: { ...set.touched, reps: true },
            }
      }

      if (set.setIndex > setIndex && !set.isCompleted && !set.isSkipped) {
        if (field === "weight" && !set.touched.weight) {
          return { ...set, actualWeightKg: value }
        }
        if (field === "reps" && !set.touched.reps) {
          return { ...set, actualReps: value }
        }
      }

      return set
    })

    return { ...exercise, sets }
  })

  return refreshWorkoutSessionDerived({ ...session, exercises })
}

export function completeWorkoutSet(
  session: WorkoutSession,
  exerciseId: string,
  setIndex: number,
  now: string,
): WorkoutSession {
  const exercises = session.exercises.map((exercise) => {
    if (exercise.exerciseId !== exerciseId) return exercise
    return {
      ...exercise,
      sets: exercise.sets.map((set) =>
        set.setIndex === setIndex && !set.isSkipped
          ? { ...set, isCompleted: true, completedAt: now }
          : set,
      ),
    }
  })

  const nextSession = refreshWorkoutSessionDerived({
    ...session,
    sessionRole: "current",
    status: "active",
    startedAt: session.startedAt ?? now,
    exercises,
  })

  return nextSession
}

export function replaceWorkoutExercise(
  session: WorkoutSession,
  exerciseId: string,
  actualExerciseName: string,
): WorkoutSession {
  const trimmed = actualExerciseName.trim()
  if (!trimmed) return session

  const exercises = session.exercises.map((exercise) =>
    exercise.exerciseId === exerciseId
      ? {
          ...exercise,
          actualExerciseName: trimmed,
          analysisStatus: "stale" as const,
          enrichedAnalysis: undefined,
        }
      : exercise,
  )

  return refreshWorkoutSessionDerived({ ...session, exercises })
}

export function setWorkoutExerciseSkipped(
  session: WorkoutSession,
  exerciseId: string,
  isSkipped: boolean,
): WorkoutSession {
  const exercises = session.exercises.map((exercise) =>
    exercise.exerciseId === exerciseId
      ? {
          ...exercise,
          isExerciseSkipped: isSkipped,
          sets: exercise.sets.map((set) => ({
            ...set,
            isSkipped,
            isCompleted: isSkipped ? false : set.isCompleted,
            completedAt: isSkipped ? undefined : set.completedAt,
          })),
        }
      : exercise,
  )

  return refreshWorkoutSessionDerived({ ...session, exercises })
}

export function canCompleteWorkoutSession(session: WorkoutSession): boolean {
  if (session.status !== "active") return false
  return session.exercises.every((exercise) =>
    exercise.sets.every((set) => set.isSkipped || set.isCompleted),
  )
}

function average(values: number[]): number | undefined {
  if (values.length === 0) return undefined
  const sum = values.reduce((acc, value) => acc + value, 0)
  return Math.round((sum / values.length) * 10) / 10
}

export function workoutSessionToExerciseEntries(
  session: WorkoutSession,
  completedAt: string,
): ExerciseEntry[] {
  return session.exercises
    .filter((exercise) => !exercise.isExerciseSkipped)
    .map((exercise) => {
      const completedSets = exercise.sets.filter(
        (set) => !set.isSkipped && set.isCompleted,
      )
      const analysis =
        exercise.enrichedAnalysis ??
        (exercise.analysisStatus === "fallback"
          ? FALLBACK_STRENGTH_ANALYSIS
          : exercise.plannedAnalysis)

      return {
        log_id: uuidv4(),
        exercise_name:
          exercise.actualExerciseName ?? exercise.plannedExerciseName,
        exercise_type: analysis.exerciseType,
        duration_minutes: analysis.estimatedDurationMinutes,
        sets: completedSets.length,
        reps: average(
          completedSets
            .map((set) => set.actualReps)
            .filter((value): value is number => typeof value === "number"),
        ),
        weight_kg: average(
          completedSets
            .map((set) => set.actualWeightKg)
            .filter((value): value is number => typeof value === "number"),
        ),
        estimated_mets: analysis.estimatedMets,
        user_weight: session.effectiveUserWeightKg,
        calories_burned_estimated: analysis.caloriesBurnedEstimated,
        muscle_groups: analysis.muscleGroups,
        is_estimated: true,
        timestamp: completedAt,
      }
    })
}
```

- [ ] **Step 3: Replace `tests/workout-session.test.ts` with full pure-function tests**

```ts
import { describe, expect, it } from "vitest"
import {
  canCompleteWorkoutSession,
  completeWorkoutSet,
  createWorkoutSessionFromPlan,
  replaceWorkoutExercise,
  setWorkoutExerciseSkipped,
  updateWorkoutSetValue,
  workoutSessionToExerciseEntries,
} from "@/lib/workout/session"
import type { CreateWorkoutSessionInput } from "@/lib/workout/types"

function makeInput(): CreateWorkoutSessionInput {
  return {
    sessionRole: "current",
    effectiveUserWeightKg: 72,
    planContext: {
      generatedAt: "2026-04-23T00:00:00.000Z",
      userGoal: "gain_muscle",
      recentWorkoutSessionSummaries: [],
      recentExerciseEntries: [],
      fatigueSnapshot: {},
    },
    exercises: [
      {
        plannedExerciseName: "卧推",
        notes: "保持肩胛稳定",
        sets: [
          { plannedWeightKg: 60, plannedReps: 8 },
          { plannedWeightKg: 60, plannedReps: 8 },
          { plannedWeightKg: 60, plannedReps: 8 },
        ],
        plannedAnalysis: {
          exerciseType: "strength",
          muscleGroups: ["chest", "triceps"],
          estimatedMets: 6,
          estimatedDurationMinutes: 12,
          caloriesBurnedEstimated: 86,
          isEstimated: true,
        },
      },
      {
        plannedExerciseName: "划船",
        sets: [{ plannedWeightKg: 50, plannedReps: 10 }],
        plannedAnalysis: {
          exerciseType: "strength",
          muscleGroups: ["upper-back", "biceps"],
          estimatedMets: 6,
          estimatedDurationMinutes: 8,
          caloriesBurnedEstimated: 58,
          isEstimated: true,
        },
      },
    ],
    now: "2026-04-23T09:00:00.000Z",
  }
}

describe("workout session core", () => {
  it("creates a current draft session for first use", () => {
    const session = createWorkoutSessionFromPlan(makeInput())

    expect(session.sessionRole).toBe("current")
    expect(session.status).toBe("draft")
    expect(session.exercises[0].sets[0].actualWeightKg).toBe(60)
    expect(session.derived.totalSetCount).toBe(4)
  })

  it("syncs changed weight only to later untouched unfinished sets", () => {
    const session = createWorkoutSessionFromPlan(makeInput())
    const exerciseId = session.exercises[0].exerciseId

    const withSecondTouched = updateWorkoutSetValue(
      session,
      exerciseId,
      2,
      "weight",
      57.5,
    )
    const afterFirstChanged = updateWorkoutSetValue(
      withSecondTouched,
      exerciseId,
      1,
      "weight",
      55,
    )

    expect(afterFirstChanged.exercises[0].sets[0].actualWeightKg).toBe(55)
    expect(afterFirstChanged.exercises[0].sets[1].actualWeightKg).toBe(57.5)
    expect(afterFirstChanged.exercises[0].sets[2].actualWeightKg).toBe(55)
  })

  it("turns a next draft into current active when first set is completed", () => {
    const session = createWorkoutSessionFromPlan({
      ...makeInput(),
      sessionRole: "next",
    })
    const exerciseId = session.exercises[0].exerciseId

    const active = completeWorkoutSet(
      session,
      exerciseId,
      1,
      "2026-04-24T10:00:00.000Z",
    )

    expect(active.sessionRole).toBe("current")
    expect(active.status).toBe("active")
    expect(active.startedAt).toBe("2026-04-24T10:00:00.000Z")
  })

  it("marks replaced exercise analysis as stale", () => {
    const session = createWorkoutSessionFromPlan(makeInput())
    const exerciseId = session.exercises[0].exerciseId

    const replaced = replaceWorkoutExercise(session, exerciseId, "哑铃卧推")

    expect(replaced.exercises[0].actualExerciseName).toBe("哑铃卧推")
    expect(replaced.exercises[0].analysisStatus).toBe("stale")
  })

  it("allows completion after all non-skipped sets are completed", () => {
    let session = createWorkoutSessionFromPlan(makeInput())
    const firstExercise = session.exercises[0].exerciseId
    const secondExercise = session.exercises[1].exerciseId

    session = setWorkoutExerciseSkipped(session, secondExercise, true)
    session = completeWorkoutSet(session, firstExercise, 1, "2026-04-23T10:00:00.000Z")
    session = completeWorkoutSet(session, firstExercise, 2, "2026-04-23T10:02:00.000Z")
    session = completeWorkoutSet(session, firstExercise, 3, "2026-04-23T10:04:00.000Z")

    expect(canCompleteWorkoutSession(session)).toBe(true)
  })

  it("maps completed session into exercise entries for DailyLog", () => {
    let session = createWorkoutSessionFromPlan(makeInput())
    const exerciseId = session.exercises[0].exerciseId
    session = completeWorkoutSet(session, exerciseId, 1, "2026-04-23T10:00:00.000Z")
    session = completeWorkoutSet(session, exerciseId, 2, "2026-04-23T10:02:00.000Z")
    session = completeWorkoutSet(session, exerciseId, 3, "2026-04-23T10:04:00.000Z")
    session = setWorkoutExerciseSkipped(session, session.exercises[1].exerciseId, true)

    const entries = workoutSessionToExerciseEntries(
      session,
      "2026-04-23T10:05:00.000Z",
    )

    expect(entries).toHaveLength(1)
    expect(entries[0].exercise_name).toBe("卧推")
    expect(entries[0].sets).toBe(3)
    expect(entries[0].reps).toBe(8)
    expect(entries[0].weight_kg).toBe(60)
    expect(entries[0].muscle_groups).toEqual(["chest", "triceps"])
    expect(entries[0].calories_burned_estimated).toBe(86)
  })
})
```

- [ ] **Step 4: Run pure tests**

Run: `pnpm test -- tests/workout-session.test.ts`

Expected: PASS, all 6 tests pass.

- [ ] **Step 5: Build**

Run: `pnpm build`

Expected: Next.js build exits with code 0.

- [ ] **Step 6: Commit**

```bash
git add lib/workout/types.ts lib/workout/session.ts tests/workout-session.test.ts
git commit -m "feat(workout): 添加训练 session 核心模型与纯函数"
```

---

## Task 3: Add AI Schemas For Plan And Exercise Enrichment

**Files:**
- Create: `lib/ai/schemas/workout-plan.ts`
- Create: `lib/ai/schemas/workout-exercise-enrich.ts`
- Create: `tests/workout-ai-schemas.test.ts`

- [ ] **Step 1: Create failing schema tests**

Create `tests/workout-ai-schemas.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { WorkoutExerciseEnrichSchema } from "@/lib/ai/schemas/workout-exercise-enrich"
import { WorkoutPlanSchema } from "@/lib/ai/schemas/workout-plan"

describe("workout AI schemas", () => {
  it("parses a workout plan with analysis values", () => {
    const parsed = WorkoutPlanSchema.parse({
      exercises: [
        {
          plannedExerciseName: "深蹲",
          notes: "控制下放",
          sets: [
            { plannedWeightKg: 80, plannedReps: 5 },
            { plannedWeightKg: 80, plannedReps: 5 },
          ],
          plannedAnalysis: {
            exerciseType: "strength",
            muscleGroups: ["quadriceps", "glutes"],
            estimatedMets: 6.5,
            estimatedDurationMinutes: 14,
            caloriesBurnedEstimated: 110,
            isEstimated: true,
          },
        },
      ],
    })

    expect(parsed.exercises[0].plannedAnalysis.muscleGroups).toEqual([
      "quadriceps",
      "glutes",
    ])
  })

  it("filters empty muscle groups and clamps unsafe numeric values", () => {
    const parsed = WorkoutExerciseEnrichSchema.parse({
      exerciseType: "strength",
      muscleGroups: ["chest", ""],
      estimatedMets: -1,
      estimatedDurationMinutes: 0,
      caloriesBurnedEstimated: -20,
      isEstimated: true,
    })

    expect(parsed.muscleGroups).toEqual(["chest"])
    expect(parsed.estimatedMets).toBe(1)
    expect(parsed.estimatedDurationMinutes).toBe(1)
    expect(parsed.caloriesBurnedEstimated).toBe(0)
  })
})
```

- [ ] **Step 2: Run schema tests and verify failure**

Run: `pnpm test -- tests/workout-ai-schemas.test.ts`

Expected: FAIL with module resolution error for `workout-plan` or `workout-exercise-enrich`.

- [ ] **Step 3: Create `lib/ai/schemas/workout-exercise-enrich.ts`**

```ts
import { z } from "zod"

export const WorkoutExerciseTypeSchema = z.enum([
  "cardio",
  "strength",
  "flexibility",
  "other",
])

export const WorkoutExerciseAnalysisSchema = z.object({
  exerciseType: WorkoutExerciseTypeSchema,
  muscleGroups: z
    .array(z.string())
    .default([])
    .transform((items) => items.map((item) => item.trim()).filter(Boolean)),
  estimatedMets: z.number().transform((value) => Math.max(1, value)),
  estimatedDurationMinutes: z
    .number()
    .transform((value) => Math.max(1, Math.round(value))),
  caloriesBurnedEstimated: z.number().transform((value) => Math.max(0, value)),
  isEstimated: z.boolean().default(true),
})

export const WorkoutExerciseEnrichSchema = WorkoutExerciseAnalysisSchema

export type WorkoutExerciseEnrichResult = z.infer<
  typeof WorkoutExerciseEnrichSchema
>
```

- [ ] **Step 4: Create `lib/ai/schemas/workout-plan.ts`**

```ts
import { z } from "zod"
import { WorkoutExerciseAnalysisSchema } from "@/lib/ai/schemas/workout-exercise-enrich"

const WorkoutPlanSetSchema = z.object({
  plannedWeightKg: z.number().optional(),
  plannedReps: z.number().optional(),
})

const WorkoutPlanExerciseSchema = z.object({
  plannedExerciseName: z.string().min(1),
  notes: z.string().optional(),
  sets: z.array(WorkoutPlanSetSchema).min(1),
  plannedAnalysis: WorkoutExerciseAnalysisSchema,
})

export const WorkoutPlanSchema = z.object({
  exercises: z.array(WorkoutPlanExerciseSchema).min(1),
})

export type WorkoutPlanResult = z.infer<typeof WorkoutPlanSchema>
```

- [ ] **Step 5: Run schema tests**

Run: `pnpm test -- tests/workout-ai-schemas.test.ts`

Expected: PASS, both tests pass.

- [ ] **Step 6: Build**

Run: `pnpm build`

Expected: build exits with code 0.

- [ ] **Step 7: Commit**

```bash
git add lib/ai/schemas/workout-plan.ts lib/ai/schemas/workout-exercise-enrich.ts tests/workout-ai-schemas.test.ts
git commit -m "feat(workout): 添加训练计划 AI schema"
```

---

## Task 4: Expand IndexedDB Support And Add Workout Session Hook

**Files:**
- Create: `lib/indexed-db.ts`
- Modify: `hooks/use-indexed-db.ts`
- Modify: `hooks/use-date-records.ts`
- Modify: `hooks/use-export-reminder.ts`
- Modify: `hooks/use-ai-memory.ts`
- Modify: `app/[locale]/settings/page.tsx`
- Create: `hooks/use-workout-sessions.ts`

- [ ] **Step 1: Create `lib/indexed-db.ts`**

```ts
export const HEALTH_DB_NAME = "healthApp"
export const HEALTH_DB_VERSION = 3

export const HEALTH_DB_STORES = {
  healthLogs: "healthLogs",
  aiMemories: "aiMemories",
  workoutSessions: "workoutSessions",
  workoutSessionMeta: "workoutSessionMeta",
} as const
```

- [ ] **Step 2: Update `hooks/use-indexed-db.ts` database version and store creation**

In `hooks/use-indexed-db.ts`, keep `"use client"` as the first line and add this import below the existing React import:

```ts
import {
  HEALTH_DB_NAME,
  HEALTH_DB_STORES,
  HEALTH_DB_VERSION,
} from "@/lib/indexed-db"
```

Replace:

```ts
const request = window.indexedDB.open(HEALTH_DB_NAME, HEALTH_DB_VERSION)
```

Inside `request.onupgradeneeded`, after the `aiMemories` store block, add:

```ts
          if (!db.objectStoreNames.contains(HEALTH_DB_STORES.workoutSessions)) {
            db.createObjectStore(HEALTH_DB_STORES.workoutSessions)
          }
          if (!db.objectStoreNames.contains(HEALTH_DB_STORES.workoutSessionMeta)) {
            db.createObjectStore(HEALTH_DB_STORES.workoutSessionMeta)
          }
```

- [ ] **Step 3: Replace every hardcoded `indexedDB.open("healthApp", 1 or 2)` call**

Apply these exact replacements:

- In `hooks/use-date-records.ts`, keep `"use client"` as the first line and add:

```ts
import { HEALTH_DB_NAME, HEALTH_DB_VERSION } from "@/lib/indexed-db"
```

Then replace:

```ts
const request = indexedDB.open('healthApp', 2)
```

with:

```ts
const request = indexedDB.open(HEALTH_DB_NAME, HEALTH_DB_VERSION)
```

- In `hooks/use-export-reminder.ts`, add:

```ts
import { HEALTH_DB_NAME, HEALTH_DB_VERSION } from "@/lib/indexed-db"
```

Then replace:

```ts
const request = indexedDB.open('healthApp', 1)
```

with:

```ts
const request = indexedDB.open(HEALTH_DB_NAME, HEALTH_DB_VERSION)
```

- In `hooks/use-ai-memory.ts`, keep `"use client"` as the first line and add:

```ts
import { HEALTH_DB_NAME, HEALTH_DB_VERSION } from "@/lib/indexed-db"
```

Then replace:

```ts
const request = window.indexedDB.open("healthApp", 2)
```

with:

```ts
const request = window.indexedDB.open(HEALTH_DB_NAME, HEALTH_DB_VERSION)
```

- In `app/[locale]/settings/page.tsx`, add:

```ts
import { HEALTH_DB_NAME, HEALTH_DB_VERSION } from "@/lib/indexed-db"
```

Then replace all five occurrences of:

```ts
window.indexedDB.open("healthApp", 2)
```

or:

```ts
indexedDB.open("healthApp", 2)
```

with:

```ts
window.indexedDB.open(HEALTH_DB_NAME, HEALTH_DB_VERSION)
```

or:

```ts
indexedDB.open(HEALTH_DB_NAME, HEALTH_DB_VERSION)
```

- [ ] **Step 4: Create `hooks/use-workout-sessions.ts`**

```ts
"use client"

import { useCallback, useEffect, useState } from "react"
import { useIndexedDB } from "@/hooks/use-indexed-db"
import type { WorkoutSession } from "@/lib/workout/types"

interface WorkoutSessionMeta {
  activeSessionId?: string
  completedSessionIds: string[]
}

const META_KEY = "singleton"
const EMPTY_META: WorkoutSessionMeta = {
  completedSessionIds: [],
}

export function useWorkoutSessions() {
  const {
    getData: getSessionData,
    saveData: saveSessionData,
    isInitializing: sessionsInitializing,
  } = useIndexedDB("workoutSessions")
  const {
    getData: getMetaData,
    saveData: saveMetaData,
    isInitializing: metaInitializing,
  } = useIndexedDB("workoutSessionMeta")
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null)
  const [meta, setMeta] = useState<WorkoutSessionMeta>(EMPTY_META)
  const [isReady, setIsReady] = useState(false)

  const refresh = useCallback(async () => {
    if (sessionsInitializing || metaInitializing) return

    const storedMeta =
      ((await getMetaData(META_KEY)) as WorkoutSessionMeta | null) ??
      EMPTY_META
    setMeta(storedMeta)

    if (storedMeta.activeSessionId) {
      const storedSession = (await getSessionData(
        storedMeta.activeSessionId,
      )) as WorkoutSession | null
      setActiveSession(storedSession)
    } else {
      setActiveSession(null)
    }

    setIsReady(true)
  }, [getMetaData, getSessionData, metaInitializing, sessionsInitializing])

  useEffect(() => {
    refresh()
  }, [refresh])

  const saveActiveSession = useCallback(
    async (session: WorkoutSession) => {
      await saveSessionData(session.sessionId, session)
      const nextMeta: WorkoutSessionMeta = {
        ...meta,
        activeSessionId: session.sessionId,
      }
      await saveMetaData(META_KEY, nextMeta)
      setMeta(nextMeta)
      setActiveSession(session)
    },
    [meta, saveMetaData, saveSessionData],
  )

  const markSessionCompleted = useCallback(
    async (session: WorkoutSession) => {
      await saveSessionData(session.sessionId, session)
      const nextMeta: WorkoutSessionMeta = {
        activeSessionId: undefined,
        completedSessionIds: [
          session.sessionId,
          ...meta.completedSessionIds.filter((id) => id !== session.sessionId),
        ],
      }
      await saveMetaData(META_KEY, nextMeta)
      setMeta(nextMeta)
      setActiveSession(null)
    },
    [meta.completedSessionIds, saveMetaData, saveSessionData],
  )

  const hasCompletedWorkout = meta.completedSessionIds.length > 0

  const getCompletedSessions = useCallback(
    async (limit = 5): Promise<WorkoutSession[]> => {
      const ids = meta.completedSessionIds.slice(0, limit)
      const sessions = await Promise.all(
        ids.map((id) => getSessionData(id) as Promise<WorkoutSession | null>),
      )
      return sessions.filter((item): item is WorkoutSession => Boolean(item))
    },
    [getSessionData, meta.completedSessionIds],
  )

  return {
    activeSession,
    hasCompletedWorkout,
    isReady,
    refresh,
    saveActiveSession,
    markSessionCompleted,
    getCompletedSessions,
  }
}
```

- [ ] **Step 5: Build**

Run: `pnpm build`

Expected: build exits with code 0.

- [ ] **Step 6: Commit**

```bash
git add lib/indexed-db.ts hooks/use-indexed-db.ts hooks/use-date-records.ts hooks/use-export-reminder.ts hooks/use-ai-memory.ts app/[locale]/settings/page.tsx hooks/use-workout-sessions.ts
git commit -m "feat(workout): 添加训练 session 本地存储 hook"
```

---

## Task 5: Build Workout Context Helpers

**Files:**
- Create: `lib/workout/context.ts`

- [ ] **Step 1: Create `lib/workout/context.ts`**

```ts
import { format, parseISO, subDays } from "date-fns"
import { computeMuscleFatigue } from "@/lib/muscle-fatigue"
import type { DailyLog, UserProfile } from "@/lib/types"
import type {
  ExerciseEntrySummary,
  RecentWorkoutSessionSummary,
  WorkoutPlanContextSnapshot,
  WorkoutSession,
} from "@/lib/workout/types"

export function getEffectiveUserWeightKg(
  logsByDateDesc: DailyLog[],
  userProfile: UserProfile,
): number {
  const recentLoggedWeight = logsByDateDesc.find(
    (log) => typeof log.weight === "number" && log.weight > 0,
  )?.weight

  return recentLoggedWeight ?? userProfile.weight
}

export function summarizeWorkoutSession(
  session: WorkoutSession,
): RecentWorkoutSessionSummary {
  return {
    completedAt: session.completedAt ?? session.createdAt,
    exercises: session.exercises.map((exercise) => {
      const completedSets = exercise.sets.filter(
        (set) => !set.isSkipped && set.isCompleted,
      )
      const weights = completedSets
        .map((set) => set.actualWeightKg)
        .filter((value): value is number => typeof value === "number")
      const reps = completedSets
        .map((set) => set.actualReps)
        .filter((value): value is number => typeof value === "number")

      return {
        exerciseName:
          exercise.actualExerciseName ?? exercise.plannedExerciseName,
        completedSets: completedSets.length,
        averageWeightKg: average(weights),
        averageReps: average(reps),
        wasReplaced: Boolean(exercise.actualExerciseName),
        wasSkipped: exercise.isExerciseSkipped,
        muscleGroups: (
          exercise.enrichedAnalysis ?? exercise.plannedAnalysis
        ).muscleGroups,
      }
    }),
  }
}

export function summarizeExerciseEntries(
  logsByDateDesc: DailyLog[],
): ExerciseEntrySummary[] {
  return logsByDateDesc.flatMap((log) =>
    log.exerciseEntries.map((entry) => ({
      date: log.date,
      exerciseName: entry.exercise_name,
      exerciseType: entry.exercise_type,
      sets: entry.sets,
      reps: entry.reps,
      weightKg: entry.weight_kg,
      muscleGroups: entry.muscle_groups ?? [],
    })),
  )
}

export function buildWorkoutPlanContextSnapshot(input: {
  now: string
  userProfile: UserProfile
  recentLogsByDateDesc: DailyLog[]
  recentCompletedSessions: WorkoutSession[]
}): WorkoutPlanContextSnapshot {
  const today = parseISO(input.now)
  const logsByDaysAgo = [0, 1, 2].map((daysAgo) => {
    const dateKey = format(subDays(today, daysAgo), "yyyy-MM-dd")
    return input.recentLogsByDateDesc.find((log) => log.date === dateKey) ?? null
  })

  return {
    generatedAt: input.now,
    userGoal: input.userProfile.goal,
    recentWorkoutSessionSummaries: input.recentCompletedSessions
      .slice(0, 5)
      .map(summarizeWorkoutSession),
    recentExerciseEntries: summarizeExerciseEntries(
      input.recentLogsByDateDesc.slice(0, 14),
    ),
    fatigueSnapshot: computeMuscleFatigue(logsByDaysAgo),
  }
}

function average(values: number[]): number | undefined {
  if (values.length === 0) return undefined
  const sum = values.reduce((acc, value) => acc + value, 0)
  return Math.round((sum / values.length) * 10) / 10
}
```

- [ ] **Step 2: Add context helper tests to `tests/workout-session.test.ts`**

Add these imports near the top of `tests/workout-session.test.ts`, under the existing imports:

```ts
import {
  buildWorkoutPlanContextSnapshot,
  getEffectiveUserWeightKg,
} from "@/lib/workout/context"
import type { DailyLog, UserProfile } from "@/lib/types"
```

Then append this block at the end of the file:

```ts

const baseProfile: UserProfile = {
  weight: 70,
  height: 170,
  age: 30,
  gender: "male",
  activityLevel: "moderate",
  goal: "gain_muscle",
}

const emptySummary = {
  totalCaloriesConsumed: 0,
  totalCaloriesBurned: 0,
  macros: { carbs: 0, protein: 0, fat: 0 },
  micronutrients: {},
}

describe("workout context", () => {
  it("uses most recent logged daily weight before profile weight", () => {
    const logs = [
      {
        date: "2026-04-23",
        foodEntries: [],
        exerciseEntries: [],
        summary: emptySummary,
        weight: 73,
      },
    ] satisfies DailyLog[]

    expect(getEffectiveUserWeightKg(logs, baseProfile)).toBe(73)
  })

  it("builds fatigue snapshot from recent DailyLog exercise entries", () => {
    const logs = [
      {
        date: "2026-04-23",
        foodEntries: [],
        exerciseEntries: [
          {
            log_id: "e1",
            exercise_name: "深蹲",
            exercise_type: "strength",
            duration_minutes: 30,
            sets: 3,
            reps: 8,
            weight_kg: 80,
            estimated_mets: 6,
            user_weight: 73,
            calories_burned_estimated: 180,
            muscle_groups: ["quadriceps"],
            is_estimated: true,
          },
        ],
        summary: emptySummary,
      },
    ] satisfies DailyLog[]

    const context = buildWorkoutPlanContextSnapshot({
      now: "2026-04-23T12:00:00.000Z",
      userProfile: baseProfile,
      recentLogsByDateDesc: logs,
      recentCompletedSessions: [],
    })

    expect(context.fatigueSnapshot.quadriceps?.intensity).toBe(100)
  })
})
```

- [ ] **Step 3: Run tests**

Run: `pnpm test -- tests/workout-session.test.ts`

Expected: PASS.

- [ ] **Step 4: Build**

Run: `pnpm build`

Expected: build exits with code 0.

- [ ] **Step 5: Commit**

```bash
git add lib/workout/context.ts tests/workout-session.test.ts
git commit -m "feat(workout): 构建训练计划历史上下文"
```

---

## Task 6: Add Workout AI Routes

**Files:**
- Create: `app/api/ai/workout-plan/route.ts`
- Create: `app/api/ai/workout-exercise-enrich/route.ts`

- [ ] **Step 1: Create `app/api/ai/workout-plan/route.ts`**

```ts
import { generateObject } from "ai"
import {
  createAIClient,
  extractAIConfig,
  validateModelConfig,
} from "@/lib/ai/client"
import { AIError, handleAIError } from "@/lib/ai/errors"
import { WorkoutPlanSchema } from "@/lib/ai/schemas/workout-plan"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      effectiveUserWeightKg,
      userProfile,
      recentWorkoutSessionSummaries,
      recentExerciseEntries,
      fatigueSnapshot,
    } = body

    if (!effectiveUserWeightKg || !userProfile || !fatigueSnapshot) {
      throw new AIError("INVALID_INPUT", "Invalid workout plan input")
    }

    const aiConfig = extractAIConfig(req)
    validateModelConfig(aiConfig.agentModel)

    const prompt = `
你是 SnapFit AI 的力量训练计划教练。请基于用户资料、本地历史训练、最近运动记录和肌肉疲劳快照,生成一份单次力量训练计划。

硬性要求:
- 只返回 JSON
- 只生成单次训练计划,不要生成周计划
- 每个动作必须包含组级计划值
- 每个动作必须同时返回 plannedAnalysis,用于训练完成后写入运动记录
- plannedAnalysis.muscleGroups 使用英文肌群 key,优先从既有系统使用的 key 中选择,例如 chest, triceps, quadriceps, glutes, upper-back, biceps
- fatigueSnapshot 是软约束:高疲劳肌群应减少训练量或避开,但不是绝对禁止
- 如果历史不足,生成保守的全身基础训练

用户体重: ${effectiveUserWeightKg} kg
用户资料:
${JSON.stringify(userProfile, null, 2)}

最近训练 session 摘要:
${JSON.stringify(recentWorkoutSessionSummaries ?? [], null, 2)}

最近 exerciseEntries:
${JSON.stringify(recentExerciseEntries ?? [], null, 2)}

肌肉疲劳快照:
${JSON.stringify(fatigueSnapshot, null, 2)}

输出结构:
{
  "exercises": [
    {
      "plannedExerciseName": "卧推",
      "notes": "保持肩胛稳定",
      "sets": [
        { "plannedWeightKg": 60, "plannedReps": 8 }
      ],
      "plannedAnalysis": {
        "exerciseType": "strength",
        "muscleGroups": ["chest", "triceps"],
        "estimatedMets": 6,
        "estimatedDurationMinutes": 12,
        "caloriesBurnedEstimated": 86,
        "isEstimated": true
      }
    }
  ]
}
`

    const { object } = await generateObject({
      model: createAIClient(aiConfig.agentModel),
      schema: WorkoutPlanSchema,
      mode: "json",
      prompt,
    })

    return Response.json(object)
  } catch (error) {
    return handleAIError(error)
  }
}
```

- [ ] **Step 2: Create `app/api/ai/workout-exercise-enrich/route.ts`**

```ts
import { generateObject } from "ai"
import {
  createAIClient,
  extractAIConfig,
  validateModelConfig,
} from "@/lib/ai/client"
import { AIError, handleAIError } from "@/lib/ai/errors"
import { WorkoutExerciseEnrichSchema } from "@/lib/ai/schemas/workout-exercise-enrich"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      exerciseName,
      completedSets,
      avgWeightKg,
      avgReps,
      effectiveUserWeightKg,
      userGoal,
    } = body

    if (!exerciseName || !completedSets || !effectiveUserWeightKg) {
      throw new AIError("INVALID_INPUT", "Invalid workout exercise input")
    }

    const aiConfig = extractAIConfig(req)
    validateModelConfig(aiConfig.agentModel)

    const prompt = `
你是运动记录结构化助手。用户在训练计划中替换了一个动作,现在需要为这个真实执行动作补全运动记录分析字段。

只补全衍生字段,不要修改用户事实。

用户事实:
- 动作名: ${exerciseName}
- 完成组数: ${completedSets}
- 平均重量: ${avgWeightKg ?? "unknown"} kg
- 平均次数: ${avgReps ?? "unknown"}
- 用户体重: ${effectiveUserWeightKg} kg
- 用户目标: ${userGoal ?? "unknown"}

返回 JSON:
{
  "exerciseType": "strength",
  "muscleGroups": ["chest", "triceps"],
  "estimatedMets": 6,
  "estimatedDurationMinutes": 10,
  "caloriesBurnedEstimated": 60,
  "isEstimated": true
}
`

    const { object } = await generateObject({
      model: createAIClient(aiConfig.agentModel),
      schema: WorkoutExerciseEnrichSchema,
      mode: "json",
      prompt,
    })

    return Response.json(object)
  } catch (error) {
    return handleAIError(error)
  }
}
```

- [ ] **Step 3: Build**

Run: `pnpm build`

Expected: build exits with code 0.

- [ ] **Step 4: Commit**

```bash
git add app/api/ai/workout-plan/route.ts app/api/ai/workout-exercise-enrich/route.ts
git commit -m "feat(workout): 添加训练计划与动作补全 AI 路由"
```

---

## Task 7: Implement Workout UI Components

**Files:**
- Create: `components/workout/workout-exercise-card.tsx`
- Create: `components/workout/workout-plan-workbench.tsx`

- [ ] **Step 1: Create `components/workout/workout-exercise-card.tsx`**

```tsx
"use client"

import { CheckCircle2, Circle, Pencil, SkipForward } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { WorkoutSessionExercise } from "@/lib/workout/types"

interface WorkoutExerciseCardProps {
  exercise: WorkoutSessionExercise
  onUpdateSetValue: (
    exerciseId: string,
    setIndex: number,
    field: "weight" | "reps",
    value: number,
  ) => void
  onCompleteSet: (exerciseId: string, setIndex: number) => void
  onReplaceExercise: (exerciseId: string, name: string) => void
  onToggleSkipExercise: (exerciseId: string, isSkipped: boolean) => void
}

export function WorkoutExerciseCard({
  exercise,
  onUpdateSetValue,
  onCompleteSet,
  onReplaceExercise,
  onToggleSkipExercise,
}: WorkoutExerciseCardProps) {
  const displayName = exercise.actualExerciseName ?? exercise.plannedExerciseName

  return (
    <section
      className={cn(
        "rounded-2xl border bg-card p-5 shadow-sm",
        exercise.isExerciseSkipped && "opacity-60",
      )}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-semibold">{displayName}</h3>
            {exercise.actualExerciseName && <Badge variant="secondary">已替换</Badge>}
            {exercise.analysisStatus === "stale" && (
              <Badge variant="outline">完成后重算分析</Badge>
            )}
            {exercise.isExerciseSkipped && <Badge variant="destructive">已跳过</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            目标肌群: {exercise.plannedAnalysis.muscleGroups.join(", ") || "待识别"}
          </p>
          {exercise.notes && (
            <p className="text-sm text-muted-foreground">{exercise.notes}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const name = window.prompt("输入替换动作名称", displayName)
              if (name) onReplaceExercise(exercise.exerciseId, name)
            }}
          >
            <Pencil className="mr-2 h-4 w-4" />
            替换动作
          </Button>
          <Button
            variant={exercise.isExerciseSkipped ? "secondary" : "outline"}
            size="sm"
            onClick={() =>
              onToggleSkipExercise(exercise.exerciseId, !exercise.isExerciseSkipped)
            }
          >
            <SkipForward className="mr-2 h-4 w-4" />
            {exercise.isExerciseSkipped ? "取消跳过" : "跳过动作"}
          </Button>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {exercise.sets.map((set) => (
          <div
            key={set.setIndex}
            className={cn(
              "grid grid-cols-12 items-center gap-3 rounded-xl border p-3",
              set.isCompleted && "bg-green-50 dark:bg-green-950/20",
              set.isSkipped && "bg-muted",
            )}
          >
            <div className="col-span-2 font-medium">第 {set.setIndex} 组</div>
            <div className="col-span-3 text-sm text-muted-foreground">
              计划 {set.plannedWeightKg ?? "-"} kg x {set.plannedReps ?? "-"}
            </div>
            <div className="col-span-3">
              <Input
                type="number"
                value={set.actualWeightKg ?? ""}
                disabled={set.isCompleted || set.isSkipped}
                onChange={(event) =>
                  onUpdateSetValue(
                    exercise.exerciseId,
                    set.setIndex,
                    "weight",
                    Number(event.target.value),
                  )
                }
              />
            </div>
            <div className="col-span-2">
              <Input
                type="number"
                value={set.actualReps ?? ""}
                disabled={set.isCompleted || set.isSkipped}
                onChange={(event) =>
                  onUpdateSetValue(
                    exercise.exerciseId,
                    set.setIndex,
                    "reps",
                    Number(event.target.value),
                  )
                }
              />
            </div>
            <div className="col-span-2 flex justify-end">
              <Button
                variant={set.isCompleted ? "secondary" : "default"}
                size="sm"
                disabled={set.isCompleted || set.isSkipped}
                onClick={() => onCompleteSet(exercise.exerciseId, set.setIndex)}
              >
                {set.isCompleted ? (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                ) : (
                  <Circle className="mr-2 h-4 w-4" />
                )}
                {set.isCompleted ? "已完成" : "完成"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Create `components/workout/workout-plan-workbench.tsx`**

```tsx
"use client"

import type { WorkoutSession } from "@/lib/workout/types"
import { canCompleteWorkoutSession } from "@/lib/workout/session"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { WorkoutExerciseCard } from "@/components/workout/workout-exercise-card"

interface WorkoutPlanWorkbenchProps {
  session: WorkoutSession
  isFinishing: boolean
  onGeneratePlan: () => void
  onFinishWorkout: () => void
  onUpdateSetValue: (
    exerciseId: string,
    setIndex: number,
    field: "weight" | "reps",
    value: number,
  ) => void
  onCompleteSet: (exerciseId: string, setIndex: number) => void
  onReplaceExercise: (exerciseId: string, name: string) => void
  onToggleSkipExercise: (exerciseId: string, isSkipped: boolean) => void
}

export function WorkoutPlanWorkbench({
  session,
  isFinishing,
  onFinishWorkout,
  onUpdateSetValue,
  onCompleteSet,
  onReplaceExercise,
  onToggleSkipExercise,
}: WorkoutPlanWorkbenchProps) {
  const title =
    session.sessionRole === "next" && session.status === "draft"
      ? "下次训练计划"
      : "本次训练计划"
  const progress = Math.round(session.derived.exerciseCompletionRate * 100)
  const canFinish = canCompleteWorkoutSession(session)

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <header className="rounded-3xl border bg-gradient-to-br from-emerald-50 to-white p-8 shadow-sm dark:from-emerald-950/30 dark:to-slate-950">
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
          Smart Workout
        </p>
        <h1 className="mt-2 text-4xl font-bold">{title}</h1>
        <p className="mt-3 text-muted-foreground">
          {session.derived.completedSetCount} / {session.derived.totalSetCount} 组已完成
        </p>
        <div className="mt-5">
          <Progress value={progress} />
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="动作" value={session.exercises.length} />
        <Metric label="总组数" value={session.derived.totalSetCount} />
        <Metric label="已完成" value={session.derived.completedSetCount} />
        <Metric label="已替换" value={session.derived.replacedExerciseCount} />
      </div>

      <div className="space-y-5">
        {session.exercises.map((exercise) => (
          <WorkoutExerciseCard
            key={exercise.exerciseId}
            exercise={exercise}
            onUpdateSetValue={onUpdateSetValue}
            onCompleteSet={onCompleteSet}
            onReplaceExercise={onReplaceExercise}
            onToggleSkipExercise={onToggleSkipExercise}
          />
        ))}
      </div>

      <footer className="sticky bottom-4 rounded-2xl border bg-background/95 p-4 shadow-xl backdrop-blur">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-muted-foreground">
            所有未跳过组完成后即可结束训练。
          </p>
          <Button disabled={!canFinish || isFinishing} onClick={onFinishWorkout}>
            {isFinishing ? "正在写入训练结果..." : "完成训练"}
          </Button>
        </div>
      </footer>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  )
}
```

- [ ] **Step 3: Build**

Run: `pnpm build`

Expected: build exits with code 0.

- [ ] **Step 4: Commit**

```bash
git add components/workout/workout-exercise-card.tsx components/workout/workout-plan-workbench.tsx
git commit -m "feat(workout): 添加训练计划执行组件"
```

---

## Task 8: Implement Workout Page And Completion Flow

**Files:**
- Create: `app/[locale]/workout/page.tsx`

- [ ] **Step 1: Create `app/[locale]/workout/page.tsx`**

```tsx
"use client"

import { useCallback, useState } from "react"
import { format, subDays } from "date-fns"
import { Dumbbell, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useIndexedDB } from "@/hooks/use-indexed-db"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { useWorkoutSessions } from "@/hooks/use-workout-sessions"
import type { AIConfig, DailyLog, UserProfile } from "@/lib/types"
import {
  completeWorkoutSet,
  createWorkoutSessionFromPlan,
  FALLBACK_STRENGTH_ANALYSIS,
  replaceWorkoutExercise,
  setWorkoutExerciseSkipped,
  updateWorkoutSetValue,
  workoutSessionToExerciseEntries,
} from "@/lib/workout/session"
import { buildWorkoutPlanContextSnapshot, getEffectiveUserWeightKg } from "@/lib/workout/context"
import type { WorkoutExerciseAnalysis, WorkoutSession } from "@/lib/workout/types"
import { WorkoutPlanWorkbench } from "@/components/workout/workout-plan-workbench"

const defaultUserProfile: UserProfile = {
  weight: 70,
  height: 170,
  age: 30,
  gender: "male",
  activityLevel: "moderate",
  goal: "maintain",
  bmrFormula: "mifflin-st-jeor",
}

const defaultAIConfig: AIConfig = {
  agentModel: {
    name: "gpt-4o",
    baseUrl: "https://api.openai.com",
    apiKey: "",
  },
  chatModel: {
    name: "gpt-4o",
    baseUrl: "https://api.openai.com",
    apiKey: "",
  },
  visionModel: {
    name: "gpt-4o",
    baseUrl: "https://api.openai.com",
    apiKey: "",
  },
}

const emptySummary = {
  totalCaloriesConsumed: 0,
  totalCaloriesBurned: 0,
  macros: { carbs: 0, protein: 0, fat: 0 },
  micronutrients: {},
}

export default function WorkoutPage() {
  const { toast } = useToast()
  const [userProfile] = useLocalStorage<UserProfile>("userProfile", defaultUserProfile)
  const [aiConfig] = useLocalStorage<AIConfig>("aiConfig", defaultAIConfig)
  const { getData: getDailyLog, saveData: saveDailyLog } = useIndexedDB("healthLogs")
  const {
    activeSession,
    hasCompletedWorkout,
    getCompletedSessions,
    isReady,
    saveActiveSession,
    markSessionCompleted,
  } = useWorkoutSessions()
  const [isGenerating, setIsGenerating] = useState(false)
  const [isFinishing, setIsFinishing] = useState(false)

  const checkAIConfig = useCallback(() => {
    const model = aiConfig.agentModel
    if (!model.name || !model.baseUrl || !model.apiKey) {
      toast({
        title: "AI 配置不完整",
        description: "请先在设置页面配置工作模型。",
        variant: "destructive",
      })
      return false
    }
    return true
  }, [aiConfig.agentModel, toast])

  const loadRecentLogs = useCallback(async () => {
    const today = new Date()
    const keys = Array.from({ length: 14 }, (_, index) =>
      format(subDays(today, index), "yyyy-MM-dd"),
    )
    const logs = await Promise.all(
      keys.map((key) => getDailyLog(key) as Promise<DailyLog | null>),
    )
    return logs.filter((log): log is DailyLog => Boolean(log))
  }, [getDailyLog])

  const generatePlan = useCallback(async () => {
    if (!checkAIConfig()) return
    setIsGenerating(true)
    try {
      const now = new Date().toISOString()
      const recentLogs = await loadRecentLogs()
      const recentCompletedSessions = await getCompletedSessions(5)
      const effectiveUserWeightKg = getEffectiveUserWeightKg(recentLogs, userProfile)
      const planContext = buildWorkoutPlanContextSnapshot({
        now,
        userProfile,
        recentLogsByDateDesc: recentLogs,
        recentCompletedSessions,
      })

      const response = await fetch("/api/ai/workout-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-ai-config": JSON.stringify(aiConfig),
        },
        body: JSON.stringify({
          effectiveUserWeightKg,
          userProfile,
          recentWorkoutSessionSummaries: planContext.recentWorkoutSessionSummaries,
          recentExerciseEntries: planContext.recentExerciseEntries,
          fatigueSnapshot: planContext.fatigueSnapshot,
        }),
      })

      if (!response.ok) {
        throw new Error(`workout-plan failed: ${response.status}`)
      }

      const plan = await response.json()
      const session = createWorkoutSessionFromPlan({
        sessionRole: hasCompletedWorkout ? "next" : "current",
        effectiveUserWeightKg,
        planContext,
        exercises: plan.exercises,
        now,
      })
      await saveActiveSession(session)
    } catch (error) {
      console.error(error)
      toast({
        title: "训练计划生成失败",
        description: "请稍后重试。",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }, [
    aiConfig,
    checkAIConfig,
    getCompletedSessions,
    hasCompletedWorkout,
    loadRecentLogs,
    saveActiveSession,
    toast,
    userProfile,
  ])

  const updateSession = useCallback(
    async (updater: (session: WorkoutSession) => WorkoutSession) => {
      if (!activeSession) return
      await saveActiveSession(updater(activeSession))
    },
    [activeSession, saveActiveSession],
  )

  const finishWorkout = useCallback(async () => {
    if (!activeSession) return
    setIsFinishing(true)
    try {
      const completedAt = new Date().toISOString()
      const exercises = await Promise.all(
        activeSession.exercises.map(async (exercise) => {
          if (exercise.analysisStatus !== "stale") return exercise
          try {
            const completedSets = exercise.sets.filter(
              (set) => !set.isSkipped && set.isCompleted,
            )
            const avgWeightKg = average(
              completedSets
                .map((set) => set.actualWeightKg)
                .filter((value): value is number => typeof value === "number"),
            )
            const avgReps = average(
              completedSets
                .map((set) => set.actualReps)
                .filter((value): value is number => typeof value === "number"),
            )
            const response = await fetch("/api/ai/workout-exercise-enrich", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-ai-config": JSON.stringify(aiConfig),
              },
              body: JSON.stringify({
                exerciseName: exercise.actualExerciseName ?? exercise.plannedExerciseName,
                completedSets: completedSets.length,
                avgWeightKg,
                avgReps,
                effectiveUserWeightKg: activeSession.effectiveUserWeightKg,
                userGoal: userProfile.goal,
              }),
            })
            if (!response.ok) throw new Error(`enrich failed: ${response.status}`)
            const analysis = (await response.json()) as WorkoutExerciseAnalysis
            return {
              ...exercise,
              analysisStatus: "enriched" as const,
              enrichedAnalysis: analysis,
            }
          } catch {
            return {
              ...exercise,
              analysisStatus: "fallback" as const,
              enrichedAnalysis: FALLBACK_STRENGTH_ANALYSIS,
            }
          }
        }),
      )

      const finishingSession: WorkoutSession = {
        ...activeSession,
        status: "finishing",
        exercises,
      }
      const entries = workoutSessionToExerciseEntries(finishingSession, completedAt)
      const dateKey = format(new Date(activeSession.startedAt ?? completedAt), "yyyy-MM-dd")
      const existingLog = ((await getDailyLog(dateKey)) as DailyLog | null) ?? {
        date: dateKey,
        foodEntries: [],
        exerciseEntries: [],
        summary: emptySummary,
        activityLevel: userProfile.activityLevel,
      }
      const updatedLog: DailyLog = {
        ...existingLog,
        exerciseEntries: [...existingLog.exerciseEntries, ...entries],
        summary: {
          ...existingLog.summary,
          totalCaloriesBurned:
            existingLog.exerciseEntries.reduce(
              (sum, entry) => sum + (entry.calories_burned_estimated || 0),
              0,
            ) +
            entries.reduce(
              (sum, entry) => sum + (entry.calories_burned_estimated || 0),
              0,
            ),
        },
      }

      await saveDailyLog(dateKey, updatedLog)
      await markSessionCompleted({
        ...finishingSession,
        status: "completed",
        completedAt,
      })
      toast({ title: "训练已完成", description: "结果已写入今日运动记录。" })
    } catch (error) {
      console.error(error)
      toast({
        title: "训练完成失败",
        description: "写入运动记录失败,请重试。",
        variant: "destructive",
      })
    } finally {
      setIsFinishing(false)
    }
  }, [
    activeSession,
    aiConfig,
    getDailyLog,
    markSessionCompleted,
    saveDailyLog,
    toast,
    userProfile.activityLevel,
    userProfile.goal,
  ])

  if (!isReady) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!activeSession) {
    const title = hasCompletedWorkout ? "下次训练计划" : "本次训练计划"
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="rounded-3xl border bg-gradient-to-br from-emerald-50 to-white p-10 text-center shadow-sm dark:from-emerald-950/30 dark:to-slate-950">
          <Dumbbell className="mx-auto h-12 w-12 text-emerald-600" />
          <h1 className="mt-4 text-4xl font-bold">{title}</h1>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            AI 会读取你的本地训练历史、肌肉疲劳和最近体重,生成一份可直接打卡的单次训练计划。
          </p>
          <Button className="mt-8" disabled={isGenerating} onClick={generatePlan}>
            {isGenerating ? "正在生成..." : `生成${title}`}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <WorkoutPlanWorkbench
      session={activeSession}
      isFinishing={isFinishing}
      onGeneratePlan={generatePlan}
      onFinishWorkout={finishWorkout}
      onUpdateSetValue={(exerciseId, setIndex, field, value) =>
        updateSession((session) =>
          updateWorkoutSetValue(session, exerciseId, setIndex, field, value),
        )
      }
      onCompleteSet={(exerciseId, setIndex) =>
        updateSession((session) =>
          completeWorkoutSet(
            session,
            exerciseId,
            setIndex,
            new Date().toISOString(),
          ),
        )
      }
      onReplaceExercise={(exerciseId, name) =>
        updateSession((session) => replaceWorkoutExercise(session, exerciseId, name))
      }
      onToggleSkipExercise={(exerciseId, isSkipped) =>
        updateSession((session) =>
          setWorkoutExerciseSkipped(session, exerciseId, isSkipped),
        )
      }
    />
  )
}

function average(values: number[]): number | undefined {
  if (values.length === 0) return undefined
  const sum = values.reduce((acc, value) => acc + value, 0)
  return Math.round((sum / values.length) * 10) / 10
}
```

- [ ] **Step 2: Build**

Run: `pnpm build`

Expected: build exits with code 0.

- [ ] **Step 3: Commit**

```bash
git add app/[locale]/workout/page.tsx
git commit -m "feat(workout): 添加独立训练计划页面"
```

---

## Task 9: Add Navigation And i18n Copy

**Files:**
- Modify: `components/main-nav.tsx`
- Modify: `components/workout/workout-exercise-card.tsx`
- Modify: `components/workout/workout-plan-workbench.tsx`
- Modify: `app/[locale]/workout/page.tsx`
- Modify: `messages/zh.json`
- Modify: `messages/en.json`

- [ ] **Step 1: Update `components/main-nav.tsx` imports**

Replace:

```ts
import { Home, MessageSquare, Settings, Moon, Sun } from "lucide-react"
```

with:

```ts
import { Dumbbell, Home, MessageSquare, Settings, Moon, Sun } from "lucide-react"
```

- [ ] **Step 2: Add workout nav item**

In `navItems`, insert this item between home and chat:

```ts
    {
      name: t('workout'),
      href: `/${locale}/workout`,
      icon: Dumbbell,
    },
```

- [ ] **Step 3: Add `navigation.workout` in `messages/zh.json`**

Inside the top-level `navigation` object, add:

```json
"workout": "训练"
```

- [ ] **Step 4: Add `workout` namespace in `messages/zh.json`**

Inside the root object, add:

```jsonc
"workout": {
  "eyebrow": "Smart Workout",
  "titleCurrent": "本次训练计划",
  "titleNext": "下次训练计划",
  "subtitle": "AI 会读取你的本地训练历史、肌肉疲劳和最近体重,生成一份可直接打卡的单次训练计划。",
  "generate": "生成{title}",
  "generating": "正在生成...",
  "metrics": {
    "exerciseCount": "动作",
    "setCount": "总组数",
    "completedSets": "已完成",
    "replacedExercises": "已替换"
  },
  "exercise": {
    "replaced": "已替换",
    "recalculate": "完成后重算分析",
    "skipped": "已跳过",
    "muscles": "目标肌群",
    "replace": "替换动作",
    "skip": "跳过动作",
    "unskip": "取消跳过",
    "replacePrompt": "输入替换动作名称",
    "setLabel": "第 {index} 组",
    "planned": "计划",
    "completed": "已完成",
    "complete": "完成",
    "unknown": "待识别"
  },
  "finishHint": "所有未跳过组完成后即可结束训练。",
  "finishing": "正在写入训练结果...",
  "finish": "完成训练",
  "finishSuccessTitle": "训练已完成",
  "finishSuccessDesc": "结果已写入今日运动记录。",
  "finishErrorTitle": "训练完成失败",
  "finishErrorDesc": "写入运动记录失败,请重试。",
  "generateErrorTitle": "训练计划生成失败",
  "generateErrorDesc": "请稍后重试。",
  "aiConfigErrorTitle": "AI 配置不完整",
  "aiConfigErrorDesc": "请先在设置页面配置工作模型。"
}
```

- [ ] **Step 5: Add `navigation.workout` and `workout` namespace in `messages/en.json`**

Inside the top-level `navigation` object, add:

```json
"workout": "Workout"
```

Inside the root object, add:

```jsonc
"workout": {
  "eyebrow": "Smart Workout",
  "titleCurrent": "Current Workout Plan",
  "titleNext": "Next Workout Plan",
  "subtitle": "AI uses your local workout history, muscle fatigue, and latest weight to generate a single-session workout you can check off set by set.",
  "generate": "Generate {title}",
  "generating": "Generating...",
  "metrics": {
    "exerciseCount": "Exercises",
    "setCount": "Sets",
    "completedSets": "Completed",
    "replacedExercises": "Replaced"
  },
  "exercise": {
    "replaced": "Replaced",
    "recalculate": "Analysis updates after finish",
    "skipped": "Skipped",
    "muscles": "Target muscles",
    "replace": "Replace exercise",
    "skip": "Skip exercise",
    "unskip": "Undo skip",
    "replacePrompt": "Enter replacement exercise name",
    "setLabel": "Set {index}",
    "planned": "Planned",
    "completed": "Done",
    "complete": "Complete",
    "unknown": "Unknown"
  },
  "finishHint": "All non-skipped sets must be completed before finishing.",
  "finishing": "Saving workout results...",
  "finish": "Finish Workout",
  "finishSuccessTitle": "Workout finished",
  "finishSuccessDesc": "The result was written to today's exercise log.",
  "finishErrorTitle": "Failed to finish workout",
  "finishErrorDesc": "Writing exercise log failed. Please retry.",
  "generateErrorTitle": "Failed to generate workout plan",
  "generateErrorDesc": "Please try again later.",
  "aiConfigErrorTitle": "AI config is incomplete",
  "aiConfigErrorDesc": "Configure the work model in Settings first."
}
```

- [ ] **Step 6: Replace inline workout copy with `useTranslation("workout")`**

In `components/workout/workout-exercise-card.tsx`, add:

```ts
import { useTranslation } from "@/hooks/use-i18n"
```

Inside the component body, add:

```ts
  const t = useTranslation("workout")
```

Then replace these exact strings:

- `"已替换"` -> `t("exercise.replaced")`
- `"完成后重算分析"` -> `t("exercise.recalculate")`
- `"已跳过"` -> `t("exercise.skipped")`
- `"目标肌群"` -> `t("exercise.muscles")`
- `"待识别"` -> `t("exercise.unknown")`
- `"替换动作"` -> `t("exercise.replace")`
- `"跳过动作"` -> `t("exercise.skip")`
- `"取消跳过"` -> `t("exercise.unskip")`
- `window.prompt("输入替换动作名称", displayName)` -> `window.prompt(t("exercise.replacePrompt"), displayName)`
- `"第 {index} 组"` label -> `t("exercise.setLabel", { index: set.setIndex })`
- `"计划"` -> `t("exercise.planned")`
- `"已完成"` -> `t("exercise.completed")`
- `"完成"` -> `t("exercise.complete")`

In `components/workout/workout-plan-workbench.tsx`, add:

```ts
import { useTranslation } from "@/hooks/use-i18n"
```

Inside the component body, add:

```ts
  const t = useTranslation("workout")
```

Then replace:

- title ternary with:

```ts
  const title =
    session.sessionRole === "next" && session.status === "draft"
      ? t("titleNext")
      : t("titleCurrent")
```

- `"Smart Workout"` -> `t("eyebrow")`
- `"动作"` -> `t("metrics.exerciseCount")`
- `"总组数"` -> `t("metrics.setCount")`
- `"已完成"` -> `t("metrics.completedSets")`
- `"已替换"` -> `t("metrics.replacedExercises")`
- `"所有未跳过组完成后即可结束训练。"` -> `t("finishHint")`
- `"正在写入训练结果..."` -> `t("finishing")`
- `"完成训练"` -> `t("finish")`

In `app/[locale]/workout/page.tsx`, add:

```ts
import { useTranslation } from "@/hooks/use-i18n"
```

Inside the component body, add:

```ts
  const t = useTranslation("workout")
```

Then replace:

- `"AI 配置不完整"` -> `t("aiConfigErrorTitle")`
- `"请先在设置页面配置工作模型。"` -> `t("aiConfigErrorDesc")`
- empty-state title ternary with:

```ts
    const title = hasCompletedWorkout ? t("titleNext") : t("titleCurrent")
```

- empty-state paragraph -> `t("subtitle")`
- button label -> `isGenerating ? t("generating") : t("generate", { title })`
- success/error toast titles and descriptions with the corresponding `workout.*` keys

- [ ] **Step 7: Validate JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/zh.json','utf8')); JSON.parse(require('fs').readFileSync('messages/en.json','utf8')); console.log('OK')"`

Expected: outputs `OK`.

- [ ] **Step 8: Build**

Run: `pnpm build`

Expected: build exits with code 0.

- [ ] **Step 9: Commit**

```bash
git add components/main-nav.tsx components/workout/workout-exercise-card.tsx components/workout/workout-plan-workbench.tsx app/[locale]/workout/page.tsx messages/zh.json messages/en.json
git commit -m "feat(workout): 添加训练页入口文案"
```

---

## Task 10: Final Verification And Manual Smoke

**Files:**
- No new files

- [ ] **Step 1: Run unit tests**

Run: `pnpm test`

Expected:

- `tests/workout-session.test.ts` passes
- `tests/workout-ai-schemas.test.ts` passes

- [ ] **Step 2: Run production build**

Run: `pnpm build`

Expected: Next.js production build exits with code 0.

- [ ] **Step 3: Run lint if available**

Run: `pnpm lint`

Expected:

- If `next lint` is supported in the installed Next.js version, command exits with code 0
- If Next.js 15 reports that `next lint` is removed, record that exact output in the final handoff and rely on `pnpm build` + `pnpm test`

- [ ] **Step 4: Manual smoke test in dev server**

Run: `pnpm dev`

Open: `http://localhost:3000/zh/workout`

Expected manual checks:

1. Page loads and shows `本次训练计划` when no active session exists
2. Clicking generate calls `/api/ai/workout-plan`
3. Generated plan appears as exercise cards with set rows
4. Editing set 1 weight syncs later untouched unfinished sets
5. Completing one set turns the session into active current plan
6. Replacing an exercise shows `已替换` and `完成后重算分析`
7. Skipping an exercise removes its sets from completion blocking
8. Completing all non-skipped sets enables `完成训练`
9. Finishing writes new entries to the selected execution date `DailyLog.exerciseEntries`
10. Dashboard exercise list and muscle fatigue card can read the new exercise entries

- [ ] **Step 5: Commit any verification-only fixes**

If verification required code changes, run `git status --short`, add only files changed for this workout feature, and commit:

```bash
git commit -m "fix(workout): 修复训练计划闭环验证问题"
```

If no fixes were needed, do not create an empty commit.

---

## Notes For Execution

- `pnpm add -D vitest` changes dependencies and lockfile. Get user approval before executing dependency installation if the current environment asks for escalation.
- This plan intentionally stores workout-specific types in `lib/workout/types.ts`, not `lib/types.ts`, to avoid turning the shared type file into a large mixed-responsibility file.
- `HEALTH_DB_VERSION` must be updated at every direct `indexedDB.open(...)` call site. Leaving any version hardcoded at `1` or `2` will cause runtime `VersionError` after the workout stores ship.
