"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { DailyStatus } from "@/lib/types"
import { Heart, Brain, Activity, Moon, Plus, Edit3, Check } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"

interface DailyStatusCardProps {
  date: string
  initialStatus?: DailyStatus
  onSave: (status: DailyStatus) => void
}

const LEVEL_TEXT: Record<number, string> = {
  1: "很差",
  2: "较差",
  3: "一般",
  4: "良好",
  5: "很好",
  6: "极佳",
}

const STATUS_PLACEHOLDERS: Record<string, string> = {
  stress: "描述今日的压力来源或感受...",
  mood: "分享今日的心情状态...",
  health: "记录身体感受或症状...",
  sleepQuality: "记录睡眠质量或相关情况...",
}

export function DailyStatusCard({ date, initialStatus, onSave }: DailyStatusCardProps) {
  const isMobile = useIsMobile()

  const [status, setStatus] = useState<DailyStatus>({
    stress: 3,
    mood: 3,
    health: 3,
    sleepQuality: 3,
    bedTime: "",
    wakeTime: "",
    stressNotes: "",
    moodNotes: "",
    healthNotes: "",
    sleepNotes: "",
    ...initialStatus
  })

  const [editingField, setEditingField] = useState<string | null>(null)
  const [hasData, setHasData] = useState(false)

  useEffect(() => {
    if (initialStatus) {
      setStatus({ ...status, ...initialStatus })
      setHasData(true)
    }
  }, [initialStatus])

  useEffect(() => {
    const hasAnyData = Object.values(status).some(value =>
      (typeof value === 'number' && value !== 3) ||
      (typeof value === 'string' && value !== "")
    )
    setHasData(hasAnyData)
  }, [status])

  const handleQuickRate = (field: keyof DailyStatus, value: number) => {
    const newStatus = { ...status, [field]: value }
    setStatus(newStatus)
    onSave(newStatus)
  }

  const handleInputChange = (field: keyof DailyStatus, value: string) => {
    setStatus(prev => ({ ...prev, [field]: value }))
  }

  const handleSaveField = (field: string) => {
    onSave(status)
    setEditingField(null)
  }

  const getLevelColor = (level: number) => {
    if (level <= 2) return "destructive"
    if (level <= 3) return "secondary"
    if (level <= 4) return "default"
    return "default"
  }

  const getLevelBgColor = (level: number) => {
    if (level <= 2) return "bg-red-50 border-red-200"
    if (level <= 3) return "bg-yellow-50 border-yellow-200"
    if (level <= 4) return "bg-blue-50 border-blue-200"
    return "bg-green-50 border-green-200"
  }

  const getLevelText = (level: number) => {
    return LEVEL_TEXT[level] || `${level}`
  }

  // 获取颜色类名 - 压力水平使用反向逻辑
  const getColorClass = (itemKey: string, value: number) => {
    if (itemKey === 'stress') {
      // 压力水平：越高越红，越低越绿
      if (value <= 2) return 'bg-green-400 shadow-sm'
      if (value <= 3) return 'bg-blue-400 shadow-sm'
      if (value <= 4) return 'bg-amber-400 shadow-sm'
      return 'bg-red-400 shadow-sm'
    } else {
      // 其他指标（心情、健康、睡眠质量）：越高越绿，越低越红
      if (value <= 2) return 'bg-red-400 shadow-sm'
      if (value <= 3) return 'bg-amber-400 shadow-sm'
      if (value <= 4) return 'bg-blue-400 shadow-sm'
      return 'bg-green-400 shadow-sm'
    }
  }

  const statusItems = [
    { key: 'stress', icon: Brain, label: "压力水平", value: status.stress, notes: status.stressNotes },
    { key: 'mood', icon: Heart, label: "心情状态", value: status.mood, notes: status.moodNotes },
    { key: 'health', icon: Activity, label: "健康状况", value: status.health, notes: status.healthNotes },
    { key: 'sleepQuality', icon: Moon, label: "睡眠质量", value: status.sleepQuality || 3, notes: status.sleepNotes },
  ]

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5" />
          {"每日状态"}
        </CardTitle>
      </CardHeader>

      <CardContent className={`space-y-${isMobile ? '3' : '2'}`}>
        {/* 第一行：压力、心情、健康 */}
        <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-3 gap-2'}`}>
          {statusItems.slice(0, 3).map((item) => {
            const Icon = item.icon
            const isEditing = editingField === item.key

            return (
              <div key={item.key} className="relative">
                <div className={`${isMobile ? 'p-3' : 'p-1.5'} rounded-md border bg-card hover:bg-accent/20 transition-colors group`}>
                  {/* 标题和评分 */}
                  <div className={`flex items-center justify-between ${isMobile ? 'mb-3' : 'mb-1.5'}`}>
                    <div className={`flex items-center ${isMobile ? 'gap-2' : 'gap-1'}`}>
                      <Icon className={`${isMobile ? 'h-4 w-4' : 'h-3 w-3'} text-muted-foreground/80`} />
                      <span className={`${isMobile ? 'text-sm' : 'text-xs'} font-medium text-foreground/90`}>{item.label}</span>
                    </div>
                    <span className={`${isMobile ? 'text-sm' : 'text-xs'} text-muted-foreground/70 font-mono`}>
                      {item.value}/6
                    </span>
                  </div>

                  {/* 评分按钮 - 精致的线条 */}
                  <div className={`grid grid-cols-6 ${isMobile ? 'gap-2 mb-4' : 'gap-1 mb-2'}`}>
                    {[1, 2, 3, 4, 5, 6].map((level) => (
                      <button
                        key={level}
                        onClick={() => handleQuickRate(item.key as keyof DailyStatus, level)}
                        className={`${isMobile ? 'h-3' : 'h-1.5'} rounded-full transition-all duration-200 ${
                          item.value >= level
                            ? getColorClass(item.key, item.value)
                            : 'bg-muted/60 hover:bg-muted-foreground/30'
                        } ${isMobile ? 'active:scale-95' : ''}`}
                      />
                    ))}
                  </div>

                  {/* 备注预览 */}
                  {item.notes && !isEditing && (
                    <div className={`${isMobile ? 'text-sm mb-2 px-2' : 'text-xs mb-1 px-1'} text-muted-foreground/80 line-clamp-1`}>
                      {item.notes}
                    </div>
                  )}

                  {/* 备注按钮 - 更精致的加号 */}
                  <div className="flex justify-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingField(item.key)}
                      className={`${isMobile ? 'h-8 w-8' : 'h-4 w-4'} p-0 text-muted-foreground/40 hover:text-muted-foreground/70 hover:bg-muted/30 rounded-full transition-all ${isMobile ? 'active:scale-95' : ''}`}
                    >
                      {item.notes ? <Edit3 className={`${isMobile ? 'h-4 w-4' : 'h-2 w-2'}`} /> : <Plus className={`${isMobile ? 'h-4 w-4' : 'h-2 w-2'}`} />}
                    </Button>
                  </div>
                </div>

                {/* 备注编辑浮层 - 更大的编辑空间 */}
                {isEditing && (
                  <div className={`absolute ${isMobile ? 'inset-x-0 top-0 left-0 right-0' : 'inset-0'} ${isMobile ? 'p-4' : 'p-3'} bg-background border rounded-md shadow-xl z-20 ${isMobile ? 'min-h-[250px]' : 'min-h-[200px]'}`}>
                    <div className={`space-y-${isMobile ? '4' : '3'} h-full flex flex-col`}>
                      <div className="flex items-center justify-between">
                        <span className={`${isMobile ? 'text-base' : 'text-sm'} font-medium`}>{item.label}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingField(null)}
                          className={`${isMobile ? 'h-8 w-8' : 'h-6 w-6'} p-0 text-muted-foreground hover:text-foreground`}
                        >
                          ×
                        </Button>
                      </div>
                      <Textarea
                        placeholder={STATUS_PLACEHOLDERS[item.key] || "记录今日状态..."}
                        value={item.notes}
                        onChange={(e) => handleInputChange(`${item.key}Notes` as keyof DailyStatus, e.target.value)}
                        className={`flex-1 ${isMobile ? 'min-h-[120px] text-base' : 'min-h-[80px] text-sm'} resize-none`}
                        autoFocus
                      />
                      <div className={`flex ${isMobile ? 'gap-3' : 'gap-2'}`}>
                        <Button
                          size={isMobile ? "default" : "sm"}
                          onClick={() => handleSaveField(item.key)}
                          className={`flex-1 ${isMobile ? 'h-10 text-base' : 'h-8 text-sm'}`}
                        >
                          保存
                        </Button>
                        <Button
                          variant="outline"
                          size={isMobile ? "default" : "sm"}
                          onClick={() => setEditingField(null)}
                          className={`flex-1 ${isMobile ? 'h-10 text-base' : 'h-8 text-sm'}`}
                        >
                          取消
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* 第二行：睡眠质量、睡眠时间 */}
        <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-2 gap-2'}`}>
          {/* 睡眠质量 */}
          {(() => {
            const item = statusItems[3] // sleepQuality
            const Icon = item.icon
            const isEditing = editingField === item.key

            return (
              <div key={item.key} className="relative">
                <div className={`${isMobile ? 'p-3' : 'p-1.5'} rounded-md border bg-card hover:bg-accent/20 transition-colors group`}>
                  {/* 标题和评分 */}
                  <div className={`flex items-center justify-between ${isMobile ? 'mb-3' : 'mb-1.5'}`}>
                    <div className={`flex items-center ${isMobile ? 'gap-2' : 'gap-1'}`}>
                      <Icon className={`${isMobile ? 'h-4 w-4' : 'h-3 w-3'} text-muted-foreground/80`} />
                      <span className={`${isMobile ? 'text-sm' : 'text-xs'} font-medium text-foreground/90`}>{item.label}</span>
                    </div>
                    <span className={`${isMobile ? 'text-sm' : 'text-xs'} text-muted-foreground/70 font-mono`}>
                      {item.value}/6
                    </span>
                  </div>

                  {/* 评分按钮 - 精致的线条 */}
                  <div className={`grid grid-cols-6 ${isMobile ? 'gap-2 mb-4' : 'gap-1 mb-2'}`}>
                    {[1, 2, 3, 4, 5, 6].map((level) => (
                      <button
                        key={level}
                        onClick={() => handleQuickRate(item.key as keyof DailyStatus, level)}
                        className={`${isMobile ? 'h-3' : 'h-1.5'} rounded-full transition-all duration-200 ${
                          item.value >= level
                            ? getColorClass(item.key, item.value)
                            : 'bg-muted/60 hover:bg-muted-foreground/30'
                        } ${isMobile ? 'active:scale-95' : ''}`}
                      />
                    ))}
                  </div>

                  {/* 备注预览 */}
                  {item.notes && !isEditing && (
                    <div className={`${isMobile ? 'text-sm mb-2 px-2' : 'text-xs mb-1 px-1'} text-muted-foreground/80 line-clamp-1`}>
                      {item.notes}
                    </div>
                  )}

                  {/* 备注按钮 - 更精致的加号 */}
                  <div className="flex justify-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingField(item.key)}
                      className={`${isMobile ? 'h-8 w-8' : 'h-4 w-4'} p-0 text-muted-foreground/40 hover:text-muted-foreground/70 hover:bg-muted/30 rounded-full transition-all ${isMobile ? 'active:scale-95' : ''}`}
                    >
                      {item.notes ? <Edit3 className={`${isMobile ? 'h-4 w-4' : 'h-2 w-2'}`} /> : <Plus className={`${isMobile ? 'h-4 w-4' : 'h-2 w-2'}`} />}
                    </Button>
                  </div>
                </div>

                {isEditing && (
                  <div className={`absolute ${isMobile ? 'inset-x-0 top-0 left-0 right-0' : 'inset-0'} ${isMobile ? 'p-4' : 'p-3'} bg-background border rounded-md shadow-xl z-20 ${isMobile ? 'min-h-[250px]' : 'min-h-[200px]'}`}>
                    <div className={`space-y-${isMobile ? '4' : '3'} h-full flex flex-col`}>
                      <div className="flex items-center justify-between">
                        <span className={`${isMobile ? 'text-base' : 'text-sm'} font-medium`}>{item.label}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingField(null)}
                          className={`${isMobile ? 'h-8 w-8' : 'h-6 w-6'} p-0 text-muted-foreground hover:text-foreground`}
                        >
                          ×
                        </Button>
                      </div>
                      <Textarea
                        placeholder={"记录睡眠质量或相关情况..."}
                        value={item.notes}
                        onChange={(e) => handleInputChange('sleepNotes', e.target.value)}
                        className={`flex-1 ${isMobile ? 'min-h-[120px] text-base' : 'min-h-[80px] text-sm'} resize-none`}
                        autoFocus
                      />
                      <div className={`flex ${isMobile ? 'gap-3' : 'gap-2'}`}>
                        <Button
                          size={isMobile ? "default" : "sm"}
                          onClick={() => handleSaveField(item.key)}
                          className={`flex-1 ${isMobile ? 'h-10 text-base' : 'h-8 text-sm'}`}
                        >
                          保存
                        </Button>
                        <Button
                          variant="outline"
                          size={isMobile ? "default" : "sm"}
                          onClick={() => setEditingField(null)}
                          className={`flex-1 ${isMobile ? 'h-10 text-base' : 'h-8 text-sm'}`}
                        >
                          取消
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

          {/* 睡眠时间 */}
          <div className={`${isMobile ? 'p-3' : 'p-1.5'} rounded-md border bg-card hover:bg-accent/20 transition-colors`}>
            {/* 标题 */}
            <div className={`flex items-center justify-between ${isMobile ? 'mb-3' : 'mb-1.5'}`}>
              <div className={`flex items-center ${isMobile ? 'gap-2' : 'gap-1'}`}>
                <Moon className={`${isMobile ? 'h-4 w-4' : 'h-3 w-3'} text-muted-foreground/80`} />
                <span className={`${isMobile ? 'text-sm' : 'text-xs'} font-medium text-foreground/90`}>{"睡眠时间"}</span>
              </div>
              {(status.bedTime && status.wakeTime) && (
                <span className={`${isMobile ? 'text-sm' : 'text-xs'} text-muted-foreground/70 font-mono`}>
                  {(() => {
                    const bedTime = new Date(`2000-01-01 ${status.bedTime}`)
                    const wakeTime = new Date(`2000-01-0${status.bedTime > status.wakeTime ? '2' : '1'} ${status.wakeTime}`)
                    const diff = (wakeTime.getTime() - bedTime.getTime()) / (1000 * 60 * 60)
                    return `${diff.toFixed(1)}h`
                  })()}
                </span>
              )}
            </div>

            {/* 时间输入 - 移动端垂直布局 */}
            <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-2 gap-2'}`}>
              <div className={`flex items-center ${isMobile ? 'gap-3' : 'gap-1.5'}`}>
                <Label className={`${isMobile ? 'text-sm w-16' : 'text-xs'} text-muted-foreground/80 whitespace-nowrap`}>{"睡眠时间"}</Label>
                <Input
                  type="time"
                  value={status.bedTime}
                  onChange={(e) => {
                    handleInputChange('bedTime', e.target.value)
                    onSave({ ...status, bedTime: e.target.value })
                  }}
                  className={`${isMobile ? 'h-10 text-base' : 'h-6 text-xs'} border-muted/50 focus:border-primary/50 flex-1`}
                />
              </div>
              <div className={`flex items-center ${isMobile ? 'gap-3' : 'gap-1.5'}`}>
                <Label className={`${isMobile ? 'text-sm w-16' : 'text-xs'} text-muted-foreground/80 whitespace-nowrap`}>{"起床时间"}</Label>
                <Input
                  type="time"
                  value={status.wakeTime}
                  onChange={(e) => {
                    handleInputChange('wakeTime', e.target.value)
                    onSave({ ...status, wakeTime: e.target.value })
                  }}
                  className={`${isMobile ? 'h-10 text-base' : 'h-6 text-xs'} border-muted/50 focus:border-primary/50 flex-1`}
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
