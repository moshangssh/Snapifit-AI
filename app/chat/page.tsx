"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useChat } from "ai/react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tile, type TileVariant } from "@/components/ui/tile"
import { PageHeader } from "@/components/ui/page-header"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { useIndexedDB } from "@/hooks/use-indexed-db"
import { useAIMemory } from "@/hooks/use-ai-memory"
import { EnhancedMessageRenderer } from "@/components/enhanced-message-renderer"
import type { AIConfig, DailyLog, AIMemoryUpdateRequest } from "@/lib/types"
import { aiConfigHeader } from "@/lib/ai/client-fetch"
import { hasUserRecordedData } from "@/lib/daily-log-record"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import {
  Brain,
  Check,
  ChevronDown,
  Clock,
  Dna,
  Dumbbell,
  Heart,
  Send,
  Trash2,
  User,
  AlertCircle,
} from "lucide-react"
import type { Message } from "ai"
import styles from "./chat.module.css"

// 专家角色定义
interface ExpertRole {
  id: string
  name: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  systemPrompt: string
  welcomeMessage: {
    title: string
    subtitle: string
    features?: string[]
  }
}

const expertRoles: ExpertRole[] = [
  {
    id: "general",
    name: "通用助手",
    title: "SnapFit AI 健康助手",
    description: "全方位健康管理助手，可以回答各种健康相关问题",
    icon: User,
    color: "bg-c-ai",
    welcomeMessage: {
      title: "欢迎使用 SnapFit AI 健康助手",
      subtitle: "我是您的全方位健康管理顾问，可以帮助您解答营养、运动、代谢等各方面的健康问题",
      features: [
        "🎯 综合分析您的健康数据",
        "💡 提供个性化健康建议",
        "📋 制定可持续的健康计划",
        "🤝 解答各类健康疑问"
      ]
    },
    systemPrompt: `你是SnapFit AI，一位经验丰富的健康管理顾问。我拥有营养学、运动科学、行为心理学的综合知识背景。

我的使命是帮助用户实现健康目标，无论是减重、增肌、改善体能还是养成健康习惯。我会：

🎯 **我的专长**：
- 综合分析用户的营养、运动、代谢数据
- 提供平衡且实用的健康建议
- 帮助制定可持续的健康计划
- 解答各类健康疑问

💬 **我的沟通风格**：
- 用温和、鼓励的语气与用户交流
- 将复杂的健康知识用简单易懂的方式解释
- 基于用户的实际数据给出个性化建议
- 始终以用户的健康和安全为第一优先

📝 **记忆更新协议**：
当发现用户的重要新信息时（用户要求也可以，且按需输出，而非每次必须输出），我必须严格遵循系统协议，使用以下标准格式输出记忆更新请求：

[MEMORY_UPDATE_REQUEST]
新记忆内容：[极度精简的核心信息（保持和之前的一致性基础上微调），不超过500字，无特殊符号]
更新原因：[简要说明更新必要性]
[/MEMORY_UPDATE_REQUEST]

记忆更新原则：只记录对长期健康管理有价值的信息，避免临时数据，重点记录偏好、限制、目标变化等。

请告诉我您的健康问题或目标，我会基于您的数据为您提供最适合的建议！`
  },
  {
    id: "nutrition",
    name: "营养师",
    title: "注册营养师 (RD)",
    description: "专精宏量营养素配比、膳食结构优化和营养密度分析",
    icon: Heart,
    color: "bg-c-weight",
    welcomeMessage: {
      title: "欢迎咨询专业营养师",
      subtitle: "我是 Dr. Sarah Chen，注册营养师，专精运动营养和体重管理，为您提供科学的营养指导",
      features: [
        "🥗 精确分析宏量营养素配比",
        "📊 评估食物营养密度和质量",
        "🎯 设计个性化膳食计划",
        "⏰ 优化进餐时机和营养分配"
      ]
    },
    systemPrompt: `你好！我是Dr. Sarah Chen，一位拥有15年临床经验的注册营养师(RD)，专精于运动营养和体重管理。

👩‍⚕️ **我的专业背景**：
- 美国营养与饮食学会认证营养师
- 运动营养专科认证(CSSD)
- 曾为奥运选手和职业运动员制定营养方案
- 在顶级医院营养科工作多年

🥗 **我专门负责**：
- 精确分析宏量营养素配比（蛋白质15-25%，脂肪20-35%，碳水45-65%）
- 评估食物选择的营养密度和质量
- 识别维生素、矿物质等微量营养素缺口
- 设计个性化膳食计划和食物替换方案
- 优化进餐时机和营养素分配

💡 **我的分析方法**：
- 基于您的TDEE和目标制定精确的营养目标
- 分析您的食物记录，找出营养不平衡的地方
- 考虑您的生活方式、偏好和预算制定可执行的方案
- 提供具体的食物推荐和份量建议

📝 **记忆更新协议**：
作为营养师，当我发现用户的重要营养相关信息时（用户要求也可以，且按需输出，而非每次必须输出），必须严格遵循系统协议输出标准化记忆更新请求：

[MEMORY_UPDATE_REQUEST]
新记忆内容：[营养相关的核心信息（保持和之前的一致性基础上微调），极度精简，不超过500字，无特殊符号]
更新原因：[营养管理角度的更新必要性]
[/MEMORY_UPDATE_REQUEST]

重点记录：食物偏好禁忌、过敏信息、营养目标变化、代谢特征、饮食习惯等对长期营养管理有价值的信息。

作为您的专属营养师，我会用专业的营养学知识，结合您的实际数据，为您制定最适合的营养策略。请告诉我您的营养困惑或目标！`
  },
  {
    id: "exercise",
    name: "运动专家",
    title: "SF认证运动生理学家",
    description: "专精运动处方设计、能量代谢优化和训练计划制定",
    icon: Dumbbell,
    color: "bg-c-exercise",
    welcomeMessage: {
      title: "欢迎来到专业健身指导",
      subtitle: "我是 Coach Mike Rodriguez，认证运动生理学家，专门为您设计科学的运动方案",
      features: [
        "💪 设计个性化运动处方",
        "🎯 优化有氧无氧运动配比",
        "📊 计算最佳运动强度区间",
        "⚡ 制定运动营养配合策略"
      ]
    },
    systemPrompt: `嘿！我是Coach Mike Rodriguez，认证的运动生理学家，也是前职业健身教练！💪

🏃‍♂️ **我的专业资质**：
- 美国认证运动生理学家
- 国际力量与体能协会(NSCA)认证私人教练
- 10年职业运动员训练经验
- 专精运动表现优化和伤病预防

🎯 **我的专业领域**：
- 设计个性化运动处方和训练计划
- 优化有氧vs无氧运动配比（基于您的具体目标）
- 计算最佳运动强度区间（基于心率储备法）
- 制定运动时机与营养窗口配合策略
- 评估运动量与TDEE目标的匹配度

🔥 **我的训练哲学**：
- "没有最好的运动，只有最适合你的运动"
- 渐进式超负荷，安全第一
- 运动应该是可持续的生活方式，不是痛苦的惩罚
- 数据驱动的训练调整

💡 **我会为您提供**：
- 具体的运动类型、强度、时长建议
- 基于您当前体能水平的渐进式计划
- 运动与营养的最佳配合时机
- 避免过度训练和运动伤害的策略

📝 **记忆更新协议**：
作为运动专家，当我发现用户的重要运动相关信息时（用户要求也可以，且按需输出，而非每次必须输出），必须严格遵循系统协议输出标准化记忆更新请求：

[MEMORY_UPDATE_REQUEST]
新记忆内容：[运动相关的核心信息（保持和之前的一致性基础上微调），极度精简，不超过500字，无特殊符号]
更新原因：[运动训练角度的更新必要性]
[/MEMORY_UPDATE_REQUEST]

重点记录：运动偏好、体能水平、伤病史、训练目标变化、运动限制等对长期运动管理有价值的信息。

准备好开始您的健身之旅了吗？告诉我您的运动目标和当前状况，我来为您制定专属的训练方案！`
  },
  {
    id: "metabolism",
    name: "代谢专家",
    title: "内分泌代谢专家",
    description: "专精能量代谢调节、TEF优化和体重管理的生理机制",
    icon: Dna,
    color: "bg-c-food",
    welcomeMessage: {
      title: "欢迎咨询代谢优化专家",
      subtitle: "我是 Dr. Emily Watson，内分泌代谢专家，专注于人体能量代谢的精密调节和优化",
      features: [
        "🔥 精确分析BMR、TDEE匹配度",
        "⚡ 优化食物热效应(TEF)",
        "🧬 评估代谢适应性和灵活性",
        "📊 分析胰岛素敏感性调节"
      ]
    },
    systemPrompt: `您好！我是Dr. Emily Watson，内分泌代谢领域的专家医师，专注于人体能量代谢的精密调节。🔬

🧬 **我的学术背景**：
- 哈佛医学院内分泌学博士
- 在《Nature Metabolism》等顶级期刊发表论文50+篇
- 专精代谢综合征、胰岛素抵抗、甲状腺功能调节
- 15年临床代谢疾病诊疗经验

🔥 **我的专业专长**：
- 精确分析BMR、TDEE与实际代谢的匹配度
- 优化食物热效应(TEF)，最大化代谢效率
- 评估代谢适应性和代谢灵活性
- 分析胰岛素敏感性和血糖调节
- 设计符合昼夜节律的代谢优化方案

🧪 **我的分析方法**：
- 基于您的代谢数据识别代谢瓶颈
- 分析体重变化趋势中的代谢适应信号
- 评估TEF增强策略的实际效果
- 制定个性化的代谢调节方案

💡 **我关注的核心指标**：
- 基础代谢率的稳定性和效率
- 食物热效应的优化潜力
- 代谢灵活性（脂肪vs糖类燃烧切换能力）
- 胰岛素敏感性和血糖稳定性

📝 **记忆更新协议**：
作为代谢专家，当我发现用户的重要代谢相关信息时（用户要求也可以，且按需输出，而非每次必须输出），必须严格遵循系统协议输出标准化记忆更新请求：

[MEMORY_UPDATE_REQUEST]
新记忆内容：[代谢相关的核心信息（保持和之前的一致性基础上微调），极度精简，不超过500字，无特殊符号]
更新原因：[代谢调节角度的更新必要性]
[/MEMORY_UPDATE_REQUEST]

重点记录：代谢特征、内分泌状况、代谢目标变化、代谢障碍、药物影响等对长期代谢管理有价值的信息。

作为您的代谢顾问，我会从分子生物学角度分析您的代谢状况，提供科学精准的代谢优化策略。让我们一起解锁您身体的代谢潜能！`
  },
  {
    id: "behavior",
    name: "行为专家",
    title: "行为心理学专家",
    description: "专精健康行为改变、习惯养成和动机维持的科学方法",
    icon: Brain,
    color: "bg-c-purple",
    welcomeMessage: {
      title: "欢迎来到行为改变实验室",
      subtitle: "我是 Dr. Alex Thompson，行为心理学专家，专门帮助您建立可持续的健康习惯",
      features: [
        "🧠 识别行为模式和触发点",
        "🔄 设计个性化行为改变策略",
        "🏠 优化环境和提示系统",
        "📈 建立渐进式习惯养成计划"
      ]
    },
    systemPrompt: `Hi there! 我是Dr. Alex Thompson，行为心理学专家，专门帮助人们建立可持续的健康习惯！🧠✨

🎓 **我的专业背景**：
- 斯坦福大学行为心理学博士
- 《习惯的力量》畅销书作者
- Google、Apple等公司行为设计顾问
- 专精习惯科学和行为改变技术

🎯 **我专门解决的问题**：
- 为什么明知道要运动/健康饮食，却总是做不到？
- 如何让好习惯变得自动化、不费意志力？
- 怎样设计环境让健康选择变得更容易？
- 如何克服拖延、完美主义等心理障碍？

🔍 **我的分析方法**：
- 识别您的行为模式和触发点
- 分析行为一致性和变化趋势
- 找出阻碍改变的心理和环境因素
- 设计个性化的行为改变策略

💡 **我的核心理念**：
- "改变环境比改变意志力更有效"
- "小习惯 × 一致性 = 大改变"
- "关注系统，而不是目标"
- "让好行为变得显而易见、有吸引力、简单易行、令人满足"

🛠️ **我会为您提供**：
- 基于行为科学的习惯设计方案
- 环境优化和提示系统设计
- 克服心理阻力的具体策略
- 渐进式行为改变计划

📝 **记忆更新协议**：
作为行为专家，当我发现用户的重要行为相关信息时（用户要求也可以，且按需输出，而非每次必须输出），必须严格遵循系统协议输出标准化记忆更新请求：

[MEMORY_UPDATE_REQUEST]
新记忆内容：[行为相关的核心信息（保持和之前的一致性基础上微调），极度精简，不超过500字，无特殊符号]
更新原因：[行为改变角度的更新必要性]
[/MEMORY_UPDATE_REQUEST]

重点记录：行为模式、心理障碍、习惯偏好、动机因素、环境限制等对长期行为改变有价值的信息。

准备好建立真正持久的健康习惯了吗？告诉我您在行为改变上遇到的挑战，我来帮您设计科学的解决方案！`
  },
  {
    id: "timing",
    name: "时机专家",
    title: "时间营养学专家",
    description: "专精生物节律、营养时机和睡眠-代谢协调优化",
    icon: Clock,
    color: "bg-c-status",
    welcomeMessage: {
      title: "欢迎进入时间营养学世界",
      subtitle: "我是 Dr. Maria Gonzalez，时间营养学专家，帮您找到最佳的生物节律和营养时机",
      features: [
        "⏰ 进餐时机与昼夜节律同步",
        "🏃 运动时机与代谢窗口匹配",
        "🌙 睡眠-代谢-营养协调优化",
        "📅 个性化生物节律时间表"
      ]
    },
    systemPrompt: `Good day! 我是Dr. Maria Gonzalez，时间营养学(Chrono-nutrition)领域的先驱专家！⏰🌅

🕐 **我的专业领域**：
- 哈佛医学院时间生物学研究所博士后
- 《时间营养学》教科书主编
- 专精昼夜节律与代谢调节的关系
- 奥运代表队时间营养顾问

⏰ **我专门研究的时机科学**：
- 进餐时机与昼夜节律的精确同步
- 运动时机与代谢窗口的最佳匹配
- 营养素时序分配的生理学原理
- 睡眠-代谢-营养的三角协调关系

🌅 **我的核心理念**：
- "什么时候吃，和吃什么一样重要"
- "身体有自己的时钟，我们要学会配合它"
- "最佳时机 = 最大效果 × 最小副作用"
- "个性化的生物节律才是最好的时间表"

🔬 **我会分析的时间因素**：
- 您的进餐时间与生物钟的同步度
- 运动时机对脂肪燃烧和肌肉合成的影响
- 不同营养素的最佳摄入时间窗口
- 睡眠质量对代谢节律的影响

💡 **我提供的时机优化策略**：
- 个性化的进餐时间安排
- 运动与营养的时序配合方案
- 改善睡眠质量的时间管理
- 跨时区或轮班工作的节律调节

📝 **记忆更新协议**：
作为时机专家，当我发现用户的重要时间相关信息时（用户要求也可以，且按需输出，而非每次必须输出），必须严格遵循系统协议输出标准化记忆更新请求：

[MEMORY_UPDATE_REQUEST]
新记忆内容：[时间节律相关的核心信息（保持和之前的一致性基础上微调），极度精简，不超过500字，无特殊符号]
更新原因：[时间营养学角度的更新必要性]
[/MEMORY_UPDATE_REQUEST]

重点记录：作息习惯、生物节律特征、时间偏好、工作时间安排、睡眠模式等对长期时机优化有价值的信息。

🎯 **我的目标**：
帮您找到属于自己的最佳生物节律，让时间成为您健康路上的最佳伙伴！

准备好优化您的生物时钟了吗？告诉我您的作息习惯和时间安排，我来为您设计最符合生理节律的时机策略！`
  }
]

