"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { useAIMemory } from "@/hooks/use-ai-memory"
import { useAIMemoryEditor } from "@/hooks/use-ai-memory-editor"
import { expertDisplayName } from "@/lib/ai/experts"
import {
  createExportedHealthData,
  normalizeImportedHealthData,
} from "@/lib/health-data-export"
import {
  clearStores,
  exportStores,
  replaceStores,
} from "@/lib/indexed-db-utils"
import {
  DEFAULT_TRAINING_STATE,
  readTrainingState,
  setExerciseBlacklisted,
  writeTrainingState,
} from "@/lib/workout/engine/training-state"
import { STRENGTH_EXERCISES } from "@/lib/workout/engine/catalog"
import type { AIConfig, AIMemory, AIMemoryUpdateRequest, ModelConfig } from "@/lib/types"
import { DEFAULT_AI_CONFIG } from "@/lib/ai/client-fetch"
import type { OpenAIModel } from "@/lib/ai/types"
import { validateOptionalAIConfig } from "@/lib/ai/config"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { PageHeader } from "@/components/ui/page-header"
import { Tile } from "@/components/ui/tile"
import {
  Brain,
  Loader2,
  RefreshCw,
  UploadCloud,
  X,
} from "lucide-react"

const defaultUserProfile = {
  weight: 70,
  height: 170,
  age: 30,
  gender: "male",
  activityLevel: "moderate",
  goal: "maintain",
  targetWeight: undefined as number | undefined,
  targetCalories: undefined as number | undefined,
  notes: undefined as string | undefined,
  bmrFormula: "mifflin-st-jeor" as "mifflin-st-jeor" | "harris-benedict",
  bmrCalculationBasis: "totalWeight" as "totalWeight" | "leanBodyMass",
  bodyFatPercentage: undefined as number | undefined,
  // 专业模式字段
  professionalMode: false,
  medicalHistory: undefined as string | undefined,
  lifestyle: undefined as string | undefined,
  healthAwareness: undefined as string | undefined,
}

