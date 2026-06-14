# PRD: Deterministic Workout Training Engine

**Created**: 2026-06-14
**Updated**: 2026-06-15 (grill-with-docs 会话补充)
**Status**: Ready for implementation

## Problem Statement

The current workout plan system uses an LLM to generate each training session on-demand. After 3 months of use, the system is "不尽人意" (unsatisfactory) because:

1. **No periodization**: The LLM generates isolated training sessions without knowing if this is week 1 or week 12, when to deload, or how training volume should progress over time.
2. **Unstable exercise selection**: The LLM freely generates exercise names, so "器械推胸" might become "坐姿推胸机" next session, breaking progression tracking.
3. **Soft fatigue constraints**: The `fatigueSnapshot` provides hard data, but the LLM's "interpretation" is probabilistic and may not strictly enforce recovery rules.
4. **Industry consensus**: 2026 research shows LLM wrappers are outdated; deterministic algorithms with progressive overload are the evidence-based approach.

The user has:
- 824 structured exercises (SmartWorkout-derived catalog) → **精选 106 个** (see ADR-0006)
- Fatigue tracking system (fatigueSnapshot)
- Training history (recentWorkoutSessionSummaries)
- Ankylosing spondylitis (AS) requiring spinal/thoracic mobility maintenance

But all training variables (which muscle, which exercise, how many sets/reps, what weight) have formulas — no LLM "thinking" is needed.

## Solution

Replace the LLM generation system with a **deterministic training engine** using a layered architecture that supports multi-phase progression:

```
Engine Core Layer (WorkoutEngine interface)
  ↓
Phase Configuration Layer (Novice / Intermediate / Advanced)
  ↓
Auto-Transition Layer (detects phase change from training data)
```

**Phase 1 (v1)**: Novice Linear Progression (0-6 months, ~72 sessions)
- Upper/lower split, 4 templates, session-driven rotation
- Linear weight progression (+1.25kg upper, +2.5kg lower when target reps met)
- Fixed deload every 12 sessions (3-session deload at -30% weight, -33% sets)
- 20-exercise core pool (machine/dumbbell priority for AS safety)
- AS mobility embedded (2 AS core movements in warmup + 2 in cooldown)

**Phase 2 (future)**: Intermediate Block Periodization (6-18 months)
- 6 templates, block structure (18 sessions accumulation + 18 sessions intensification + 6 sessions deload = 42 sessions per cycle)
- Retains 10 benchmark exercises from novice + adds 20 variants (30 total)
- Benchmark exercises appear in first 6 sessions of each block (test weeks)
- Within-block linear progression at half increment (+0.5kg upper, +1kg lower)

**Phase 3 (future)**: Advanced DUP (18+ months)
- 6 templates by training type (strength upper/lower → hypertrophy upper/lower → endurance upper/lower, strict 6-session cycle)
- Retains 5 lifetime benchmarks (selected from intermediate 10) + opens full catalog (76 exercises)
- Fatigue-threshold triggered deload (≥4 muscle groups intensity ≥60, or maximum 18 sessions)

The engine auto-transitions between phases based on session count and stall signals.

## User Stories

1. As a novice trainee, I want the engine to generate my next training session based on which template is next in rotation, so that I don't need to track "which day" it is manually.
2. As a trainee with AS, I want every training session to include spinal/thoracic mobility work in warmup and cooldown, so that I maintain the activity my doctor recommended.
3. As a trainee, I want the engine to automatically increase weight when I complete my target reps, so that I progressively overload without manual calculation.
4. As a trainee, I want to mark an exercise as "feeling wrong" during a set, so that the engine immediately replaces it and never assigns it again.
5. As a trainee with AS, I want replaced exercises to come from the same muscle group and movement pool but prioritize safer equipment types, so that I avoid re-injury.

