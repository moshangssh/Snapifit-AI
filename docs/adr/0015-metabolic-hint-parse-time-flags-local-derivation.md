# 代谢提示降级为本地计算,识别改为解析时搭车打标

ADR 0010 把 AI 代谢提示定位为"识别、解释和置信度表达",但实践中专门的 TEF 分析调用贡献几乎为零:`generateTEFAnalysis` 对 AI 乘数与本地关键词乘数取 max,本地关键词表(咖啡因/绿茶/辛辣/冷饮等)已覆盖绝大多数场景;而独立 AI 路径带来每次记录食物一次额外 API 调用、15 秒延迟和缓存/调度/倒计时三套配套设施。我们决定删除专门的 TEF 分析调用,改为在食物解析时由解析 AI 顺带输出代谢因素标签(`metabolic_flags`,随 FoodEntry 存储的食物事实,零额外调用),本地关键词匹配作为旧数据和手动条目的兜底;功能更名为「代谢提示」(去掉 AI 前缀),定位不变:仅作解释,不进热量预算。

## Considered Options

- **整个退役**:省事,但基础 TEF 计算和因素提示对用户仍有解释价值,且本地计算零成本。
- **保留独立 AI 分析**:AI 能识别关键词表以外的食物,但被 max() 兜底后增量极小,不值得费用与延迟。
- **纯关键词计算**:零成本,但英文食物名、生僻菜名永远识别不到。
- **解析时搭车打标 + 关键词兜底(选定)**:每条食物记录本来就要过一次解析 AI,顺带打标即可获得 AI 级识别率,零额外调用、零延迟;代谢属性(咖啡因/辛辣)与 protein 一样是记录时确定的食物事实,存在 FoodEntry 上,不违背"派生结果不持久化"。

## Consequences

- 删除 AI 端点 `/api/ai/tef-analysis`、schema、`tef-cache`、`tef-background-analysis` 后台调度与倒计时。
- (后续切片)`FoodParseSchema` 与三个解析端点(parse / parse-image / parse-with-images)增加可选 `metabolic_flags` 枚举输出;`FoodEntry` 增加对应可选字段。落地前代谢提示仅由关键词匹配驱动。
- 代谢提示改为展示时从 `foodEntries` 现场派生(纯函数,优先读 flags,关键词兜底),`DailyLog.tefAnalysis` 字段停止写入并从类型中删除——派生值不持久化。
- 一并移除 legacy TEF 剔除(`getLegacyTEFEnhancement`):极老的历史记录在 fallback 路径下基础消耗可能虚高几十 kcal,接受该误差。
- AI prompt(chat/advice/智能建议)不再包含代谢提示行,AI 从食物列表自行推断代谢因素。
- 首页卡片从三态(未分析/分析中/完成)简化为两态,记录食物后即时显示。