function SettingsContent() {
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const [userProfile, setUserProfile] = useLocalStorage("userProfile", defaultUserProfile)
  const [aiConfig, setAIConfig] = useLocalStorage<AIConfig>("aiConfig", DEFAULT_AI_CONFIG)
  const [trainingState, setTrainingState] = useState(DEFAULT_TRAINING_STATE)

  // 获取URL参数中的tab值，默认为profile
  const [activeTab, setActiveTab] = useState(() => {
    const tabParam = searchParams.get('tab')
    return tabParam && ['profile', 'goals', 'ai', 'data'].includes(tabParam)
      ? tabParam
      : 'profile'
  })

  const { memories, updateMemory, clearMemory, clearAllMemories } = useAIMemory()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 使用独立的表单状态，避免与 localStorage 状态冲突
  const [formData, setFormData] = useState(defaultUserProfile)
  const [aiFormData, setAIFormData] = useState(DEFAULT_AI_CONFIG)

  // 模型列表状态
  const [agentModels, setAgentModels] = useState<OpenAIModel[]>([])
  const [chatModels, setChatModels] = useState<OpenAIModel[]>([])
  const [visionModels, setVisionModels] = useState<OpenAIModel[]>([])

  // 加载状态
  const [loadingAgentModels, setLoadingAgentModels] = useState(false)
  const [loadingChatModels, setLoadingChatModels] = useState(false)
  const [loadingVisionModels, setLoadingVisionModels] = useState(false)

  // 初始化表单数据
  useEffect(() => {
    setFormData(userProfile)
  }, [userProfile])

  useEffect(() => {
    setAIFormData(aiConfig)
  }, [aiConfig])

  useEffect(() => {
    setTrainingState(readTrainingState())
  }, [])

  // 处理表单输入变化
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      let processedValue;
      // Handle primary numeric fields that should default to 0 if empty/invalid
      if (name === "weight" || name === "height" || name === "age") {
        processedValue = Number.parseFloat(value) || 0;
      }
      // Handle optional numeric fields that should be undefined if empty/invalid
      else if (name === "targetWeight" || name === "targetCalories" || name === "bodyFatPercentage") {
        if (value === "") {
          processedValue = undefined;
        } else {
          const parsed = Number.parseFloat(value);
          processedValue = Number.isNaN(parsed) ? undefined : parsed; // Store undefined if not a valid number
        }
      }
      // Handle string fields
      else {
        processedValue = value;
      }
      return {
        ...prev,
        [name]: processedValue,
      };
    });
  }, [])

  // 处理选择框变化
  const handleSelectChange = useCallback((name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }, [])

  // 处理Textarea变化
  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, [])

  // 处理专业模式切换
  const handleProfessionalModeChange = useCallback((checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      professionalMode: checked,
    }));
  }, [])

  // 处理AI配置变化
  const handleAIConfigChange = useCallback((modelType: keyof AIConfig, field: keyof ModelConfig, value: string) => {
    setAIFormData((prev) => ({
      ...prev,
      [modelType]: {
        ...prev[modelType],
        [field]: value,
      },
    }))

    // 如果修改了 baseUrl 或 apiKey，清空对应的模型列表
    if (field === "baseUrl" || field === "apiKey") {
      setTimeout(() => {
        switch (modelType) {
          case "agentModel":
            setAgentModels([])
            break
          case "chatModel":
            setChatModels([])
            break
          case "visionModel":
            setVisionModels([])
            break
        }
      }, 100)
    }
  }, [])

  // 获取模型列表
  const fetchModels = useCallback(
    async (modelType: keyof AIConfig) => {
      const modelConfig = aiFormData[modelType]

      if (!modelConfig.baseUrl || !modelConfig.apiKey) {
        toast({
          title: "配置不完整",
          description: "请先填写 Base URL 和 API Key",
          variant: "destructive",
        })
        return
      }

      // 设置加载状态
      switch (modelType) {
        case "agentModel":
          setLoadingAgentModels(true)
          break
        case "chatModel":
          setLoadingChatModels(true)
          break
        case "visionModel":
          setLoadingVisionModels(true)
          break
      }

      try {
        const response = await fetch("/api/ai/models", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            baseUrl: modelConfig.baseUrl,
            apiKey: modelConfig.apiKey,
          }),
        })

        if (!response.ok) {
          throw new Error("获取模型列表失败")
        }

        const data = await response.json()

        if (data.error) {
          throw new Error(data.error)
        }

        // 更新对应的模型列表
        switch (modelType) {
          case "agentModel":
            setAgentModels(data.data || [])
            break
          case "chatModel":
            setChatModels(data.data || [])
            break
          case "visionModel":
            setVisionModels(data.data || [])
            break
        }

        toast({
          title: "获取成功",
          description: `成功获取 ${data.data?.length || 0} 个可用模型`,
        })
      } catch (error) {
        console.error("Error fetching models:", error)
        toast({
          title: "获取失败",
          description: error instanceof Error ? error.message : "无法获取模型列表，请检查配置",
          variant: "destructive",
        })
      } finally {
        // 清除加载状态
        switch (modelType) {
          case "agentModel":
            setLoadingAgentModels(false)
            break
          case "chatModel":
            setLoadingChatModels(false)
            break
          case "visionModel":
            setLoadingVisionModels(false)
            break
        }
      }
    },
    [aiFormData, toast],
  )

  // 保存用户配置
  const handleSaveProfile = useCallback(() => {
    setUserProfile(formData)
    toast({
      title: "保存成功",
      description: "您的个人资料已更新",
    })
  }, [formData, setUserProfile, toast])

  // 保存AI配置
  const handleSaveAIConfig = useCallback(() => {
    const validation = validateOptionalAIConfig(aiFormData)

    if (!validation.valid) {
      toast({
        title: "配置不完整",
        description: validation.message,
        variant: "destructive",
      })
      return
    }

    setAIConfig(aiFormData)
    toast({
      title: "保存成功",
      description: `已保存 ${validation.configuredCount} 个 AI 模型配置`,
    })
  }, [aiFormData, setAIConfig, toast])

  // 测试AI配置
  const handleTestAIConfig = useCallback(
    async (modelType: keyof AIConfig) => {
      const model = aiFormData[modelType]
      if (!model.name || !model.baseUrl || !model.apiKey) {
        toast({
          title: "配置不完整",
          description: "请填写所有模型的名称、Base URL 和 API Key",
          variant: "destructive",
        })
        return
      }

      try {
        const response = await fetch("/api/ai/test-model", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            modelConfig: model,
            modelType,
          }),
        })

        if (response.ok) {
          toast({
            title: "测试成功",
            description: `${""} 模型连接正常`,
          })
        } else {
          throw new Error("测试失败")
        }
      } catch (error) {
        toast({
          title: "测试失败",
          description: `${""} 模型连接失败，请检查配置`,
          variant: "destructive",
        })
      }
    },
    [aiFormData, toast],
  )

  // 导出所有数据
  const handleExportData = useCallback(async () => {
    try {
      const stores = await exportStores()
      const exportData = createExportedHealthData({
        userProfile,
        aiConfig,
        stores,
        exportedAt: new Date().toISOString(),
      })

      const dataStr = JSON.stringify(exportData, null, 2)
      const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr)
      const exportFileDefaultName = `health-data-${new Date().toISOString().slice(0, 10)}.json`

      const linkElement = document.createElement("a")
      linkElement.setAttribute("href", dataUri)
      linkElement.setAttribute("download", exportFileDefaultName)
      linkElement.click()

      localStorage.setItem('lastExportTime', new Date().toISOString())

      toast({
        title: "导出成功",
        description: "您的健康数据已导出为 JSON 文件",
      })
    } catch (error) {
      console.error("导出数据失败:", error)
      toast({
        title: "导出失败",
        description: "无法导出您的健康数据",
        variant: "destructive",
      })
    }
  }, [userProfile, aiConfig, toast])

  // 导入数据
  const handleImportData = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string
          const importedData = normalizeImportedHealthData(JSON.parse(content))

          if (importedData.userProfile) {
            setUserProfile(importedData.userProfile as typeof userProfile)
          }
          if (importedData.aiConfig) {
            setAIConfig(importedData.aiConfig as typeof aiConfig)
          }

          await replaceStores(importedData.stores)

          toast({
            title: "导入成功",
            description: "您的健康数据已成功导入",
          })
        } catch (error) {
          console.error("导入数据失败:", error)
          toast({
            title: "导入失败",
            description: "无法导入您的健康数据，请确保文件格式正确",
            variant: "destructive",
          })
        } finally {
          if (event.target) {
            event.target.value = ""
          }
        }
      }

      reader.readAsText(file)
    },
    [aiConfig, setAIConfig, setUserProfile, toast, userProfile],
  )

  // 清空所有数据
  const handleClearAllData = useCallback(async () => {
    try {
      await clearStores()
      localStorage.removeItem("lastExportTime")
      toast({
        title: "清除成功",
        description: "所有健康日志数据已清除",
      })
    } catch (error) {
      console.error("清除数据失败:", error)
      toast({
        title: "清除失败",
        description: "无法清除您的健康数据",
        variant: "destructive",
      })
    }
  }, [toast])

  const handleClearExerciseBlacklist = useCallback(() => {
    const nextState = writeTrainingState({
      ...readTrainingState(),
      blacklistedExerciseIds: [],
    })
    setTrainingState(nextState)
    toast({
      title: "黑名单已清空",
      description: "后续训练计划会重新使用完整动作池",
    })
  }, [toast])

  const handleRemoveFromBlacklist = useCallback((exerciseId: string) => {
    const currentState = readTrainingState()
    const nextState = setExerciseBlacklisted(currentState, exerciseId, false)
    writeTrainingState(nextState)
    setTrainingState(nextState)
    toast({
      title: "已从黑名单移除",
      description: "此动作将在后续训练中重新出现",
    })
  }, [toast])

  // 渲染模型选择器
  const renderModelSelector = useCallback(
    (modelType: keyof AIConfig, models: OpenAIModel[], isLoading: boolean) => {
      const modelConfig = aiFormData[modelType]

      return (
        <div className="flex space-x-2 items-end">
          {models.length > 0 ? (
            <div className="flex-1">
              <Select
                value={modelConfig.name}
                onValueChange={(value) => handleAIConfigChange(modelType, "name", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={"选择模型"} />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <Input
              className="flex-1"
              value={modelConfig.name}
              onChange={(e) => handleAIConfigChange(modelType, "name", e.target.value)}
              placeholder={"例如: gpt-4o"}
            />
          )}
          <Button
            variant="outline"
            onClick={() => fetchModels(modelType)}
            disabled={isLoading || !modelConfig.baseUrl || !modelConfig.apiKey}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2">{"获取模型"}</span>
          </Button>
        </div>
      )
    },
    [aiFormData, handleAIConfigChange, fetchModels],
  )

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-6 sm720:px-8 sm720:py-10">
        <PageHeader title="设置" subtitle="管理你的应用偏好与数据" />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 sm720:w-auto sm720:inline-grid">
            <TabsTrigger value="profile">{"个人信息"}</TabsTrigger>
            <TabsTrigger value="goals">{"健康目标"}</TabsTrigger>
            <TabsTrigger value="ai">{"AI 配置"}</TabsTrigger>
            <TabsTrigger value="data">{"数据管理"}</TabsTrigger>
          </TabsList>

        {/* 个人信息 */}
        <TabsContent value="profile">
          <Card className="rounded-2xl border-border">
            <CardHeader>
              <CardTitle>{"个人信息"}</CardTitle>
              <CardDescription>{"更新您的个人信息，这些数据将用于计算卡路里消耗和提供个性化建议"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weight">{"体重 (kg)"}</Label>
                  <Input id="weight" name="weight" type="number" value={formData.weight} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height">{"身高 (cm)"}</Label>
                  <Input id="height" name="height" type="number" value={formData.height} onChange={handleInputChange} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="age">{"年龄"}</Label>
                  <Input id="age" name="age" type="number" value={formData.age} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">{"性别"}</Label>
                  <Select value={formData.gender} onValueChange={(value) => handleSelectChange("gender", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder={"性别"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">{"男"}</SelectItem>
                      <SelectItem value="female">{"女"}</SelectItem>
                      <SelectItem value="other">{"其他"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="activityLevel">{"日常状态（不含有意识运动）"}</Label>
                <Select
                  value={formData.activityLevel}
                  onValueChange={(value) => handleSelectChange("activityLevel", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={"日常状态（不含有意识运动）"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sedentary">{"久坐少动 — 全天办公 / 通勤坐车"}</SelectItem>
                    <SelectItem value="light">{"轻度活跃 — 站立工作 / 经常走动"}</SelectItem>
                    <SelectItem value="moderate">{"中度活跃 — 体力劳动（护士、工地）"}</SelectItem>
                    <SelectItem value="active">{"高度活跃 — 重体力劳动"}</SelectItem>
                    <SelectItem value="very_active">{"极重活跃 — 农忙 / 矿工"}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {"此处描述你日常生活的活动强度（走路、家务、姿势维持等 NEAT），用于估算基础消耗。"}
                  <b className="font-semibold text-foreground">{"不要按运动频率选档位"}</b>
                  {"——跑步、举铁等刻意运动请到运动模块单独打卡,系统会自动叠加到当日总消耗,避免双重计算。"}
                </p>
              </div>

              {/* BMR Formula Selection */}
              <div className="space-y-2">
                <Label htmlFor="bmrFormula">{"BMR 计算公式"}</Label>
                <Select
                  value={formData.bmrFormula || 'mifflin-st-jeor'}
                  onValueChange={(value) => handleSelectChange("bmrFormula", value)}
                >
                  <SelectTrigger id="bmrFormula">
                    <SelectValue placeholder={"选择BMR计算公式"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mifflin-st-jeor">{"Mifflin-St Jeor"}</SelectItem>
                    <SelectItem value="harris-benedict">{"Harris-Benedict (修正版)"}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {"选择用于计算基础代谢率 (BMR) 的公式。"}
                </p>
              </div>

              {/* BMR Calculation Basis Selection */}
              <div className="space-y-2">
                <Label htmlFor="bmrCalculationBasis">{"BMR 计算依据"}</Label>
                <Select
                  value={formData.bmrCalculationBasis || 'totalWeight'}
                  onValueChange={(value) => handleSelectChange("bmrCalculationBasis", value)}
                >
                  <SelectTrigger id="bmrCalculationBasis">
                    <SelectValue placeholder={"选择BMR计算依据"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="totalWeight">{"基于总体重"}</SelectItem>
                    <SelectItem value="leanBodyMass">{"基于去脂体重 (需填写体脂率)"}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {"选择计算BMR时是使用总体重还是去脂体重。选择后者通常更准确，但需要您提供体脂率。"}
                </p>
              </div>

              {/* Body Fat Percentage Input (conditional) */}
              {formData.bmrCalculationBasis === 'leanBodyMass' && (
                <div className="space-y-2">
                  <Label htmlFor="bodyFatPercentage">{"体脂率 (%)"}</Label>
                  <Input
                    id="bodyFatPercentage"
                    name="bodyFatPercentage"
                    type="number"
                    value={formData.bodyFatPercentage === undefined ? "" : String(formData.bodyFatPercentage)} // Display empty string for undefined
                    onChange={handleInputChange}
                    placeholder={"例如: 15"}
                    min="0"
                    max="99"
                    step="0.1"
                  />
                  <p className="text-xs text-muted-foreground">
                    {"请输入您的体脂百分比。例如，输入15代表15%。"}
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button variant="ink" onClick={handleSaveProfile}>{"保存个人信息"}</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* 健康目标 */}
        <TabsContent value="goals">
          <Card className="rounded-2xl border-border">
            <CardHeader>
              <CardTitle>{"健康目标"}</CardTitle>
              <CardDescription>{"设置您的健康目标，AI 助手将根据您的目标提供个性化建议"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="goal">{"目标类型"}</Label>
                <Select value={formData.goal} onValueChange={(value) => handleSelectChange("goal", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder={"选择目标"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lose_weight">{"减重"}</SelectItem>
                    <SelectItem value="maintain">{"保持体重"}</SelectItem>
                    <SelectItem value="gain_weight">{"增重"}</SelectItem>
                    <SelectItem value="build_muscle">{"增肌"}</SelectItem>
                    <SelectItem value="improve_health">{"改善健康"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="targetWeight">{"目标体重 (kg)"}</Label>
                  <Input
                    id="targetWeight"
                    name="targetWeight"
                    type="number"
                    value={formData.targetWeight || ""}
                    onChange={handleInputChange}
                    placeholder={"可选"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetCalories">{"目标每日卡路里 (kcal)"}</Label>
                  <Input
                    id="targetCalories"
                    name="targetCalories"
                    type="number"
                    value={formData.targetCalories || ""}
                    onChange={handleInputChange}
                    placeholder={"可选"}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="notes">{"其他目标或注意事项"}</Label>
                  <p className="text-sm font-medium text-muted-foreground">{"补充说明您的个人目标和相关情况"}</p>
                </div>
                <div className="space-y-2">
                  <Textarea
                    id="notes"
                    name="notes"
                    value={formData.notes || ""}
                    onChange={handleTextareaChange}
                    placeholder={"分享您的个人目标和偏好，让AI更好地为您服务..."}
                    className="min-h-[120px] text-base"
                  />
                  <div className="text-xs text-muted-foreground whitespace-pre-line">
                    {"个人目标：如改善睡眠、增强体力、提升运动表现等\n相关情况：如饮食偏好、生活习惯、身体状况、用药情况等（可选填写，有助于AI提供更精准的建议）"}
                  </div>
                </div>
              </div>

              {/* 专业模式切换 */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="professional-mode">{"专业模式"}</Label>
                    <p className="text-sm text-muted-foreground">{"启用专业模式以填写更详细的健康信息，帮助AI提供更精准的个性化建议"}</p>
                  </div>
                  <Switch
                    id="professional-mode"
                    checked={formData.professionalMode || false}
                    onCheckedChange={handleProfessionalModeChange}
                  />
                </div>

                {/* 专业模式字段 */}
                {formData.professionalMode && (
                  <div className="space-y-6 pt-4">
                    <div className="space-y-3">
                      <Label htmlFor="medicalHistory">{"现有疾病、过敏、药物/补充剂、家族病史"}</Label>
                      <Textarea
                        id="medicalHistory"
                        name="medicalHistory"
                        value={formData.medicalHistory || ""}
                        onChange={handleTextareaChange}
                        placeholder={"请详细描述您的现有疾病、过敏史、正在服用的药物或补充剂（包括剂量和原因）、以及家族病史等信息..."}
                        className="min-h-[150px] text-base"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="lifestyle">{"食物偏好/禁忌、睡眠质量、压力水平、烟酒习惯"}</Label>
                      <Textarea
                        id="lifestyle"
                        name="lifestyle"
                        value={formData.lifestyle || ""}
                        onChange={handleTextareaChange}
                        placeholder={"请描述您的饮食偏好和禁忌、睡眠质量、日常压力水平、烟酒习惯等生活方式信息..."}
                        className="min-h-[150px] text-base"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="healthAwareness">{"健康认知与目标期望"}</Label>
                      <Textarea
                        id="healthAwareness"
                        name="healthAwareness"
                        value={formData.healthAwareness || ""}
                        onChange={handleTextareaChange}
                        placeholder={"请分享您对自身健康状况的认知、对卡路里目标的理解和期望、改变的意愿以及可能面临的挑战..."}
                        className="min-h-[150px] text-base"
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="ink" onClick={handleSaveProfile}>{"保存健康目标"}</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* AI 配置 */}
        <TabsContent value="ai">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 工作模型/Agents模型 */}
              <Card className="rounded-2xl border-border">
                <CardHeader>
                  <CardTitle>{"工作模型 / Agents 模型"}</CardTitle>
                  <CardDescription>{"用于生成健康建议和分析的模型"}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="agent-base-url">{"Base URL"}</Label>
                      <Input
                        id="agent-base-url"
                        value={aiFormData.agentModel.baseUrl}
                        onChange={(e) => handleAIConfigChange("agentModel", "baseUrl", e.target.value)}
                        placeholder={"例如: https://api.openai.com"}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="agent-api-key">{"API Key"}</Label>
                      <Input
                        id="agent-api-key"
                        type="password"
                        value={aiFormData.agentModel.apiKey}
                        onChange={(e) => handleAIConfigChange("agentModel", "apiKey", e.target.value)}
                        placeholder={"输入 API Key"}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="agent-model-name">{"模型名称"}</Label>
                    {renderModelSelector("agentModel", agentModels, loadingAgentModels)}
                    {agentModels.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">{`成功获取 ${agentModels.length} 个可用模型`}</p>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="bare" size="sm" onClick={() => handleTestAIConfig("agentModel")}>
                    {"测试连接"}
                  </Button>
                </CardFooter>
              </Card>

              {/* 对话模型 */}
              <Card className="rounded-2xl border-border">
                <CardHeader>
                  <CardTitle>{"对话模型"}</CardTitle>
                  <CardDescription>{"用于智能对话功能的模型"}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="chat-base-url">{"Base URL"}</Label>
                      <Input
                        id="chat-base-url"
                        value={aiFormData.chatModel.baseUrl}
                        onChange={(e) => handleAIConfigChange("chatModel", "baseUrl", e.target.value)}
                        placeholder={"例如: https://api.openai.com"}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="chat-api-key">{"API Key"}</Label>
                      <Input
                        id="chat-api-key"
                        type="password"
                        value={aiFormData.chatModel.apiKey}
                        onChange={(e) => handleAIConfigChange("chatModel", "apiKey", e.target.value)}
                        placeholder={"输入 API Key"}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="chat-model-name">{"模型名称"}</Label>
                    {renderModelSelector("chatModel", chatModels, loadingChatModels)}
                    {chatModels.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">{`成功获取 ${chatModels.length} 个可用模型`}</p>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="bare" size="sm" onClick={() => handleTestAIConfig("chatModel")}>
                    {"测试连接"}
                  </Button>
                </CardFooter>
              </Card>

              {/* 视觉模型 */}
              <Card className="rounded-2xl border-border">
                <CardHeader>
                  <CardTitle>{"视觉模型"}</CardTitle>
                  <CardDescription>{"用于图片识别和分析的模型"}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="vision-base-url">{"Base URL"}</Label>
                      <Input
                        id="vision-base-url"
                        value={aiFormData.visionModel.baseUrl}
                        onChange={(e) => handleAIConfigChange("visionModel", "baseUrl", e.target.value)}
                        placeholder={"例如: https://api.openai.com"}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vision-api-key">{"API Key"}</Label>
                      <Input
                        id="vision-api-key"
                        type="password"
                        value={aiFormData.visionModel.apiKey}
                        onChange={(e) => handleAIConfigChange("visionModel", "apiKey", e.target.value)}
                        placeholder={"输入 API Key"}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vision-model-name">{"模型名称"}</Label>
                    {renderModelSelector("visionModel", visionModels, loadingVisionModels)}
                    {visionModels.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">{`成功获取 ${visionModels.length} 个可用模型`}</p>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="bare" size="sm" onClick={() => handleTestAIConfig("visionModel")}>
                    {"测试连接"}
                  </Button>
                </CardFooter>
              </Card>
            </div>

            <Button variant="ink" onClick={handleSaveAIConfig}>{"保存 AI 配置"}</Button>

            {/* AI记忆管理 */}
            <Card className="mt-6 rounded-2xl border-border">
              <CardHeader>
                <CardTitle>{"AI助手记忆管理"}</CardTitle>
                <CardDescription>
                  {"查看和管理每个AI助手的记忆内容。AI助手会记住重要的用户信息以提供更个性化的建议。"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(memories).length === 0 ? (
                  <p className="text-sm text-muted-foreground">{"暂无AI记忆数据"}</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(memories).map(([expertId, memory]) => (
                      <AIMemoryCard
                        key={expertId}
                        expertId={expertId}
                        memory={memory}
                        updateMemory={updateMemory}
                        clearMemory={clearMemory}
                      />
                    ))}
                  </div>
                )}

                {Object.entries(memories).length > 0 && (
                  <div className="pt-4 border-t">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          {"清空所有AI记忆"}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{"确认清空所有AI记忆"}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {"此操作将清空所有AI助手的记忆内容，无法恢复。AI助手将失去对您的个性化了解。"}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{"取消"}</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => {
                              clearAllMemories().then(() => {
                                toast({
                                  title: "所有记忆已清空",
                                  description: "所有AI助手的记忆已清空",
                                })
                              }).catch((error) => {
                                toast({
                                  title: "清空失败",
                                  description: error.message,
                                  variant: "destructive",
                                })
                              })
                            }}
                          >
                            {"确认清空"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </TabsContent>

        {/* 数据管理 */}
        <TabsContent value="data">
          <Card className="rounded-2xl border-border">
            <CardHeader>
              <CardTitle>{"数据管理"}</CardTitle>
              <CardDescription>{"导出或导入您的健康数据，或清空所有数据"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">训练动作黑名单</h3>
                <p className="text-sm text-muted-foreground">
                  {trainingState.blacklistedExerciseIds.length === 0
                    ? "暂无被标记为感觉不对的动作"
                    : `已排除 ${trainingState.blacklistedExerciseIds.length} 个动作`}
                </p>
                {trainingState.blacklistedExerciseIds.length > 0 && (
                  <div className="max-h-48 overflow-auto rounded-md border bg-muted/30 p-3">
                    <div className="space-y-2">
                      {trainingState.blacklistedExerciseIds.map((exerciseId) => {
                        const exercise = STRENGTH_EXERCISES.find((ex) => ex.id === exerciseId)
                        return (
                          <div
                            key={exerciseId}
                            className="flex items-center justify-between rounded-md bg-background px-3 py-2 text-sm"
                          >
                            <div className="flex-1">
                              <div className="font-medium">{exercise?.name ?? "未知动作"}</div>
                              <div className="text-xs text-muted-foreground font-mono">
                                {exerciseId}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveFromBlacklist(exerciseId)}
                              className="ml-2 h-7 w-7 p-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                <Button
                  variant="outline"
                  disabled={trainingState.blacklistedExerciseIds.length === 0}
                  onClick={handleClearExerciseBlacklist}
                >
                  清空动作黑名单
                </Button>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-medium">{"导出数据"}</h3>
                <p className="text-sm text-muted-foreground">{"将您的所有健康数据导出为 JSON 文件，以便备份或迁移"}</p>
                <Button variant="ink" onClick={handleExportData}>{"导出所有数据"}</Button>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-medium">{"导入数据"}</h3>
                <p className="text-sm text-muted-foreground">{"从之前导出的 JSON 文件中导入健康数据"}</p>
                <div className="flex items-center space-x-2">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportData}
                    className="hidden"
                    ref={fileInputRef}
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <UploadCloud className="mr-2 h-4 w-4" />
                    {"选择文件"}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-medium">{"清空数据"}</h3>
                <p className="text-sm text-muted-foreground">{"清空所有健康日志数据，此操作不可撤销"}</p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">{"清空所有数据"}</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{"确认清空数据"}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {"此操作将永久删除所有健康日志数据，且无法恢复。您确定要继续吗？"}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{"取消"}</AlertDialogCancel>
                      <AlertDialogAction onClick={handleClearAllData}>{"确认清空"}</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 关于与帮助 */}
      <Card className="mt-6 rounded-2xl border-border">
        <CardHeader>
          <CardTitle>{"关于与帮助"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">{"隐私声明"}</h3>
            <p className="text-sm text-muted-foreground">
              {"本应用所有数据均存储在您的浏览器本地，不会上传到任何服务器。与 AI 模型的通信仅用于处理您的输入并生成建议，不会存储您的个人数据。"}
            </p>
          </div>

          <div>
            <h3 className="text-lg font-medium">{"使用说明"}</h3>
            <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
              <li>{"在主页记录您的饮食和运动"}</li>
              <li>{"使用文本输入或上传图片来添加记录"}</li>
              <li>{"在智能对话页面与 AI 助手交流获取健康建议"}</li>
              <li>{"在 AI 配置页面设置您的模型参数"}</li>
              <li>{"定期导出您的数据以防数据丢失"}</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-medium">{"版本信息"}</h3>
            <p className="text-sm text-muted-foreground">{"SnapFit AI 个人版"}</p>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-6 sm720:px-8 sm720:py-10">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">加载设置...</p>
          </div>
        </div>
      </div>
    </div>}>
      <SettingsContent />
    </Suspense>
  )
}

interface AIMemoryCardProps {
  expertId: string
  memory: AIMemory
  updateMemory: (request: AIMemoryUpdateRequest) => Promise<void>
  clearMemory: (expertId: string) => Promise<void>
}

function AIMemoryCard({ expertId, memory, updateMemory, clearMemory }: AIMemoryCardProps) {
  const { toast } = useToast()
  const { draft, setDraft, save, isSaving, hasUnsavedChanges } = useAIMemoryEditor({
    expertId,
    persistedContent: memory.content,
    updateMemory,
    onSaveSuccess: () =>
      toast({
        title: "记忆已保存",
        description: "AI助手记忆已自动保存",
      }),
    onSaveError: (error) => {
      console.error("保存记忆失败:", error)
      toast({
        title: "保存失败",
        description: "记忆保存失败，请重试",
        variant: "destructive",
      })
    },
  })

  return (
    <Card className="rounded-2xl border-border">
      <CardHeader className="pb-2 px-4 pt-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Tile variant="purple" size={18}>
              <Brain />
            </Tile>
            {expertDisplayName(expertId)}
          </CardTitle>
          <div className="text-xs text-muted-foreground">
            {memory.content.length}/500
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          {new Date(memory.lastUpdated).toLocaleDateString('zh-CN')}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <div className="space-y-2">
          <div className="relative">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={"AI助手的记忆内容..."}
              className="min-h-[60px] resize-none text-sm"
              maxLength={500}
            />
            {/* 保存状态指示器 */}
            {isSaving && (
              <div className="absolute top-1 right-1 flex items-center space-x-1 text-xs text-c-ai bg-c-ai/10 px-1.5 py-0.5 rounded">
                <div className="w-2 h-2 border border-c-ai border-t-transparent rounded-full animate-spin"></div>
                <span>{"保存中"}</span>
              </div>
            )}
            {hasUnsavedChanges && !isSaving && (
              <div className="absolute top-1 right-1 flex items-center space-x-1 text-xs text-c-food bg-c-food/10 px-1.5 py-0.5 rounded">
                <div className="w-1.5 h-1.5 bg-c-food rounded-full"></div>
                <span>{"未保存"}</span>
              </div>
            )}
          </div>
          <div className="flex justify-between items-center">
            <div className="text-xs text-muted-foreground">
              {draft.length > 400 && (
                <span className="text-c-food">
                  即将达到上限
                </span>
              )}
              {hasUnsavedChanges && (
                <span className="text-c-food">
                  3秒后自动保存
                </span>
              )}
            </div>
            <div className="flex space-x-1">
              {hasUnsavedChanges && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => save()}
                  disabled={isSaving}
                  className="h-6 px-2 text-xs"
                >
                  {isSaving ? "保存中" : "保存"}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  clearMemory(expertId).then(() => {
                    toast({
                      title: "所有记忆已清空",
                      description: `${expertDisplayName(expertId)}的记忆已清空`,
                    })
                  }).catch((error) => {
                    toast({
                      title: "清空失败",
                      description: error.message,
                      variant: "destructive",
                    })
                  })
                }}
                className="h-6 px-2 text-xs"
              >
                {"清除"}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
