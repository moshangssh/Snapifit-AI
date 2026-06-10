# Snapifit AI Context

Snapifit AI tracks daily nutrition, activity, and recovery so the user can make same-day diet decisions with a consistent health budget vocabulary.

## Language

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
