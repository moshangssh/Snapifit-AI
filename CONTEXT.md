# Snapifit AI Context

Snapifit AI tracks daily nutrition, activity, and recovery so the user can make same-day diet decisions with a consistent health budget vocabulary.

## Language

### Nutrition & Diet

**今日热量预算**:
The same-day calorie budget that tells the user how much they can still eat after accounting for health goal, consumed calories, and recorded exercise. It should not count planned training as already-spendable calories.
_Avoid_: 今日热量平衡, 今日热平衡

**手填目标热量**:
An optional user-entered calorie target that acts as the user's baseline eating target. When absent, the app infers the calorie budget from the user's profile, health goal, and recorded exercise.
_Avoid_: 必填目标热量, 固定每日热量

**健康下限**:
The minimum eating-budget guardrail used to avoid an overly aggressive calorie target. For inferred weight-loss budgets, it should not raise the budget above the user's same-day maintenance level.
_Avoid_: 固定保底热量

**今日维持热量**:
The same-day neutral calorie level at which intake would match baseline expenditure plus recorded exercise.
_Avoid_: 今日热量预算

**热量平衡**:
The neutral intake-versus-expenditure view that describes whether recorded intake is above or below maintenance for the day. It is not the primary name for the user-facing eating budget.
_Avoid_: 今天还能吃多少

**吃法**:
A self-contained, ready-to-eat option for the user's next meal that fits within the remaining same-day budget. The "今天还能吃什么" card presents a few as mutually-exclusive picks, and the user chooses one — they are alternatives, not building blocks to combine.
_Avoid_: 方案, 单品, 套餐

**补蛋白之选**:
The one 吃法 that is always present and visibly marked, chosen so the user can still reach the day's remaining protein target even when their stated craving would not.
_Avoid_: 高蛋白方案, 蛋白保底项

**宏量目标**:
The day's carbohydrate, protein, and fat targets the user eats toward. They hang off the 今日热量预算 (not the neutral 今日维持热量), so a weight-loss day tightens them. Protein is anchored to the user's body weight and health 目标, not taken as a share of calories; fat carries a body-weight floor; carbohydrate fills whatever budget remains. There is one set of 宏量目标 per day, shared by the 今日热量平衡 view and the 吃法 picks.
_Avoid_: 营养素配比, 宏量比例, 固定五五二分

### Workout Training

**训练模板 (Training Template)**:
A fixed sequence of exercises that defines one training session. The engine rotates through templates (上A → 下A → 上B → 下B → ...) based on completed session count, not calendar dates. Each template specifies warmup, main, and cooldown phases.
_Avoid_: 训练计划 (too broad; a "plan" spans multiple sessions), 单次训练 (implementation detail)

**课次 (Session Count)**:
The count of completed training sessions. Used as the primary driver for template rotation and deload triggering. A "microcycle" is one full rotation through all templates (4 sessions = 1 microcycle for upper/lower split).
_Avoid_: 训练周 (calendar week; the engine ignores dates), 第几天

**训练阶段 (Training Phase)**:
The user's current stage of progression: Novice Linear (0-6 months), Intermediate Block (6-18 months), or Advanced DUP (18+ months). Phase determines progression rules, deload frequency, and exercise variety. Transition happens automatically based on session count and stall signals. User can manually downgrade in settings; system auto-upgrades after 2 complete microcycles (8 sessions for novice 4-template, 12 sessions for intermediate 6-template).
_Avoid_: 训练水平 (static label; phases are dynamic and transition-based)

**渐进规则 (Progression Rule)**:
The algorithm that decides when to increase weight, maintain, reduce reps, or switch exercises. Novice phase uses linear progression (add weight each session if target reps met). Intermediate uses block periodization. Advanced uses daily undulating periodization with RPE-anchored e1RM autoregulation — load floats with recent demonstrated performance rather than a fixed per-session increment.
_Avoid_: 加重规则 (too narrow; progression includes deload and reps adjustment, not just adding weight)

**减载 (Deload)**:
A planned reduction in training intensity (-30% weight) and volume (-33% sets: 3 → 2) to allow recovery. For novice phase, triggered every 12 sessions, lasting 3 sessions. Exercises and structure remain the same.
_Avoid_: 休息周 (implies no training; deload is active recovery), 轻重量周

**AS 核心动作 (AS Core Movement)**:
An exercise tagged with `AS_CORE` in the catalog, addressing spinal/thoracic mobility, hip flexor ROM, or scapular control. These are prioritized in warmup (2 per session) and cooldown (2 per session) for the user's ankylosing spondylitis management. The engine rotates through the AS core pool to cover multiple dimensions (thoracic extension, rotation, hip flexor stretch, shoulder external rotation) across the 4-template cycle.
_Avoid_: 康复动作 (rehab implies pathology treatment; AS core is maintenance), 活动度训练 (too generic)