6. As a trainee, I want the engine to automatically trigger a deload week after every 12 training sessions, so that I recover before accumulated fatigue causes injury or burnout.
7. As a trainee, I want deload sessions to use the same exercises but lighter weight (-30%) and fewer sets (-33%), so that I maintain movement patterns while recovering.
8. As a trainee, I want my "器械推胸" weight progression tracked from month 1 through month 18, so that I can see long-term strength gains even as other exercises rotate.
9. As a trainee transitioning from novice to intermediate, I want to keep practicing my core lifts while adding exercise variety, so that I don't lose my strength foundation.
10. As a trainee, I want the engine to replace an exercise after 3 consecutive failed attempts (not completing target reps), so that I don't waste sessions on a movement that doesn't suit me.
11. As a trainee with variable weekly frequency (3-4 days/week), I want the engine to use session count rather than calendar weeks, so that my rotation stays consistent regardless of schedule.
12. As a trainee, I want each training session to have 4 warmup + 4-5 main + 4 cooldown exercises, so that sessions fit within my 60-75 minute time budget.
13. As a trainee, I want main exercises to use 3 sets each, so that total working volume stays at 12-15 sets per session (evidence-based novice range).
14. As a novice trainee, I want to rotate through 4 templates (上A推 → 下A → 上B拉 → 下B), so that each muscle group is trained twice per week.
15. As a trainee with AS, I want AS core movements to rotate through multiple dimensions (thoracic extension/rotation, hip flexor stretch, scapular control) across the 4-template cycle, so that I address all mobility needs over time.
16. As a trainee, I want a replaced exercise to start from a conservative weight (~0.3-0.5× bodyweight for compounds), so that I safely learn the new movement pattern.
17. As a trainee, I want the engine to filter out exercises I've blacklisted (marked "feeling wrong"), so that I never encounter them again.
18. As a trainee, I want the engine to select exercises based on tags (STRENGTH for main, WARMUP/MOBILITY for warmup, COOLDOWN/STRETCH for cooldown), so that each phase serves its purpose.

19. As a trainee, I want exercises tagged AS_CORE to be prioritized in warmup/cooldown (2 per phase), so that my medical maintenance needs are always met.
20. As a trainee transitioning from novice to intermediate phase, I want the engine to automatically detect the transition (72 sessions or 4+ stalled exercises), so that I don't need to manually upgrade.
21. As an intermediate trainee (future), I want 10 benchmark exercises retained from novice phase, so that I can track long-term PRs while adding 20 new variants for variety.
22. As an intermediate trainee (future), I want to rotate through 6 templates with block periodization (accumulation → intensification → deload blocks), so that I continue progressing after linear gains stop.
23. As an advanced trainee (future), I want 5 lifetime benchmark exercises retained, so that I have a "strength identity" that spans 2+ years of training.
24. As an advanced trainee (future), I want the full exercise catalog opened (including barbell compounds if AS improves), so that I have maximum variety after 18 months.

## Implementation Decisions

### Architecture

**Strategy pattern (three independent engine classes):**
- `NoviceEngine`, `IntermediateEngine`, `AdvancedEngine` each implement full generation logic
- `AdaptiveEngine` selects active engine based on `TrainingState.phase`
- Phase transition detection in `AdaptiveEngine.generateSession()`:
  - Checks transition conditions before delegating
  - If conditions met: updates `TrainingState.phase`, performs data migration (select benchmarks, reset weights)
  - Delegates to new engine
- User can manually downgrade in settings; system auto-upgrades after 2 microcycles (8 sessions novice, 12 sessions intermediate)

**Module structure** (new in `lib/workout/engine/`):
- `catalog.ts`: **106-exercise database** with layered tags (movement_pattern, primary_muscle, angle, equipment_simplified) - **已实现 ✓**
- `novice-engine.ts`: NoviceEngine implementation (4 templates, linear progression)
- `intermediate-engine.ts`: IntermediateEngine implementation (6 templates, block periodization)
- `advanced-engine.ts`: AdvancedEngine implementation (6 templates, DUP)
- `progression.ts`: progression rules (add weight, maintain, reduce reps, replace exercise)
- `deload.ts`: deload triggering and parameter calculation
- `selection.ts`: exercise selection (filter by tags, muscle group, exclude blacklist, find variants by movement_pattern)
- `adaptive-engine.ts`: phase transition detection, benchmark selection (HITL), engine switching

**Data flow:**
```
User completes session → history updated
Next session request → AdaptiveEngine.generateSession()
  → Check phase transition (session count, stall signals)
  → If transition: swap PhaseConfig
  → Delegate to current PhaseConfig.generate()
    → Select template (sessionCount % templateCount)
    → For each phase (warmup/main/cooldown):
      → Select exercises (filter catalog by tags/muscle/blacklist)
      → Prescribe load (from history + progression rules)
    → Return WorkoutSession
```

### Novice Phase Parameters

**Templates (4):**
- 上A (push): chest/front-delt/triceps + biceps auxiliary
- 下A: quads/hams/glutes/core
- 上B (pull): back/rear-delt/biceps + forearms auxiliary
- 下B: quads/hams/glutes/core (different exercise variants)

**Session structure:**
- warmup: 4 exercises (2 AS_CORE + 2 training-specific activation)
- main: 4-5 exercises × 3 sets each (12-15 total working sets)
- cooldown: 4 exercises (2 AS_CORE + 2 training-specific stretches)

