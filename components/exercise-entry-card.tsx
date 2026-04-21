"use client"

import type React from "react"

import { useState } from "react"
import { Edit2, Trash2, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { ExerciseEntry } from "@/lib/types"
import { useTranslation } from "@/hooks/use-i18n"
import { MUSCLE_KEY_SET, type MuscleKey } from "@/lib/muscle-groups"

interface ExerciseEntryCardProps {
  entry: ExerciseEntry
  onDelete: () => void
  onUpdate: (updatedEntry: ExerciseEntry) => void
}

export function ExerciseEntryCard({ entry, onDelete, onUpdate }: ExerciseEntryCardProps) {
  const t = useTranslation('dashboard.exerciseCard')
  const tFatigue = useTranslation('dashboard.muscleFatigue')

  const renderMuscle = (raw: string) =>
    MUSCLE_KEY_SET.has(raw)
      ? tFatigue(`muscleLabels.${raw as MuscleKey}`)
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
    onUpdate(editedEntry)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedEntry({ ...entry })
    setIsEditing(false)
  }

  return (
    <div className={cn(
      "bg-card rounded-xl border transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-blue-100/50 dark:hover:shadow-blue-900/30",
      entry.is_estimated && "border-amber-300 dark:border-amber-600 bg-amber-50/50 dark:bg-amber-900/10"
    )}>
      <div className="p-6">
        {isEditing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="exercise_name">{t('exerciseName')}</Label>
                <Input
                  id="exercise_name"
                  name="exercise_name"
                  value={editedEntry.exercise_name}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="duration_minutes">{t('duration')}</Label>
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
                  <Label htmlFor="distance_km">距离 ({t('distance')})</Label>
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
                    <Label htmlFor="sets">组数 ({t('sets')})</Label>
                    <Input
                      id="sets"
                      name="sets"
                      type="number"
                      value={editedEntry.sets || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <Label htmlFor="reps">次数 ({t('reps')})</Label>
                    <Input
                      id="reps"
                      name="reps"
                      type="number"
                      value={editedEntry.reps || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <Label htmlFor="weight_kg">重量 ({t('weight')})</Label>
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

            <div className="flex justify-end space-x-2 mt-2">
              <Button size="sm" variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-1" /> {t('cancel')}
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Check className="h-4 w-4 mr-1" /> {t('save')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center">
                <h4 className="font-medium">{entry.exercise_name}</h4>
                {entry.is_estimated && (
                  <span className="ml-2 text-xs bg-amber-100 text-amber-800 px-1 rounded">{t('estimated')}</span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {entry.duration_minutes} {t('minutes')}
                {entry.distance_km && ` · ${entry.distance_km} ${t('distance')}`}
                {entry.sets && entry.reps && ` · ${entry.sets}${t('sets')} × ${entry.reps}${t('reps')}`}
                {entry.weight_kg && ` · ${entry.weight_kg}${t('weight')}`}
              </p>
              <p className="text-sm font-medium mt-1">{entry.calories_burned_estimated?.toFixed(0) || 0} {t('calories')}</p>
              {entry.muscle_groups && entry.muscle_groups.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {t('muscleGroups')}: {entry.muscle_groups.map(renderMuscle).join(", ")}
                </p>
              )}
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