**感觉不对标记 (Discomfort Flag)**:
A user-applied signal indicating an exercise caused pain or unease (distinct from muscular fatigue). Triggers immediate exercise replacement and adds the exercise to a blacklist. Prevents the engine from waiting 3 failed attempts before switching, which is critical for AS safety.
_Avoid_: 疼痛标记 (too clinical), 跳过 (skip implies laziness; this is a safety signal)

**动作指南 (Exercise Guide)**:
The per-exercise reference content surfaced for a catalog movement: overview, step-by-step instructions, technique tips, common mistakes, and a demo video. It is keyed off the exercise's catalog identity (not the session record) and is purely educational — it never overrides the engine's prescription or the AS safety reminder. The training card shows a compact summary (overview + a few tips/mistakes); the full content, including video and all steps, lives behind a "动作指南" button. Movements with no source content (custom or AI-generated) simply omit the guide.
_Avoid_: 注意事项 (this names only the AS safety reminder — a fixed, engine-authored safety line shown on every exercise; the guide is the richer, movement-specific content layered beneath it), 教程 (tutorial implies a course; this is reference content)

### Phase Progression

The engine supports three training phases with automatic transition:

**新手线性增长 (Novice Linear Progression, 0-6 months)**:
- **Templates**: 4 (上A推 → 下A → 上B拉 → 下B)
- **Exercise pool**: 20 core exercises (NOVICE_CORE tag, machine/dumbbell priority)
- **Progression**: Linear (+1.25kg upper, +2.5kg lower when target reps met)
- **Deload**: Every 12 sessions, 3-session deload at -30% weight / -33% sets
- **Structure**: warmup 4 + main 4-5 × 3 sets + cooldown 4
- **Transition trigger**: 72 sessions OR 4+ stalled exercises

**中级块状周期化 (Intermediate Block Periodization, 6-18 months)**:
- **Templates**: 6 (adds upper C, lower C for more variety)
- **Exercise pool**: 10 benchmarks selected from novice core (layered filtering: each muscle group's highest frequency + remaining slots for highest progress) + 20 variants dynamically matched (2-3 variants per benchmark: same muscle, different angle/equipment) = 30 total
- **Progression**: Block structure (18 sessions accumulation + 18 sessions intensification + 6 sessions deload = 42 sessions per cycle); within-block linear progression at half increment (+0.5kg upper, +1kg lower); 3 consecutive failures trigger exercise swap at next block
- **Benchmark role**: 10 retained exercises appear in first 6 sessions of each block (accumulation start, intensification start, deload) to track long-term PRs; remaining sessions use 20 variants
- **Transition trigger**: 240 sessions OR block progress rate < 2%
- **Manual downgrade**: User can downgrade to novice in settings; benchmarks preserved; weights restart at 70%; auto-upgrade after 2 microcycles (8 sessions)

**高级波动周期化 (Advanced DUP, 18+ months)**:
- **Templates**: 6 by training type rotation (strength upper/lower → hypertrophy upper/lower → endurance upper/lower, strict 6-session cycle)
- **Exercise pool**: 5 lifetime benchmarks selected from intermediate 10 benchmarks + full catalog (~50+ exercises)
- **Progression**: Daily undulating (strength: 3-5 reps @ RPE 9, hypertrophy: 8-12 @ RPE 8, endurance: 15-20 @ RPE 7); each training type tracks progression independently. Load is RPE-anchored e1RM autoregulation: each session's prescribed weight = recent best e1RM (Epley: weight × (1 + reps/30)) × the training type's target intensity (RPE 9→0.90, RPE 8→0.75, RPE 7→0.62), so RPE drives the weight and load floats with demonstrated performance (a strong session lifts it, a weak one lowers it) — proportional, not a fixed per-session +kg increment. This also resolves the legacy inverted gradient where advanced fixed increments exceeded intermediate's.
- **Deload**: Fatigue-threshold triggered (≥4 muscle groups with intensity ≥ 60, or maximum 18 sessions), lasting 6 sessions
- **Benchmark role**: 5 lifetime benchmarks anchor 2+ years of progress, appearing on strength days
- **Manual downgrade**: User can downgrade to intermediate; lifetime benchmarks preserved; weights restart at 70%; auto-upgrade after 2 microcycles (12 sessions)

Phase transitions are automatic based on session count and performance signals. Benchmark exercises (基准动作) carry their PR history across phases, providing continuity while variants provide stimulus variety.
