# 宏量目标统一挂在「今日热量预算」上,蛋白按体重而非热量百分比

「今日热量平衡」Hero 卡片此前自己用固定 50/20/30 的热量百分比拆分碳水/蛋白/脂肪,热量基数还是「手填目标 或 baseline(不含运动、不调 goal、无安全下限)」。同一组件里其实已经算好了一份更科学的 `mealPlanBudgetSnapshot`(来自 `buildMacroTargets`),且已供「今天还能吃什么」卡片使用。我们决定**删掉 Hero 的朴素重算,让两处共用同一份 `宏量目标`**,口径统一。

科学上的关键改变:**蛋白质锚定体重 × 健康目标系数(g/kg),不再取热量的固定百分比**——减脂压低热量时蛋白目标不再跟着缩水,这也正是「补蛋白之选」理念的前提。脂肪带体重下限,碳水吃掉剩余预算。三大宏量因此挂在 `今日热量预算`(按 goal 调整后的吃饱预算)上,而非中性的 `今日维持热量`;`今日热量平衡` 的热量环仍保持中性维持视角不变。

附带修复一个与 `CONTEXT.md` 冲突的潜在 bug:`buildMealPlanBudgetSnapshot` 从不读 `userProfile.targetCalories`,与术语表「手填目标热量有就用」相悖。改为:`targetCalories > 0` 时直接以手填值为预算(仅受健康下限兜底,**不再叠加 goal 调整以免双重扣减**),为空才回退到 `(baseline+运动) 按 goal 推断`。

## Considered Options

- **就地修 50/20/30**:把 Hero 的百分比拆分改对,但仍与 `buildMacroTargets` 并存两套实现,口径迟早再次漂移。
- **蛋白保留百分比 + 体重下限兜底**:改动最小,但减脂日仍以百分比为主、体重锚定只在边界生效,不够干净。
- **删 Hero 重算、统一复用 snapshot(选定)**:一份 `宏量目标` 两处共用,蛋白纯按 g/kg,顺带修掉手填目标被无视的 bug。

## Consequences

- `app/page.tsx` 删除 585–589 的内联 `macroTargets`,三条进度条(798–825)与 `macroPctV2` 改读 `mealPlanBudgetSnapshot.macroTargets` 与 `.targetCalories`。
- `buildMealPlanBudgetSnapshot` 新增对 `userProfile.targetCalories` 的认领分支;手填目标不再被静默忽略,Hero 与餐计划卡片口径从此一致。
- 用户看到的碳水/蛋白/脂肪目标数值会变化(尤其减脂用户蛋白目标上升),历史日志不迁移,按当天快照口径解读即可。
