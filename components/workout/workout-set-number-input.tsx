"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"

interface WorkoutSetNumberInputProps {
  value?: number
  disabled: boolean
  integerOnly?: boolean
  step: number
  min: number
  onCommit: (value: number) => void
}

export function WorkoutSetNumberInput({
  value,
  disabled,
  integerOnly = false,
  step,
  min,
  onCommit,
}: WorkoutSetNumberInputProps) {
  const [draft, setDraft] = useState(value?.toString() ?? "")

  useEffect(() => {
    setDraft(value?.toString() ?? "")
  }, [value])

  const commit = () => {
    const parsed = Number(draft)
    const isInvalid =
      draft.trim() === "" ||
      Number.isNaN(parsed) ||
      parsed < min ||
      (integerOnly && !Number.isInteger(parsed))

    if (isInvalid) {
      setDraft(value?.toString() ?? "")
      return
    }

    onCommit(parsed)
  }

  return (
    <Input
      type="number"
      value={draft}
      disabled={disabled}
      min={min}
      step={step}
      onBlur={commit}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur()
        }
        if (event.key === "Escape") {
          setDraft(value?.toString() ?? "")
          event.currentTarget.blur()
        }
      }}
    />
  )
}
