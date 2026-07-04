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
import { EXPERT_ROLES, getExpertRole } from "@/lib/ai/experts"
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

// 专家角色的领域数据(人格、文案)在 lib/ai/experts.ts;这里只保留 UI 映射。
const EXPERT_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  general: User,
  nutrition: Heart,
  exercise: Dumbbell,
  metabolism: Dna,
  behavior: Brain,
  timing: Clock,
}

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
  const currentExpert = getExpertRole(selectedExpert)

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
  const CurrentExpertIcon = EXPERT_ICON[currentExpert.id] ?? User
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
                {EXPERT_ROLES.map((expert) => {
                  const tileVariant: TileVariant = EXPERT_TILE[expert.id] ?? "ai"
                  const Icon = EXPERT_ICON[expert.id] ?? User
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
