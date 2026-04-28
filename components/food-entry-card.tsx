"use client"

import type React from "react"

import { useState } from "react"
import { Edit2, Trash2, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { FoodEntry } from "@/lib/types"

interface FoodEntryCardProps {
  entry: FoodEntry
  onDelete: () => void
  onUpdate: (updatedEntry: FoodEntry) => void
}

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: "早餐",
  lunch: "午餐",
  dinner: "晚餐",
  snack: "加餐",
}

const TIME_PERIOD_LABELS: Record<string, string> = {
  morning: "上午",
  noon: "中午",
  afternoon: "下午",
  evening: "夜宵",
}

export function FoodEntryCard({ entry, onDelete, onUpdate }: FoodEntryCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedEntry, setEditedEntry] = useState<FoodEntry>({ ...entry })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target

    if (name === "food_name") {
      setEditedEntry({ ...editedEntry, food_name: value })
    } else if (name === "consumed_grams") {
      const grams = Number.parseFloat(value) || 0

      // 重新计算总营养成分
      const updatedEntry = { ...editedEntry, consumed_grams: grams }

      if (editedEntry.nutritional_info_per_100g) {
        const ratio = grams / 100
        updatedEntry.total_nutritional_info_consumed = Object.entries(editedEntry.nutritional_info_per_100g).reduce(
          (acc, [key, value]) => {
            if (typeof value === "number") {
              acc[key] = value * ratio
            }
            return acc
          },
          {} as Record<string, number>,
        )
      }

      setEditedEntry(updatedEntry)
    }
  }

  const handleMealTypeChange = (value: string) => {
    setEditedEntry({ ...editedEntry, meal_type: value })
  }

  const handleTimePeriodChange = (value: string) => {
    setEditedEntry({ ...editedEntry, time_period: value })
  }

  const handleSave = () => {
    onUpdate(editedEntry)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedEntry({ ...entry })
    setIsEditing(false)
  }

  const getTimePeriodLabel = (period?: string) => {
    if (!period) return ""
    return TIME_PERIOD_LABELS[period] || period
  }

  const getMealTypeLabel = (type: string) => {
    return MEAL_TYPE_LABELS[type] || type
  }

  return (
    <div className={cn(
      "bg-card rounded-xl border transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-emerald-100/50 dark:hover:shadow-emerald-900/30",
      entry.is_estimated && "border-amber-300 dark:border-amber-600 bg-amber-50/50 dark:bg-amber-900/10"
    )}>
      <div className="p-6">
        {isEditing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="food_name">{"食物名称"}</Label>
                <Input id="food_name" name="food_name" value={editedEntry.food_name} onChange={handleInputChange} />
              </div>
              <div>
                <Label htmlFor="consumed_grams">{"份量 (克)"}</Label>
                <Input
                  id="consumed_grams"
                  name="consumed_grams"
                  type="number"
                  value={editedEntry.consumed_grams}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="meal_type">{"餐次"}</Label>
                <Select value={editedEntry.meal_type} onValueChange={handleMealTypeChange}>
                  <SelectTrigger id="meal_type">
                    <SelectValue placeholder={"选择餐次"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="breakfast">{"早餐"}</SelectItem>
                    <SelectItem value="lunch">{"午餐"}</SelectItem>
                    <SelectItem value="dinner">{"晚餐"}</SelectItem>
                    <SelectItem value="snack">{"加餐"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="time_period">{"时间段"}</Label>
                <Select value={editedEntry.time_period || ""} onValueChange={handleTimePeriodChange}>
                  <SelectTrigger id="time_period">
                    <SelectValue placeholder={"选择时间段"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">{"上午"}</SelectItem>
                    <SelectItem value="noon">{"中午"}</SelectItem>
                    <SelectItem value="afternoon">{"下午"}</SelectItem>
                    <SelectItem value="evening">{"夜宵"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-2">
              <Button size="sm" variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-1" /> {"取消"}
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Check className="h-4 w-4 mr-1" /> {"保存"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center">
                <h4 className="font-medium">{entry.food_name}</h4>
                {entry.is_estimated && (
                  <span className="ml-2 text-xs bg-amber-100 text-amber-800 px-1 rounded">{"估算"}</span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {entry.consumed_grams}{"克"} · {getMealTypeLabel(entry.meal_type)}
                {entry.time_period && ` · ${getTimePeriodLabel(entry.time_period)}`}
              </p>
              <p className="text-sm font-medium mt-1">
                {entry.total_nutritional_info_consumed?.calories?.toFixed(0) || 0} {"卡路里"}
              </p>
              <p className="text-xs text-muted-foreground">
                {"碳水"}: {entry.total_nutritional_info_consumed?.carbohydrates?.toFixed(1) || 0}g · {"蛋白质"}:{" "}
                {entry.total_nutritional_info_consumed?.protein?.toFixed(1) || 0}g · {"脂肪"}:{" "}
                {entry.total_nutritional_info_consumed?.fat?.toFixed(1) || 0}g
              </p>
            </div>
            <div className="flex space-x-1">
              <Button size="icon" variant="ghost" onClick={() => setIsEditing(true)} className="h-8 w-8">
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={onDelete} className="h-8 w-8 text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