**Progression rule:**
```
If last session: all sets completed target reps
  → Add weight (+1.25kg upper body, +2.5kg lower body)
Else if last session: failed to complete target
  → Maintain weight, try again
Else if consecutive 2 failures
  → Maintain weight, reduce target reps (e.g., 10 → 8)
Else if consecutive 3 failures OR user marked "discomfort"
  → Replace exercise (same muscle + same pool + same mechanics, conservative weight)
```

**Deload rule:**
```
Trigger: every 12 sessions
Duration: 3 sessions
Parameters: -30% weight, -33% sets (3 → 2)
Exercises: same as normal, only intensity/volume reduced
```

**Exercise pool (106 exercises total):**
From 824 SmartWorkout catalog,精选 106 个 (12.9%):
- **Novice core**: 20 exercises (MACHINE/DUMBBELL/CABLE priority, AS-safe)
- **AS core**: 10 exercises (mobility/stretch, 4 dimensions: thoracic/hip/scapular/spine)
- **Intermediate variants**: 30 exercises (matched from novice core by movement_pattern + primary_muscle)
- **Advanced pool**: 36 exercises (unilateral/complex/conditional barbell)
- **补充动作**: 10 exercises (fill coverage gaps: decline chest, rear delt, traps, hamstrings, adductors, forearms)

Distribution (strength exercises, 96 个):
- Chest: 12 (上4 + 中6 + 下2, covering incline/flat/decline angles)
- Back: 15 (horizontal_pull 7 + vertical_pull 6 + shrug 2)
- Shoulders: 15 (front 3 + middle 4 + rear 3 + press 5)
- Legs: 16 (quads 6 + hamstrings 3 + glutes 2 + adductors 2 + calves 3)
- Arms: 16 (biceps 7 + triceps 5 + forearms 4)
- Core: 9 (flexion 3 + rotation 1 + stability 5)

**Layered tags for variant matching:**
Each exercise tagged with:
- `movement_pattern`: e.g., horizontal_push, incline_push, lateral_raise, squat_pattern
- `primary_muscle`: CHEST, BACK, SHOULDERS, QUADS, GLUTES, BICEPS, TRICEPS, CORE, FOREARMS
- `angle`: incline, decline, flat, neutral, overhead
- `equipment_simplified`: MACHINE, DUMBBELL, CABLE, BARBELL, BAND, BODYWEIGHT

Variant matching logic: `findVariants(benchmark)` returns exercises with same `movement_pattern + primary_muscle` but different `angle` or `equipment`.

**AS core pool:**
From 824 catalog, tag exercises as `AS_CORE`:
- Thoracic extension: wall chest stretch, thoracic rotation
- Hip mobility: kneeling hip flexor stretch, 90-90 hip stretch
- Scapular control: band external rotation, scapular retraction
- Spinal mobility: cat-cow, quadruped thoracic rotation

Selection rule: warmup picks 2 AS_CORE (matching training focus: thoracic/shoulder for upper days, hip/spine for lower days) + 2 muscle-specific activation. Cooldown picks 2 AS_CORE + 2 muscle-specific stretches.

### Phase Transition Logic

**Novice → Intermediate:**
```
Trigger: (sessionCount >= 72) OR (stalledExercises >= 4)
Timing: Detection happens when generating session #73
Action:
  1. Display benchmark selection UI (HITL - human-in-the-loop):
     - Algorithm selects 10 candidates from novice 20 using layered filtering:
       * Each muscle group's highest frequency exercise (6 guaranteed)
       * Remaining 4 slots: highest progress exercises
     - User reviews and confirms the 10 benchmarks
  2. Match 20 variants dynamically:
     - For each benchmark, find 2-3 variants with same movement_pattern + primary_muscle but different angle/equipment
     - Example: "地面哑铃卧推" (horizontal_push + CHEST + flat + DUMBBELL) → variants: 上斜哑铃卧推 (incline), 下斜卧推 (decline), 器械推胸 (MACHINE)
  3. Update TrainingState:
     - phase = "intermediate"
     - benchmarkExerciseIds = [selected 10 IDs]
  4. Switch to IntermediateEngine (6 templates, block periodization)

User can manually downgrade: weights restart at 70% of last PR, benchmarks preserved, auto-upgrade after 8 sessions (2 novice microcycles)
```

