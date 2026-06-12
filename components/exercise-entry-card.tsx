"use client"

import type React from "react"

import { useState } from "react"
import { Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { EntryRow } from "@/components/ui/entry-row"
import type { ExerciseEntry } from "@/lib/types"
import { MUSCLE_KEY_SET, MUSCLE_LABELS_ZH, type MuscleKey } from "@/lib/muscle-groups"

interface ExerciseEntryCardProps {
  entry: ExerciseEntry
  onDelete?: () => void
  onUpdate?: (updatedEntry: ExerciseEntry) => void
  showActions?: boolean
}

export function ExerciseEntryCard({ entry, onDelete, onUpdate, showActions = true }: ExerciseEntryCardProps) {

  const renderMuscle = (raw: string) =>
    MUSCLE_KEY_SET.has(raw)
      ? MUSCLE_LABELS_ZH[raw as MuscleKey]
      : raw
  const [isEditing, setIsEditing] = useState(false)
  const [editedEntry, setEditedEntry] = useState<ExerciseEntry>({ ...entry })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target

    if (name === "exercise_name") {
      setEditedEntry({ ...editedEntry, exercise_name: value })
    } else if (name === "duration_minutes") {
      const minutes = Number.parseFloat(value) || 0

      // 重新计算卡路里消耗
      // 公式: METs值 × 用户体重(kg) × 运动持续时间(小时)
      const hours = minutes / 60
      const caloriesBurned = (editedEntry.estimated_mets || 3) * (editedEntry.user_weight || 70) * hours

      setEditedEntry({
        ...editedEntry,
        duration_minutes: minutes,
        calories_burned_estimated: caloriesBurned,
      })
    } else if (name === "distance_km" && value) {
      setEditedEntry({ ...editedEntry, distance_km: Number.parseFloat(value) || undefined })
    } else if (name === "sets" && value) {
      setEditedEntry({ ...editedEntry, sets: Number.parseInt(value) || undefined })
    } else if (name === "reps" && value) {
      setEditedEntry({ ...editedEntry, reps: Number.parseInt(value) || undefined })
    } else if (name === "weight_kg" && value) {
      setEditedEntry({ ...editedEntry, weight_kg: Number.parseFloat(value) || undefined })
    }
  }

  const handleSave = () => {
    onUpdate?.(editedEntry)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedEntry({ ...entry })
    setIsEditing(false)
  }

  const kcal = Math.round(entry.calories_burned_estimated || 0)
  const metaParts: string[] = []
  if (entry.duration_minutes) metaParts.push(`${entry.duration_minutes} 分钟`)
  if (entry.sets && entry.reps) metaParts.push(`${entry.sets} 组 × ${entry.reps} 次`)
  else if (entry.sets) metaParts.push(`${entry.sets} 组`)
  if (entry.distance_km) metaParts.push(`${entry.distance_km} km`)
  if (entry.weight_kg) metaParts.push(`${entry.weight_kg} kg`)

  if (isEditing) {
    return (
      <div className="space-y-3 border-b border-border py-3 last:border-b-0">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="exercise_name">{"运动名称"}</Label>
            <Input
              id="exercise_name"
              name="exercise_name"
              value={editedEntry.exercise_name}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <Label htmlFor="duration_minutes">{"时长 (分钟)"}</Label>
            <Input
              id="duration_minutes"
              name="duration_minutes"
              type="number"
              value={editedEntry.duration_minutes}
              onChange={handleInputChange}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {entry.exercise_type === "cardio" && (
            <div>
              <Label htmlFor="distance_km">距离 ({"公里"})</Label>
              <Input
                id="distance_km"
                name="distance_km"
                type="number"
                value={editedEntry.distance_km || ""}
                onChange={handleInputChange}
              />
            </div>
          )}

          {entry.exercise_type === "strength" && (
            <>
              <div>
                <Label htmlFor="sets">组数 ({"组"})</Label>
                <Input
                  id="sets"
                  name="sets"
                  type="number"
                  value={editedEntry.sets || ""}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="reps">次数 ({"次"})</Label>
                <Input
                  id="reps"
                  name="reps"
                  type="number"
                  value={editedEntry.reps || ""}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="weight_kg">重量 ({"kg"})</Label>
                <Input
                  id="weight_kg"
                  name="weight_kg"
                  type="number"
                  value={editedEntry.weight_kg || ""}
                  onChange={handleInputChange}
                />
              </div>
            </>
          )}
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

  const metaLines: React.ReactNode[] = []
  if (metaParts.length > 0) metaLines.push(metaParts.join(" · "))
  if (entry.muscle_groups && entry.muscle_groups.length > 0) {
    metaLines.push(`锻炼部位: ${entry.muscle_groups.map(renderMuscle).join(", ")}`)
  }

  return (
    <EntryRow
      swatchToken="exercise"
      title={entry.exercise_name}
      isEstimated={entry.is_estimated}
      metaLines={metaLines}
      value={`−${kcal} kcal`}
      valueVariant="burn"
      showActions={showActions}
      onEdit={() => setIsEditing(true)}
      onDelete={onDelete}
    />
  )
}
