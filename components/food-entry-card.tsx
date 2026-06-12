"use client"

import type React from "react"

import { useState } from "react"
import { Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EntryRow } from "@/components/ui/entry-row"
import type { FoodEntry } from "@/lib/types"

interface FoodEntryCardProps {
  entry: FoodEntry
  onDelete?: () => void
  onUpdate?: (updatedEntry: FoodEntry) => void
  showActions?: boolean
}

const TIME_PERIOD_LABELS: Record<string, string> = {
  morning: "上午",
  noon: "中午",
  afternoon: "下午",
  evening: "夜宵",
}

const MEAL_CHIP: Record<string, { label: string; cls: string }> = {
  breakfast: { label: "早", cls: "breakfast" },
  lunch:     { label: "午", cls: "lunch" },
  dinner:    { label: "晚", cls: "dinner" },
  snack:     { label: "加", cls: "snack" },
}

export function FoodEntryCard({ entry, onDelete, onUpdate, showActions = true }: FoodEntryCardProps) {
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
    onUpdate?.(editedEntry)
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

  const t = entry.total_nutritional_info_consumed || {}
  const kcal = Math.round((t.calories as number) || 0)
  const carbs = Math.round((t.carbohydrates as number) || 0)
  const protein = Math.round((t.protein as number) || 0)
  const fat = Math.round((t.fat as number) || 0)
  const chip = MEAL_CHIP[entry.meal_type]

  if (isEditing) {
    return (
      <div className="space-y-3 border-b border-border py-3 last:border-b-0">
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

        <div className="flex justify-end space-x-2">
          <Button size="sm" variant="outline" onClick={handleCancel}>
            <X className="h-4 w-4 mr-1" /> {"取消"}
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Check className="h-4 w-4 mr-1" /> {"保存"}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <EntryRow
      swatchToken="food"
      leading={chip && <span className={`meal-chip ${chip.cls}`}>{chip.label}</span>}
      title={entry.food_name}
      isEstimated={entry.is_estimated}
      tags={
        <div className="entry-tags">
          <span className="micro">碳水 {carbs}g</span>
          <span className="micro">蛋白 {protein}g</span>
          <span className="micro">脂肪 {fat}g</span>
          <span className="micro">{entry.consumed_grams}g</span>
          {entry.time_period && <span className="micro">{getTimePeriodLabel(entry.time_period)}</span>}
        </div>
      }
      value={`${kcal} kcal`}
      showActions={showActions}
      onEdit={() => setIsEditing(true)}
      onDelete={onDelete}
    />
  )
}