**Intermediate → Advanced (future):**
```
Trigger: (sessionCount >= 240) OR (blockProgressRate < 0.02)
Timing: Detection happens when generating session #241
Action:
  - Select 5 lifetime benchmarks from intermediate 10 benchmarks
  - Tag as LIFETIME_BENCHMARK
  - Open full catalog (106 exercises: 20 novice + 30 intermediate + 36 advanced + 10 补充)
  - Conditional barbell: if user marks "AS improved", include 12 barbell exercises from advanced pool
  - Switch to AdvancedEngine (6 templates by training type: strength/hypertrophy/endurance)

User can manually downgrade: weights restart at 70%, lifetime benchmarks preserved, auto-upgrade after 12 sessions (2 intermediate microcycles)
```

### Data Schema Changes

**New fields in `WorkoutSession`:**
- `templateIndex?: number` (0-3 for novice, 0-5 for intermediate/advanced)
- `isDeload?: boolean` (true if this is a deload session)
- `phase?: "novice" | "intermediate" | "advanced"` (snapshot for historical analysis)

**New fields in `WorkoutSessionExercise`:**
- `catalogExerciseId?: string` (reference to catalog for stable ID tracking)
- `discomfortFlag?: boolean` (user marked "feeling wrong")

**New top-level state (localStorage + WorkoutSession snapshot):**
```typescript
interface TrainingState {
  phase: "novice" | "intermediate" | "advanced"
  completedSessionCount: number
  blacklistedExerciseIds: string[]       // catalogExerciseId of flagged exercises
  benchmarkExerciseIds?: string[]        // 10 benchmarks selected at novice→intermediate
  lifetimeBenchmarkIds?: string[]        // 5 lifetime benchmarks selected at intermediate→advanced
  phaseTransitionReady?: boolean         // true when transition conditions met
  manualDowngrade?: {                    // user manually downgraded
    from: "intermediate" | "advanced"
    at: number                           // sessionCount when downgraded
    upgradeAfter: number                 // auto-upgrade threshold
  }
  currentBlock?: "accumulation" | "intensification" | "deload"  // intermediate only
  blockStartSession?: number             // intermediate only
  lastDeloadSession?: number             // advanced only
}
```

Storage: localStorage for current state, WorkoutSession embeds snapshot for historical analysis.

**Projection to existing `WorkoutSession`:**
The engine outputs a structure compatible with current `WorkoutSession` (preserves `plannedExerciseName`, `sets`, `plannedAnalysis`). UI and storage layers remain unchanged. New fields (`catalogExerciseId`, `discomfortFlag`) are additive.

### Removed Components

- `app/api/ai/workout-plan/route.ts` (135-line LLM prompt)
- `lib/ai/schemas/workout-plan.ts` (LLM structured output schema)
- LLM dependency for workout plan generation

## Testing Decisions

### What Makes a Good Test

Good tests verify **external behavior** (what the module does), not implementation details (how it does it).

**Test external behavior:**
- Given session count 5, engine returns template index 1 (5 % 4)
- Given 3 consecutive failures on "器械推胸", engine replaces it with another chest exercise
- Given completed session count 12, next session is deload (weight -30%, sets -33%)
- Given exercise marked with discomfort flag, it never appears in future sessions

**Don't test implementation details:**
- Internal method names, private helper functions
- The exact algorithm for selecting which chest exercise (as long as it meets constraints: same muscle, not blacklisted)
- Whether the engine uses a loop or recursion to filter exercises

### Modules to Test

**`lib/workout/engine/catalog.ts`:**
- Tags are correctly applied (NOVICE_CORE, AS_CORE, BENCHMARK)
- Filter functions return exercises matching criteria (muscle group + tags + equipment)
- Blacklist filtering excludes flagged exercises

**`lib/workout/engine/progression.ts`:**
- `evaluateProgression(history)` returns correct action (add weight / maintain / reduce reps / replace)
- Weight increments follow rules (+1.25kg upper, +2.5kg lower)
- Conservative weight calculation for new exercises (~0.3-0.5× bodyweight)

**`lib/workout/engine/deload.ts`:**
- `shouldDeload(sessionCount)` returns true every 12 sessions
- `applyDeloadModifiers(session)` reduces weight by 30% and sets by 33%

**`lib/workout/engine/selection.ts`:**
- `selectExercises({ muscle, pool, tags, blacklist })` returns valid exercises
- AS_CORE exercises are prioritized (2 in warmup, 2 in cooldown)
- No blacklisted exercises appear in results

**`lib/workout/engine/novice-engine.ts`:**
- `generateSession(context)` returns a valid WorkoutSession
- Template rotation: session 0→上A, 1→下A, 2→上B, 3→下B, 4→上A
- Structure: 4 warmup + 4-5 main + 4 cooldown
- Each main exercise has 3 sets (or 2 if deload)

