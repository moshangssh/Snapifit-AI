import { describe, expect, it } from "vitest"
import {
  DEFAULT_EXPERT_ID,
  EXPERT_ROLES,
  expertDisplayName,
  getExpertRole,
} from "@/lib/ai/experts"

const expectedExpertCopy = [
  {
    id: "general",
    welcomeMessage: {
      title: "欢迎使用 SnapFit AI 健康助手",
      subtitle:
        "我是您的全方位健康管理顾问，可以帮助您解答营养、运动、代谢等各方面的健康问题",
      features: [
        "🎯 综合分析您的健康数据",
        "💡 提供个性化健康建议",
        "📋 制定可持续的健康计划",
        "🤝 解答各类健康疑问",
      ],
    },
    systemPromptIncludes: [
      "你是SnapFit AI，一位经验丰富的健康管理顾问",
      "综合分析用户的营养、运动、代谢数据",
      "[MEMORY_UPDATE_REQUEST]",
      "请告诉我您的健康问题或目标",
    ],
  },
  {
    id: "nutrition",
    welcomeMessage: {
      title: "欢迎咨询专业营养师",
      subtitle:
        "我是 Dr. Sarah Chen，注册营养师，专精运动营养和体重管理，为您提供科学的营养指导",
      features: [
        "🥗 精确分析宏量营养素配比",
        "📊 评估食物营养密度和质量",
        "🎯 设计个性化膳食计划",
        "⏰ 优化进餐时机和营养分配",
      ],
    },
    systemPromptIncludes: [
      "我是Dr. Sarah Chen，一位拥有15年临床经验的注册营养师(RD)",
      "运动营养专科认证(CSSD)",
      "食物偏好禁忌、过敏信息、营养目标变化、代谢特征、饮食习惯",
      "[MEMORY_UPDATE_REQUEST]",
    ],
  },
  {
    id: "exercise",
    welcomeMessage: {
      title: "欢迎来到专业健身指导",
      subtitle:
        "我是 Coach Mike Rodriguez，认证运动生理学家，专门为您设计科学的运动方案",
      features: [
        "💪 设计个性化运动处方",
        "🎯 优化有氧无氧运动配比",
        "📊 计算最佳运动强度区间",
        "⚡ 制定运动营养配合策略",
      ],
    },
    systemPromptIncludes: [
      "我是Coach Mike Rodriguez，认证的运动生理学家",
      "计算最佳运动强度区间（基于心率储备法）",
      "运动偏好、体能水平、伤病史、训练目标变化、运动限制",
      "[MEMORY_UPDATE_REQUEST]",
    ],
  },
  {
    id: "metabolism",
    welcomeMessage: {
      title: "欢迎咨询代谢优化专家",
      subtitle:
        "我是 Dr. Emily Watson，内分泌代谢专家，专注于人体能量代谢的精密调节和优化",
      features: [
        "🔥 精确分析BMR、TDEE匹配度",
        "⚡ 优化食物热效应(TEF)",
        "🧬 评估代谢适应性和灵活性",
        "📊 分析胰岛素敏感性调节",
      ],
    },
    systemPromptIncludes: [
      "我是Dr. Emily Watson，内分泌代谢领域的专家医师",
      "在《Nature Metabolism》等顶级期刊发表论文50+篇",
      "代谢特征、内分泌状况、代谢目标变化、代谢障碍、药物影响",
      "[MEMORY_UPDATE_REQUEST]",
    ],
  },
  {
    id: "behavior",
    welcomeMessage: {
      title: "欢迎来到行为改变实验室",
      subtitle:
        "我是 Dr. Alex Thompson，行为心理学专家，专门帮助您建立可持续的健康习惯",
      features: [
        "🧠 识别行为模式和触发点",
        "🔄 设计个性化行为改变策略",
        "🏠 优化环境和提示系统",
        "📈 建立渐进式习惯养成计划",
      ],
    },
    systemPromptIncludes: [
      "我是Dr. Alex Thompson，行为心理学专家",
      "斯坦福大学行为心理学博士",
      '"改变环境比改变意志力更有效"',
      "行为模式、心理障碍、习惯偏好、动机因素、环境限制",
      "[MEMORY_UPDATE_REQUEST]",
    ],
  },
  {
    id: "timing",
    welcomeMessage: {
      title: "欢迎进入时间营养学世界",
      subtitle:
        "我是 Dr. Maria Gonzalez，时间营养学专家，帮您找到最佳的生物节律和营养时机",
      features: [
        "⏰ 进餐时机与昼夜节律同步",
        "🏃 运动时机与代谢窗口匹配",
        "🌙 睡眠-代谢-营养协调优化",
        "📅 个性化生物节律时间表",
      ],
    },
    systemPromptIncludes: [
      "我是Dr. Maria Gonzalez，时间营养学(Chrono-nutrition)领域的先驱专家",
      '"什么时候吃，和吃什么一样重要"',
      "作息习惯、生物节律特征、时间偏好、工作时间安排、睡眠模式",
      "[MEMORY_UPDATE_REQUEST]",
    ],
  },
] as const

describe("expert roles module", () => {
  it("defines six experts with unique ids and complete copy", () => {
    expect(EXPERT_ROLES).toHaveLength(6)
    expect(new Set(EXPERT_ROLES.map((expert) => expert.id)).size).toBe(6)
    for (const expert of EXPERT_ROLES) {
      expect(expert.name.length).toBeGreaterThan(0)
      expect(expert.title.length).toBeGreaterThan(0)
      expect(expert.systemPrompt).toContain("[MEMORY_UPDATE_REQUEST]")
      expect(expert.welcomeMessage.title.length).toBeGreaterThan(0)
    }
  })

  it("locks the six expert personas and welcome messages", () => {
    expect(
      EXPERT_ROLES.map((expert) => ({
        id: expert.id,
        welcomeMessage: expert.welcomeMessage,
      })),
    ).toEqual(
      expectedExpertCopy.map(
        ({ systemPromptIncludes: _systemPromptIncludes, ...copy }) => copy,
      ),
    )

    for (const expected of expectedExpertCopy) {
      const expert = getExpertRole(expected.id)
      for (const copy of expected.systemPromptIncludes) {
        expect(expert.systemPrompt).toContain(copy)
      }
    }
  })

  it("resolves the selected expert and falls back to the default", () => {
    expect(getExpertRole("metabolism").name).toBe("代谢专家")
    expect(getExpertRole("no-such-expert").id).toBe(DEFAULT_EXPERT_ID)
    expect(getExpertRole(undefined).id).toBe(DEFAULT_EXPERT_ID)
  })

  it("maps every expert id to its display name and echoes unknown ids", () => {
    for (const expert of EXPERT_ROLES) {
      expect(expertDisplayName(expert.id)).toBe(expert.name)
    }
    expect(expertDisplayName("mystery")).toBe("mystery")
  })
})
