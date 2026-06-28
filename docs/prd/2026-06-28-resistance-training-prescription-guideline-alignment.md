# PRD: 力量训练处方指南对齐

## Problem Statement

当前训练计划生成器已经从随机 LLM 生成转为确定性训练引擎，但“是否符合 ACSM / NSCA / WHO”仍缺少可验证的硬约束。新手阶段已有较完整的 warmup/main/cooldown 和 AS 核心动作，中级和高级阶段仍偏向主训练清单；高级阶段有目标 RPE，但缺少用户实际 RPE 反馈；训练容量也没有作为训练引擎必须通过的处方质量检查。

用户需要的是一套可执行、可测试、可解释的力量训练处方：对齐 ACSM/NSCA 的力量训练设计原则，并对齐 WHO 肌力建议。WHO 有氧分钟数不属于本模块范围。

## Solution

为确定性训练引擎增加指南对齐层，让力量训练处方在返回给用户之前经过训练容量审计，并补齐中级/高级的三阶段训练结构和高级阶段实际 RPE 反馈。

用户视角上，生成训练计划后应能得到：

- 每次训练都有 warmup、main、cooldown。
- 主训练容量符合当前训练阶段和训练上下文。
- 减载、AS 安全锁、黑名单或动作池不足导致容量不足时，系统明确标记为受限，而不是伪装成正常达标。
- 高级阶段可以记录每个主训练动作的实际 RPE，并影响后续配重。
- 计划仍然不包含 WHO 有氧分钟数目标。

## User Stories

1. As a trainee, I want generated resistance training sessions to include warmup, main, and cooldown phases, so that every session has a complete structure.
2. As a trainee with AS, I want intermediate and advanced sessions to keep AS core movements, so that AS maintenance does not disappear when I progress phases.
3. As a trainee, I want warmup and cooldown movements to match the main muscle focus, so that preparation and recovery are relevant to the session.
4. As a trainee, I want deload sessions to keep warmup and cooldown, so that recovery sessions are still structured.
5. As a trainee, I want the system to check main strength volume before returning a plan, so that the generated prescription is not just plausible text.
6. As a trainee, I want the system to distinguish normal compliance from constrained plans, so that I understand when safety limits reduce training volume.
7. As a trainee, I want AS safety locks to take priority over volume targets, so that the engine never adds risky movements just to hit a number.
8. As a trainee, I want blacklisted exercises to stay excluded even when volume is low, so that previous discomfort signals remain respected.
9. As a trainee, I want deload volume to be treated as intentionally reduced, so that recovery weeks are not reported as engine failures.
10. As a trainee, I want a plan that is too low in volume to be adjusted within safe limits, so that small gaps are corrected automatically.
11. As a trainee, I want the engine to add sets before adding new exercises, so that progression tracking remains stable.
12. As a trainee, I want per-session volume caps to remain enforced, so that a guideline audit does not produce an overlong workout.
13. As a trainee, I want microcycle coverage to be audited, so that upper/lower split sessions are judged across a full rotation rather than one isolated day.
14. As a trainee, I want the microcycle audit to reflect the actual next generated rotation, so that blacklists, AS locks, and phase-specific selection are included.
15. As a trainee, I want novice volume targets to start conservatively, so that I can progress without being forced into excessive early volume.
16. As a trainee, I want later novice sessions to move toward higher volume, so that the plan progressively approaches stronger ACSM/NSCA resistance-training targets.
17. As an intermediate trainee, I want block-specific volume targets, so that accumulation, intensification, and deload blocks are judged differently.
18. As an advanced trainee, I want strength, hypertrophy, and endurance sessions to keep their distinct prescriptions, so that DUP remains meaningful.
19. As an advanced trainee, I want to record actual RPE for each main exercise, so that the engine can respond to how hard the work actually felt.
20. As an advanced trainee, I want actual RPE to adjust the next prescription gently, so that one subjective rating does not override demonstrated performance.
21. As an advanced trainee, I want the current e1RM model to remain the main load anchor, so that objective weight and reps still drive progression.
22. As a trainee, I want missing RPE to be allowed, so that I can finish a workout without being blocked by an optional subjective field.
23. As a trainee, I want the session UI to show prescription quality, so that I can see whether the plan passed, was adjusted, or was constrained.
24. As a trainee, I want audit snapshots saved with the workout session, so that the plan's prescription context remains visible later.
25. As a trainee, I do not want audit snapshots treated as performance history, so that progression is still based on completed training data.
26. As a maintainer, I want guideline alignment captured in deterministic tests, so that future engine changes cannot silently remove structure or capacity rules.
27. As a maintainer, I want WHO scope to be explicit, so that the app does not claim complete WHO physical-activity compliance without aerobic prescription.
28. As a maintainer, I want constrained reasons to be machine-readable, so that UI and future agents can explain why a plan is below target.
29. As a maintainer, I want volume audit rules to be separate from UI rendering, so that the engine owns prescription correctness.
30. As a maintainer, I want the PRD to respect ADR-0011 and ADR-0012, so that implementation follows the agreed RPE and microcycle audit decisions.

## Implementation Decisions