**`lib/workout/engine/adaptive-engine.ts`:**
- `shouldTransition(history, currentPhase)` detects phase change correctly
- Transition at 72 sessions: novice → intermediate
- Transition at 240 sessions: intermediate → advanced
- Transition on 4+ stalled exercises: novice → intermediate
- `generateSession` delegates to current phase's config

### Prior Art

Existing workout tests in `tests/workout-session.test.ts` demonstrate the pattern:
- Use plain objects to construct input data (no mocking)
- Test pure functions (given input, assert output)
- Use helper builders like `makeInput()` for reusable test data

Apply the same pattern to engine tests:
```typescript
// Example structure
describe("NoviceLinearEngine", () => {
  it("generates 上A template for session 0", () => {
    const engine = new NoviceLinearEngine()
    const context = { sessionCount: 0, history: [], blacklist: [] }
    const session = engine.generateSession(context)
    expect(session.templateIndex).toBe(0)
    expect(session.exercises.length).toBeGreaterThanOrEqual(12) // 4+4+4
  })
})
```

## Out of Scope

**Not included in v1 (novice phase):**
- Intermediate phase implementation (deferred to 6-month mark)
- Advanced phase implementation (deferred to 18-month mark)
- Barbell compound exercises (safety concern for AS; may be added in advanced phase if user's AS improves)
- Exercise video/thumbnail display in UI (catalog has these fields, but UI integration is separate)
- Medical constraint layer (AS-specific exercise exclusions beyond user blacklist; requires doctor's prohibited-exercise list)
- Non-training-day mobility routines (engine only handles training sessions, not off-day recovery protocols)

**Separate PRDs:**
- Exercise detail modal (catalog fields like description/instructions/video)
- Exercise replacement UI flow (current "replace exercise" uses free text; should use catalog picker)
- Training analytics dashboard (PR tracking, volume trends over months)

## Further Notes

**Why 106 exercises not 824:**
After grill-with-docs session analysis, 106 exercises (12.9% of 824) provides sufficient coverage:
- All key muscle stimulation angles covered (chest upper/middle/lower, shoulder front/middle/rear, back thickness/width, etc.)
- Quality over quantity: each exercise manually vetted for AS safety
- Comparable to industry standards: nSuns (30-40), GZCL (40-60), Renaissance Periodization (80-120)
- User survey: most training apps offer 300-1300 exercises, but users actually use 20-50
- 106 = practical pool for 2+ years of training without repetition fatigue

See ADR-0006 for detailed analysis and coverage verification.

**Why deterministic over LLM:**
Industry consensus (ACSM 2026, NSCA, AI Workout Generator 2026 report) is clear: LLM-generated workouts produce "junk volume" and lack systematic progression. Every training variable (muscle selection, exercise choice, sets/reps, weight) has a formula. The 824-exercise catalog is structured data. Deterministic algorithms are testable, reproducible, and debuggable.

**Why layered architecture:**
User explicitly requested "长期进阶规划" (long-term progression plan) because they may not have time in 6/18 months to redesign the system. Layered architecture allows adding intermediate/advanced phases by writing new `PhaseConfig` objects without refactoring core engine logic.

**Why session-driven not calendar-driven:**
User trains 3-4 days/week (variable). Calendar-based systems (e.g., "Monday = chest day") break when user skips a week or trains 5 days one week. Session-count rotation is resilient to schedule variance.

**Why retain benchmark exercises across phases:**
Long-term strength tracking requires stable reference points. If all exercises change at phase transitions, user loses ability to answer "am I stronger than 6 months ago?" Retaining 10 benchmarks (novice → intermediate) and 5 lifetime benchmarks (intermediate → advanced) provides continuity while allowing variety through variants.

**Why AS core in every session:**
User's doctor recommends daily mobility work. Training days are 3-4 days/week, so embedding AS core in every training session ensures compliance. The 4-template rotation covers multiple mobility dimensions (thoracic, hip, scapular) over each microcycle.

**Implementation priority:**
P0: catalog + novice engine + progression + deload + selection (core functionality)
P1: adaptive engine + phase transition (future-proofing)
P2: intermediate/advanced configs (deferred to 6/18 months)

**Risk: user's AS may worsen:**
Discomfort flag + blacklist mechanism provides safety valve. If an exercise causes pain, user marks it, engine replaces immediately and never assigns again. This is more responsive than hardcoding "AS patients can't do X" based on general guidelines.
