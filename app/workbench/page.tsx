"use client"

import type React from "react"

import { Suspense, useState, useEffect, useMemo, useRef } from "react"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  ImageIcon,
  Utensils,
  Dumbbell,
  AlertCircle,
  CheckCircle2,
  Info,
  Trash2,
  Edit3,
  Flame,
  CalendarDays,
  ArrowLeft,
  RotateCcw,
  Send,
  X,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import type { FoodEntry, ExerciseEntry, DailyLog, AIConfig, DailyStatus } from "@/lib/types"
import { postAI } from "@/lib/ai/client-fetch"
import { FoodEntryCard } from "@/components/food-entry-card"
import { ExerciseEntryCard } from "@/components/exercise-entry-card"
import { DailyStatusCard } from "@/components/DailyStatusCard"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { useIndexedDB } from "@/hooks/use-indexed-db"
import { useDateRecords } from "@/hooks/use-date-records"
import { compressImage } from "@/lib/image-utils"
import { PageHeader } from "@/components/ui/page-header"
import { Tile } from "@/components/ui/tile"
import { formatDateParam, parseDateParam } from "@/lib/date-params"
import { useDailyLogWriter } from "@/hooks/use-daily-log-writer"

// 图片预览类型
interface ImagePreview {
  file: File
  url: string
  compressedFile?: File
}

const WORKBENCH_CARD_CLASS = "rounded-2xl border-border shadow-none transition-none hover:shadow-none"

function WorkbenchContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const dateParamRaw = searchParams.get("date")
  const selectedDate = useMemo(() => parseDateParam(dateParamRaw), [dateParamRaw])
  const dateParam = formatDateParam(selectedDate)

  const setSelectedDate = (date: Date) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("date", formatDateParam(date))
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const jumpToToday = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("date")
    const queryStr = params.toString()
    router.replace(queryStr ? `${pathname}?${queryStr}` : pathname, { scroll: false })
  }

  const isToday = dateParam === formatDateParam(new Date())

  const currentLocale = zhCN
  const [inputText, setInputText] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [activeTab, setActiveTab] = useState("food")
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 图片上传状态
  const [uploadedImages, setUploadedImages] = useState<ImagePreview[]>([])
  const [isCompressing, setIsCompressing] = useState(false)

  // 使用本地存储钩子获取用户配置
  const [userProfile, , isUserProfileHydrated] = useLocalStorage("userProfile", {
    weight: 70,
    height: 170,
    age: 30,
    gender: "male",
    activityLevel: "moderate",
    goal: "maintain",
    bmrFormula: "mifflin-st-jeor" as "mifflin-st-jeor",
  })

  // 获取AI配置
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

  // 使用 IndexedDB 钩子获取日志数据
  const { getData: getDailyLog, saveData: saveDailyLog, isInitializing: dbInitializing } = useIndexedDB("healthLogs")

  // 使用日期记录检查Hook
  const { hasRecord, refreshRecords } = useDateRecords()

  // 使用 DailyLog 写入 hook
  const { log: dailyLog, isLogLoaded, commit } = useDailyLogWriter({
    date: dateParam,
    userProfile,
    isUserProfileHydrated,
    getDailyLog,
    saveDailyLog,
    dbInitializing,
    refreshRecords,
  })

  // 检查AI配置是否完整
  const checkAIConfig = () => {
    const modelType = uploadedImages.length > 0 ? "visionModel" : "agentModel"
    const modelConfig = aiConfig[modelType]

    if (!modelConfig.name || !modelConfig.baseUrl || !modelConfig.apiKey) {
      toast({
        title: (
          <span className="flex items-center">
            <AlertCircle className="mr-2 h-5 w-5 text-destructive" />
            {"AI 配置不完整"}
          </span>
        ),
        description: `请先在设置页面配置 ${uploadedImages.length > 0 ? "视觉" : "工作"} 模型。`,
        variant: "destructive",
      })
      return false
    }
    return true
  }

  // 处理图片上传
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    if (uploadedImages.length + files.length > 5) {
      toast({
        title: (
          <span className="flex items-center">
            <AlertCircle className="mr-2 h-5 w-5 text-destructive" />
            {"图片数量超限"}
          </span>
        ),
        description: "最多只能上传5张图片。",
        variant: "destructive",
      })
      return
    }

    setIsCompressing(true)

    try {
      const newImages: ImagePreview[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]

        if (!file.type.startsWith("image/")) {
          toast({
            title: (
              <span className="flex items-center">
                <AlertCircle className="mr-2 h-5 w-5 text-destructive" />
                {"文件类型错误"}
              </span>
            ),
            description: `${file.name} 不是图片文件。`,
            variant: "destructive",
          })
          continue
        }

        const previewUrl = URL.createObjectURL(file)
        const compressedFile = await compressImage(file, 500 * 1024) // 500KB

        newImages.push({
          file,
          url: previewUrl,
          compressedFile,
        })
      }

      setUploadedImages((prev) => [...prev, ...newImages])
    } catch (error) {
      console.error("Error processing images:", error)
      toast({
        title: (
          <span className="flex items-center">
            <AlertCircle className="mr-2 h-5 w-5 text-destructive" />
            {"图片处理失败"}
          </span>
        ),
        description: "无法处理上传的图片。",
        variant: "destructive",
      })
    } finally {
      setIsCompressing(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  // 删除已上传的图片
  const handleRemoveImage = (index: number) => {
    setUploadedImages((prev) => {
      const newImages = [...prev]
      URL.revokeObjectURL(newImages[index].url)
      newImages.splice(index, 1)
      return newImages
    })
  }

  // 处理提交（文本+可能的图片）
  const handleSubmit = async () => {
    if (!inputText.trim() && uploadedImages.length === 0) {
      toast({
        title: (
          <span className="flex items-center">
            <AlertCircle className="mr-2 h-5 w-5 text-destructive" />
            {"输入为空"}
          </span>
        ),
        description: "请输入文本或上传图片。",
        variant: "destructive",
      })
      return
    }

    if (!checkAIConfig()) return

    setIsProcessing(true)
    try {
      let result
      const effectiveWeight = dailyLog.weight || userProfile.weight

      if (uploadedImages.length > 0) {
        const formData = new FormData()
        formData.append("text", inputText)
        formData.append("type", activeTab)
        formData.append("userWeight", effectiveWeight.toString())
        formData.append("aiConfig", JSON.stringify(aiConfig))
        uploadedImages.forEach((img, index) => {
          formData.append(`image${index}`, img.compressedFile || img.file)
        })

        const response = await fetch("/api/ai/parse-with-images", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: "解析失败" }))
          throw new Error(errorData.message || "解析失败")
        }
        result = await response.json()
      } else {
        result = await postAI("/api/ai/parse", {
          text: inputText,
          type: activeTab,
          userWeight: effectiveWeight,
        }, { aiConfig })
      }

      if (activeTab === "food" && result.food) {
        commit({ kind: "addEntries", food: result.food })
      } else if (activeTab === "exercise" && result.exercise) {
        commit({ kind: "addEntries", exercise: result.exercise })
      }

      setInputText("")
      setUploadedImages([])

      toast({
        title: (
          <span className="flex items-center">
            <CheckCircle2 className="mr-2 h-5 w-5 text-c-weight" />
            {"记录成功"}
          </span>
        ),
        description: activeTab === "food" ? "已添加食物记录。" : "已添加运动记录。",
      })
    } catch (error: any) {
      console.error("Error:", error)
      toast({
        title: (
          <span className="flex items-center">
            <AlertCircle className="mr-2 h-5 w-5 text-destructive" />
            处理失败
          </span>
        ),
        description: error.message || "无法解析您的输入，请重试。",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // 删除条目
  const handleDeleteEntry = (id: string, type: "food" | "exercise") => {
    commit({ kind: "removeEntry", id, type })

    toast({
      title: (
        <span className="flex items-center">
          <Trash2 className="mr-2 h-5 w-5 text-c-weight" />
          {"删除成功"}
        </span>
      ),
      description: type === "food" ? "已删除食物记录。" : "已删除运动记录。",
    })
  }

  // 更新条目
  const handleUpdateEntry = (updatedEntry: FoodEntry | ExerciseEntry, type: "food" | "exercise") => {
    commit({ kind: "updateEntry", entry: updatedEntry, type })

    toast({
      title: (
        <span className="flex items-center">
          <Edit3 className="mr-2 h-5 w-5 text-c-weight" />
          {"更新成功"}
        </span>
      ),
      description: type === "food" ? "已更新食物记录。" : "已更新运动记录。",
    })
  }

  // 处理每日状态保存
  const handleSaveDailyStatus = (status: DailyStatus) => {
    commit({ kind: "setDailyStatus", status })

    toast({
      title: (
        <span className="flex items-center">
          <CheckCircle2 className="mr-2 h-5 w-5 text-c-weight" />
          每日状态已保存
        </span>
      ),
      description: `已保存 ${dateParam} 的状态记录`,
    })
  }

  // 今日完成度 — 对齐 demo，仅统计三个主记录模块
  const hasDailyStatus = dailyLog.dailyStatus !== undefined && Object.keys(dailyLog.dailyStatus ?? {}).length > 0
  const completionItems = [
    { label: `饮食记录 · ${dailyLog.foodEntries.length} 项`, done: dailyLog.foodEntries.length > 0 },
    { label: `运动记录 · ${dailyLog.exerciseEntries.length} 项`, done: dailyLog.exerciseEntries.length > 0 },
    { label: hasDailyStatus ? "每日状态 · 已保存" : "每日状态 · 待保存", done: hasDailyStatus },
  ]
  const completionScore = completionItems.filter((item) => item.done).length
  const selectedDateLabel = format(selectedDate, "PPP · EEEE", { locale: currentLocale })
  const foodCalories = Math.round(dailyLog.summary.totalCaloriesConsumed || 0)
  const exerciseCalories = Math.round(dailyLog.summary.totalCaloriesBurned || 0)
  const isVisionModelConfigured = Boolean(
    aiConfig.visionModel.name && aiConfig.visionModel.baseUrl && aiConfig.visionModel.apiKey,
  )

  return (
    <div className="min-h-screen overflow-x-clip bg-background">
      <div className="mx-auto w-full max-w-[1240px] px-4 py-6 sm720:px-8 sm720:py-8 lg:px-9">
        <PageHeader
          title="工作台"
          subtitle={
            <span className="inline-flex flex-wrap items-center gap-x-2.5">
              <span>{selectedDateLabel}</span>
              {!isToday && (
                <button
                  type="button"
                  onClick={jumpToToday}
                  className="card-action"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  返回今天
                </button>
              )}
              <span>{`· 今日完成 ${completionScore}/${completionItems.length}`}</span>
            </span>
          }
          actions={
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="rounded-[10px] bg-card font-normal">
                    <CalendarDays className="mr-2 h-4 w-4" />
                    切换日期
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                    locale={currentLocale}
                    hasRecord={hasRecord}
                  />
                </PopoverContent>
              </Popover>
              <Link href={`/?date=${dateParam}`}>
                <Button variant="bare" size="sm" className="rounded-[10px]">
                  <ArrowLeft className="mr-1.5 h-4 w-4" />
                  返回总览
                </Button>
              </Link>
            </>
          }
        />

        {!isVisionModelConfigured && (
          <div className="alert mb-4 border-c-ai/20 bg-c-ai/5 text-sm text-ink-2">
            <Info className="alert-icon h-4 w-4 text-c-ai" />
            <div className="alert-body">视觉模型未配置 · 仅文字解析可用，如需上传图片识别请先配置</div>
            <span className="stamp new">建议新增</span>
            <Link href="/settings" className="alert-action text-c-ai">
              去配置
            </Link>
          </div>
        )}

        <div className="space-y-4">
          {/* 智能记录输入 */}
          <Card className={WORKBENCH_CARD_CLASS}>
            <CardContent className="p-5">
              <div className="card-head mb-4">
                <div className="card-title-row">
                  <Tile variant="ink" size={36}>
                    <Edit3 />
                  </Tile>
                  <div>
                    <div className="card-title">智能记录</div>
                    <div className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      文字 / 图片 · AI 自动识别营养与消耗
                    </div>
                  </div>
                </div>
                <span className="tag">
                  今日完成 <b className="mx-0.5">{completionScore}/{completionItems.length}</b>
                </span>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-3">
                <TabsList className="h-auto rounded-[10px] bg-black/5 p-[3px]">
                  <TabsTrigger
                    value="food"
                    className="rounded-lg px-3 py-1.5 text-xs font-medium data-[state=active]:bg-card data-[state=active]:shadow-none"
                  >
                    <Utensils className="mr-1.5 h-4 w-4" />
                    饮食
                  </TabsTrigger>
                  <TabsTrigger
                    value="exercise"
                    className="rounded-lg px-3 py-1.5 text-xs font-medium data-[state=active]:bg-card data-[state=active]:shadow-none"
                  >
                    <Dumbbell className="mr-1.5 h-4 w-4" />
                    运动
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="space-y-4">
                <Textarea
                  placeholder={
                    activeTab === "food"
                      ? "例如：早餐 一碗小米粥，一个鸡蛋，5个小番茄；午餐 一份鸡胸肉沙拉，半个玉米..."
                      : "例如：下午跑步30分钟5公里，晚上HIIT训练20分钟..."
                  }
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="min-h-[110px] resize-y rounded-xl border-border bg-[var(--surface-subtle)] px-4 py-3 text-sm focus-visible:ring-1 focus-visible:ring-foreground focus-visible:ring-offset-0"
                />

                <div className="flex flex-col gap-3 sm720:flex-row sm720:items-center sm720:justify-between">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={isProcessing || isCompressing || uploadedImages.length >= 5}
                      ref={fileInputRef}
                    />
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <ImageIcon className="h-4 w-4" />
                      {isCompressing ? "图片处理中..." : "附图(最多 5 张)"}
                    </span>
                    <div className="flex gap-1.5">
                      {Array.from({ length: 5 }).map((_, index) => {
                        const image = uploadedImages[index]

                        return image ? (
                          <div
                            key={index}
                            className="relative h-9 w-9"
                          >
                            <img
                              src={image.url || "/placeholder.svg"}
                              alt={`预览 ${index + 1}`}
                              className="h-full w-full rounded-lg border border-line-strong object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(index)}
                              className="absolute -right-1.5 -top-1.5 grid h-[18px] w-[18px] place-items-center rounded-full border border-background bg-foreground text-background shadow-sm transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-1"
                              aria-label={`删除图片 ${index + 1}`}
                            >
                              <X className="h-3 w-3" strokeWidth={2.75} />
                            </button>
                          </div>
                        ) : (
                          <button
                            key={index}
                            type="button"
                            disabled={isProcessing || isCompressing || uploadedImages.length >= 5}
                            onClick={() => fileInputRef.current?.click()}
                            className="grid h-9 w-9 place-items-center rounded-lg border border-dashed border-line-strong text-sm font-medium text-muted-foreground transition-colors hover:border-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                            aria-label="上传图片"
                          >
                            +
                          </button>
                        )
                      })}
                    </div>
                    {uploadedImages.length > 0 && (
                      <Button
                        variant="bare"
                        size="sm"
                        onClick={() => setUploadedImages([])}
                        className="h-8 rounded-lg px-2 text-destructive hover:text-destructive"
                      >
                        清空
                      </Button>
                    )}
                  </div>

                  <Button
                    onClick={handleSubmit}
                    size="sm"
                    variant="ink"
                    disabled={isProcessing || isCompressing || (!inputText.trim() && uploadedImages.length === 0)}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        处理中...
                      </>
                    ) : (
                      <>
                        <Send className="mr-1.5 h-4 w-4" />
                        AI 解析并保存
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)]">
            <div className="flex flex-col gap-4">
              {/* 膳食记录 */}
              <Card className={WORKBENCH_CARD_CLASS}>
                <CardContent className="p-5">
                  <div className="card-head">
                    <div className="card-title-row">
                      <Tile variant="food" size={36}>
                        <Utensils />
                      </Tile>
                      <div className="card-title">
                        膳食记录 · {dailyLog.foodEntries.length} 项 · {foodCalories.toLocaleString()} kcal
                      </div>
                    </div>
                  </div>
                  {dailyLog.foodEntries.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">今日暂无饮食记录</p>
                  ) : (
                    <div>
                      {dailyLog.foodEntries.map((entry) => (
                        <FoodEntryCard
                          key={entry.log_id}
                          entry={entry}
                          onDelete={() => handleDeleteEntry(entry.log_id, "food")}
                          onUpdate={(updated) => handleUpdateEntry(updated, "food")}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 运动记录 */}
              <Card className={WORKBENCH_CARD_CLASS}>
                <CardContent className="p-5">
                  <div className="card-head">
                    <div className="card-title-row">
                      <Tile variant="exercise" size={36}>
                        <Flame />
                      </Tile>
                      <div className="card-title">
                        运动记录 · {dailyLog.exerciseEntries.length} 项 · −{exerciseCalories.toLocaleString()} kcal
                      </div>
                    </div>
                  </div>
                  {dailyLog.exerciseEntries.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">今日暂无运动记录</p>
                  ) : (
                    <div>
                      {dailyLog.exerciseEntries.map((entry) => (
                        <ExerciseEntryCard
                          key={entry.log_id}
                          entry={entry}
                          onDelete={() => handleDeleteEntry(entry.log_id, "exercise")}
                          onUpdate={(updated) => handleUpdateEntry(updated, "exercise")}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 每日状态 */}
              <div className="[&>div]:rounded-2xl [&>div]:border-border [&>div]:shadow-none [&>div]:transition-none [&>div:hover]:shadow-none [&>div>div:first-child]:pb-3">
                <DailyStatusCard
                  date={format(selectedDate, "yyyy-MM-dd")}
                  initialStatus={dailyLog.dailyStatus}
                  onSave={handleSaveDailyStatus}
                />
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {/* 今日完成度 */}
              <Card className={WORKBENCH_CARD_CLASS}>
                <CardContent className="p-5">
                  <div className="card-head mb-2.5">
                    <div className="card-title-row">
                      <div className="card-title">今日完成度</div>
                    </div>
                    <span className="tag">{completionScore}/{completionItems.length}</span>
                  </div>
                  <div>
                    {completionItems.map((item) => (
                      <div
                        key={item.label}
                        className={`flex items-center gap-2.5 border-b border-border py-2 text-sm last:border-b-0 ${
                          item.done ? "text-muted-foreground line-through" : ""
                        }`}
                      >
                        <span
                          className={`grid h-5 w-5 flex-none place-items-center rounded-full text-xs font-bold ${
                            item.done
                              ? "bg-c-weight text-white"
                              : "border border-line-strong text-muted-foreground"
                          }`}
                        >
                          {item.done ? "✓" : "○"}
                        </span>
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function WorkbenchPage() {
  return (
    <Suspense fallback={null}>
      <WorkbenchContent />
    </Suspense>
  )
}