- The scope is resistance training only. The feature aligns with ACSM/NSCA resistance-training principles and WHO muscle-strengthening recommendations. WHO aerobic-minute guidance is out of scope.
- Guideline alignment is a training-engine hard constraint, not merely a UI explanation.
- The engine will produce a session audit and a microcycle audit.
- The session audit checks one generated session for three-phase structure and acceptable per-session main strength load.
- The microcycle audit checks one full generated template rotation for muscle frequency and main strength set targets.
- The microcycle audit must evaluate the actual next generated rotation from the current training state, not a static template table.
- Audit outcomes use four statuses: `pass`, `adjusted`, `constrained`, and `fail`.
- `pass` means the plan is normally compliant.
- `adjusted` means the engine corrected a low-volume or over-volume prescription within safe limits.
- `constrained` means deload, AS safety locks, blacklists, or action-pool limits intentionally prevent target volume.
- `fail` means an unexplained engine error or missing required structure, such as a non-deload resistance session without warmup/cooldown.
- Volume audit only counts main strength work. Warmup, cooldown, mobility, and AS core movements are excluded from strength-volume totals.
- Novice volume uses a staged target: sessions 0-24 target 6-10 main sets per major muscle group per microcycle; sessions 25-72 target 8-12.
- Intermediate volume is block-aware: accumulation may target higher volume, intensification lower-to-moderate volume, and deload intentionally reduced volume.
- Advanced volume remains training-type-aware under DUP and should not collapse strength, hypertrophy, and endurance days into one uniform target.
- Bounded volume adjustment prefers adding sets to an existing main exercise before adding a new main exercise.
- Adding a new main exercise is only allowed when a major muscle group is absent or cannot otherwise meet minimum coverage.
- Bounded volume adjustment must preserve per-session main set caps, AS safety locks, blacklists, and phase exercise pools.
- If safe adjustment is impossible, the audit should return `constrained`, not bypass safety rules.
- Intermediate and advanced plans must include warmup/main/cooldown, matching novice session structure expectations.
- Warmup and cooldown selection for intermediate and advanced phases should infer upper/lower focus from the generated main muscle distribution, not from a hardcoded template name.
- Each warmup and cooldown should include AS core coverage and training-related preparation or recovery work.
- Advanced phase adds action-level actual RPE for main exercises only. Warmup and cooldown do not require RPE.
- The first implementation records actual RPE, not RIR and not per-set RPE.
- Missing actual RPE must not block workout completion.
- Advanced load progression keeps the existing e1RM × target intensity model as the base.
- Actual RPE applies a small correction to advanced next-load calculation: actual RPE above target lowers the next load, actual RPE below target raises it.
- The agreed correction is about 3% per RPE point, capped to a total range of -9% to +6%.
- Audit snapshots are attached to generated plans and saved with workout sessions.
- Audit snapshots are prescription context, not performance history; progression should continue to use completed training data such as actual weight, reps, completion, discomfort, and actual RPE where applicable.
- The UI should show audit status and relevant volume information, replacing placeholder volume displays with actual audit data.
- The UI must not claim complete WHO guideline compliance because aerobic prescription is not included.

## Testing Decisions

- Tests should focus on externally visible behavior: generated plans, route responses, saved session data, and next-load outputs. They should not assert private helper implementation details.
- The highest test seam is the training plan route. Route tests should verify that returned plans include audit snapshots, that intermediate and advanced plans include warmup/main/cooldown, and that constrained scenarios are represented as constrained rather than normal pass.
- The phase engine seam should test novice, intermediate, and advanced generation behavior directly: three-phase structure, volume audit status, deload treatment, AS safety lock behavior, blacklist behavior, and bounded adjustment.
- The training volume audit seam should test pure audit rules: main-only counting, session audit, microcycle audit, staged novice targets, block-aware intermediate targets, advanced training-type targets, audit statuses, and bounded adjustment decisions.
- The workout session seam should test that action-level actual RPE is stored on main exercises, summarized into recent training context, and used by advanced progression.
- Existing test styles to follow include deterministic engine tests, route tests for workout-plan behavior, progression tests, deload tests, and workout-session tests.
- Good tests should construct small, representative training states and histories rather than snapshotting large full plans.
- Regression tests should cover missing actual RPE, because the field is optional and must preserve current behavior.
- Regression tests should cover deload audits, because low volume during deload is intentional.
- Regression tests should cover blacklisted or AS-locked movement pools, because safety constraints must override volume targets.

## Out of Scope

- WHO aerobic-minute prescription.
- Cardio scheduling, cardio minutes, cardio intensity, or aerobic adherence tracking.
- Clinical medical screening such as PAR-Q, physician approval workflows, contraindication management, or pain diagnosis.
- RIR tracking.
- Per-set RPE tracking.
- Replacing the deterministic training engine with LLM generation.
- Reworking the exercise catalog beyond what is necessary for safe warmup/cooldown selection.
- Changing nutrition, calorie budget, or daily energy snapshot behavior.
- Changing the overall phase transition thresholds unless required by the audit implementation.

## Further Notes

The domain glossary now distinguishes 力量训练处方 from broad 运动处方 and separates WHO 肌力建议 from WHO aerobic guidance. ADR-0011 records that actual RPE is a small correction to e1RM-based advanced progression, not a replacement. ADR-0012 records that microcycle audits must inspect actually generated future sessions rather than static templates.