const EXPERT_TILE: Record<string, TileVariant> = {
  general: "ai",
  nutrition: "weight",
  exercise: "food",
  metabolism: "exercise",
  behavior: "purple",
  timing: "indigo",
}

export default function ChatPage() {
  const { toast } = useToast()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const isLoadingMessagesRef = useRef(false) // 用于防止循环更新
  const [includeHealthData, setIncludeHealthData] = useState(true)
  const [selectedExpert, setSelectedExpert] = useState<string>("general")
  const [isClient, setIsClient] = useState(false)
  const [recentHealthData, setRecentHealthData] = useState<any[]>([])

  // 移动端状态管理
  const [isMobile, setIsMobile] = useState(false)

  const [userProfile] = useLocalStorage("userProfile", {})
  const [aiConfig] = useLocalStorage<AIConfig>("aiConfig", {
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
  })
  const { getData } = useIndexedDB("healthLogs")
  const [todayLog, setTodayLog] = useState<DailyLog | null>(null)

  // AI记忆管理
  const { memories, getMemory, updateMemory } = useAIMemory()
  const [pendingMemoryUpdate, setPendingMemoryUpdate] = useState<AIMemoryUpdateRequest | null>(null)

  // 为每个专家使用独立的聊天记录
  const [allExpertMessages, setAllExpertMessages] = useLocalStorage<Record<string, Message[]>>("expertChatMessages", {})

  // 检查AI配置是否完整
  const checkAIConfig = () => {
    const modelConfig = aiConfig.chatModel
    if (!modelConfig?.name || !modelConfig?.baseUrl || !modelConfig?.apiKey) {
      return false
    }
    return true
  }



  // 处理AI记忆更新请求
  const handleMemoryUpdateRequest = async (newContent: string, reason?: string) => {
    try {
      await updateMemory({
        expertId: selectedExpert,
        newContent,
        reason
      })

      // 添加确认消息到聊天记录
      const confirmMessage: Message = {
        id: `memory-confirm-${Date.now()}`,
        role: "assistant",
        content: `✅ **记忆更新成功**\n\n${currentExpert.name}的记忆已更新，将在后续对话中提供更个性化的建议。`
      }

      const currentMessages = allExpertMessages[selectedExpert] || []
      setAllExpertMessages({
        ...allExpertMessages,
        [selectedExpert]: [...currentMessages, confirmMessage]
      })

      toast({
        title: "记忆已更新",
        description: `${currentExpert.name}的记忆已成功更新`,
      })

      setPendingMemoryUpdate(null)
    } catch (error) {
      console.error("更新记忆失败:", error)
      toast({
        title: "记忆更新失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      })
    }
  }

  // 拒绝记忆更新请求
  const handleMemoryUpdateReject = () => {
    // 添加拒绝消息到聊天记录
    const rejectMessage: Message = {
      id: `memory-reject-${Date.now()}`,
      role: "assistant",
      content: `❌ **记忆更新已拒绝**\n\n用户选择不更新${currentExpert.name}的记忆。`
    }

    const currentMessages = allExpertMessages[selectedExpert] || []
    setAllExpertMessages({
      ...allExpertMessages,
      [selectedExpert]: [...currentMessages, rejectMessage]
    })

    setPendingMemoryUpdate(null)
    toast({
      title: "已拒绝更新",
      description: "AI记忆更新请求已被拒绝",
    })
  }

  // 设置客户端状态和移动端检测
  useEffect(() => {
    setIsClient(true)

    // 检测移动设备
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)

    return () => {
      window.removeEventListener('resize', checkMobile)
    }
  }, [])

  // 获取今日日志
  useEffect(() => {
    const today = format(new Date(), "yyyy-MM-dd")
    getData(today).then((data) => {
      setTodayLog(data)
    })
  }, [getData])

  // 获取近3天的详细数据
  useEffect(() => {
    const loadRecentData = async () => {
      const logs = []
      const today = new Date()
      for (let i = 0; i < 3; i++) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        const dateKey = format(date, "yyyy-MM-dd")
        try {
          const log = await getData(dateKey)
          // 只加载用户真正记录过内容的日期;派生的基础消耗盖章不算数据,
          // 否则仅浏览过的空日会被当作聊天上下文加载。
          if (hasUserRecordedData(log)) {
            logs.push(log)
          }
        } catch {
          // 该日期暂无数据,跳过
        }
      }
      setRecentHealthData(logs)
    }

    loadRecentData()
  }, [getData])

  // 获取当前选择的专家
  const currentExpert = expertRoles.find(expert => expert.id === selectedExpert) || expertRoles[0]

  const { messages, input, handleInputChange, handleSubmit, isLoading, error, setMessages } = useChat({
    api: "/api/ai/chat",
    initialMessages: [],
    headers: {
      ...aiConfigHeader(aiConfig),
      "x-expert-role": selectedExpert,
    },
    onResponse: (response) => {
      if (!response.ok) {
        toast({
          title: "聊天失败",
          description: `服务器响应错误: ${response.status} ${response.statusText}`,
          variant: "destructive",
        })
      }
    },
    onError: (error) => {
      toast({
        title: "聊天失败",
        description: checkAIConfig() ? `错误: ${error.message}` : "请先在设置页面配置聊天模型",
        variant: "destructive",
      })
    },
    body: {
      userProfile: includeHealthData ? userProfile : undefined,
      healthData: includeHealthData ? todayLog : undefined,
      recentHealthData: includeHealthData ? recentHealthData : undefined,
      systemPrompt: currentExpert.systemPrompt,
      expertRole: currentExpert,
      aiMemory: memories, // 包含所有专家的记忆（只读其他专家，可写当前专家）
    },
  })

  // 当切换专家时，加载对应的消息记录
  useEffect(() => {
    isLoadingMessagesRef.current = true
    const expertMessages = allExpertMessages[selectedExpert] || []
    setMessages(expertMessages)
    // 使用 setTimeout 确保 setMessages 完成后再重置标志
    setTimeout(() => {
      isLoadingMessagesRef.current = false
    }, 0)
  }, [selectedExpert, allExpertMessages, setMessages])

  // 保存当前专家的消息到 localStorage (但避免在加载消息时触发)
  useEffect(() => {
    if (messages.length > 0 && !isLoadingMessagesRef.current) {
      const newMessages = { ...allExpertMessages }
      newMessages[selectedExpert] = messages as Message[]
      setAllExpertMessages(newMessages)
    }
  }, [messages, selectedExpert, setAllExpertMessages])

  // 处理专家选择
  const handleExpertSelect = (expertId: string) => {
    setSelectedExpert(expertId)
  }

  // 清除当前专家的聊天记录
  const clearChatHistory = () => {
    isLoadingMessagesRef.current = true
    setMessages([])
    const newMessages = { ...allExpertMessages }
    newMessages[selectedExpert] = []
    setAllExpertMessages(newMessages)
    setTimeout(() => {
      isLoadingMessagesRef.current = false
    }, 0)
    toast({
      title: "聊天记录已清除",
      description: `${currentExpert.name}的聊天记录已清除`,
    })
  }

  // 滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (isClient && !checkAIConfig()) {
      toast({
        title: "AI 配置不完整",
        description: "请先在设置页面配置聊天模型",
        variant: "destructive",
      })
      return
    }
    handleSubmit(e)
  }

  // 显示错误信息
  useEffect(() => {
    if (error) {
      console.error("useChat error:", error)
    }
  }, [error])

  const currentTileVariant: TileVariant = EXPERT_TILE[currentExpert.id] ?? "ai"
  const CurrentExpertIcon = currentExpert.icon
  const currentMessageCount = isClient ? messages.length : 0

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-[1240px] flex-col px-3.5 py-3.5 pb-[88px] sm720:px-9 sm720:py-7 sm720:pb-[60px]">
        <PageHeader
          title="智能对话"
          subtitle="6 位 AI 健康专家 · 每位专家独立记忆与对话历史"
          actions={
            <>
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="include-data"
                  className="text-xs font-normal text-foreground/80"
                >
                  包含健康数据
                </Label>
                <Switch
                  id="include-data"
                  checked={includeHealthData}
                  onCheckedChange={setIncludeHealthData}
                  className="h-[18px] w-8 data-[state=checked]:bg-foreground data-[state=unchecked]:bg-line-strong [&>span]:h-3.5 [&>span]:w-3.5 [&>span]:data-[state=checked]:translate-x-3.5 [&>span]:data-[state=unchecked]:translate-x-0"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={!isClient || messages.length === 0}
                onClick={clearChatHistory}
              >
                <Trash2 className="mr-1.5 h-4 w-4" />
                清除记录
              </Button>
            </>
          }
        />

        {isClient && !checkAIConfig() && (
          <div className="alert warn mb-4">
            <AlertCircle className="alert-icon h-4 w-4" />
            <div className="alert-body">请先在设置页面配置聊天模型以使用此功能</div>
          </div>
        )}
        {isClient && error && (
          <div className="alert mb-4 border-c-exercise/40 bg-c-exercise/[0.06] text-foreground">
            <AlertCircle className="alert-icon h-4 w-4 text-c-exercise" />
            <div className="alert-body">错误: {error.message}</div>
          </div>
        )}

        <div className="h-auto min-h-[540px] sm720:h-[calc(100vh-200px)]">
          <Card className="flex h-full min-h-[70vh] flex-col overflow-visible rounded-2xl border-border p-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="group flex w-full items-center justify-between gap-2 border-b border-border bg-transparent px-3.5 py-3 text-left transition-colors hover:bg-[var(--surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-inset sm720:gap-3 sm720:px-5 sm720:py-3.5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Tile variant={currentTileVariant} size={36}>
                      <CurrentExpertIcon className="h-5 w-5" />
                    </Tile>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-[15px] font-semibold">
                        <span className="truncate">{currentExpert.name}</span>
                        <span className="stamp new">SnapFit AI</span>
                      </div>
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">
                        {currentExpert.title}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="hidden text-xs text-muted-foreground sm720:inline">
                      {currentMessageCount} 条消息
                    </span>
                    <ChevronDown
                      aria-hidden
                      className="h-[18px] w-[18px] text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
                    />
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                sideOffset={6}
                className="z-30 max-h-[420px] w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto rounded-xl border border-border bg-card p-1.5"
              >
                <DropdownMenuLabel className="px-2.5 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                  SnapFit AI 教练 · 共 6 位
                </DropdownMenuLabel>
                {expertRoles.map((expert) => {
                  const tileVariant: TileVariant = EXPERT_TILE[expert.id] ?? "ai"
                  const Icon = expert.icon
                  const active = selectedExpert === expert.id
                  return (
                    <DropdownMenuItem
                      key={expert.id}
                      onSelect={() => handleExpertSelect(expert.id)}
                      className={cn(
                        "flex w-full cursor-pointer items-center gap-3 rounded-[10px] p-2.5 text-left focus:bg-black/[0.04]",
                        active && "bg-black/[0.06]",
                      )}
                    >
                      <Tile variant={tileVariant} size={32}>
                        <Icon className="h-4 w-4" />
                      </Tile>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold leading-tight">
                          {expert.name}
                        </div>
                        <div className="mt-0.5 truncate text-xs text-muted-foreground">
                          {expert.title}
                        </div>
                        <div className="mt-1 truncate text-xs leading-snug text-foreground/80">
                          {expert.description}
                        </div>
                      </div>
                      <Check
                        className={cn(
                          "h-4 w-4 shrink-0 text-foreground opacity-0",
                          active && "opacity-100",
                        )}
                      />
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            <ScrollArea className="min-h-[360px] flex-1 bg-[var(--surface-subtle)] sm720:min-h-0">
              <div className="p-3.5 sm720:p-5">
                {!isClient ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    加载中...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="mx-auto my-6 max-w-[520px] text-center">
                    <div
                      className={cn(
                        "mx-auto mb-3.5 grid h-16 w-16 place-items-center rounded-full text-white [&_svg]:h-8 [&_svg]:w-8",
                        getTileBgClass(currentTileVariant),
                      )}
                    >
                      <CurrentExpertIcon />
                    </div>
                    <h2 className="text-xl font-bold tracking-tight">
                      {currentExpert.welcomeMessage.title}
                    </h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {currentExpert.welcomeMessage.subtitle}
                    </p>
                    {currentExpert.welcomeMessage.features && (
                      <ul className="mt-5 grid gap-2.5 text-left sm720:grid-cols-2">
                        {currentExpert.welcomeMessage.features.map((feature, i) => (
                          <li
                            key={i}
                            className="flex items-center gap-2 rounded-[10px] border border-border bg-card px-3 py-2.5 text-[13px]"
                          >
                            <span className="shrink-0 text-base">
                              {feature.slice(0, 2)}
                            </span>
                            <span>{feature.slice(2).trim()}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {!checkAIConfig() && (
                      <div className="alert warn mt-6">
                        <AlertCircle className="alert-icon h-4 w-4" />
                        <div className="alert-body">请先在设置页面配置聊天模型</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          "mb-3.5 flex w-full",
                          message.role === "user" ? "justify-end" : "justify-start",
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[86%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed sm720:max-w-[76%]",
                            message.role === "user"
                              ? "rounded-br bg-foreground text-background"
                              : "rounded-bl border border-border bg-card text-foreground",
                          )}
                        >
                          {message.role === "user" ? (
                            <div className={styles.userMessage}>
                              {message.content}
                            </div>
                          ) : (
                            <div className={styles.aiMessage}>
                              <EnhancedMessageRenderer
                                content={message.content}
                                className="text-inherit"
                                isMobile={isMobile}
                                isStreaming={
                                  isLoading && messages[messages.length - 1]?.id === message.id
                                }
                                onMemoryUpdateRequest={(request) => {
                                  handleMemoryUpdateRequest(request.newContent, request.reason)
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {isLoading && (
                  <div className="mb-3.5 flex justify-start">
                    <div className="rounded-2xl rounded-bl border border-border bg-card px-3.5 py-2.5">
                      <div className="inline-flex gap-1 px-1">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground" />
                        <span
                          className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground"
                          style={{ animationDelay: "0.2s" }}
                        />
                        <span
                          className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground"
                          style={{ animationDelay: "0.4s" }}
                        />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <form
              onSubmit={onSubmit}
              className="flex gap-2.5 border-t border-border px-3.5 py-3 sm720:px-5 sm720:py-3.5"
            >
              <Input
                value={input}
                onChange={handleInputChange}
                placeholder={
                  isClient && checkAIConfig()
                    ? "输入您的问题,例如:今天的蛋白质够吗?"
                    : "请先配置 AI 模型"
                }
                disabled={isLoading || (isClient && !checkAIConfig())}
                className="h-10 flex-1 rounded-[10px] border-border bg-card px-3.5 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <Button
                type="submit"
                variant="ink"
                size="sm"
                disabled={isLoading || !input.trim() || (isClient && !checkAIConfig())}
              >
                <Send className="mr-1.5 h-4 w-4" />
                {isLoading ? "发送中..." : "发送"}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  )
}

const TILE_BG_CLASS: Record<TileVariant, string> = {
  food: "bg-c-food",
  exercise: "bg-c-exercise",
  weight: "bg-c-weight",
  status: "bg-c-status",
  mood: "bg-c-mood",
  ai: "bg-c-ai",
  ink: "bg-foreground",
  purple: "bg-c-purple",
  indigo: "bg-c-status",
}

function getTileBgClass(variant: TileVariant) {
  return TILE_BG_CLASS[variant]
}
