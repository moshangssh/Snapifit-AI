"use client"

import { useEffect, useState } from "react"
import { Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useTranslation } from "@/hooks/use-i18n"

interface ReplaceExerciseDialogProps {
  displayName: string
  onReplace: (name: string) => void
}

export function ReplaceExerciseDialog({
  displayName,
  onReplace,
}: ReplaceExerciseDialogProps) {
  const t = useTranslation("workout")
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(displayName)

  useEffect(() => {
    if (open) setDraft(displayName)
  }, [displayName, open])

  const submit = () => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== displayName) {
      onReplace(trimmed)
    }
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="mr-2 h-4 w-4" />
          {t("exercise.replace")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("exercise.replaceTitle")}</DialogTitle>
          <DialogDescription>
            {t("exercise.replaceDescription", { name: displayName })}
          </DialogDescription>
        </DialogHeader>
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submit()
          }}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("exercise.replaceCancel")}
          </Button>
          <Button onClick={submit}>{t("exercise.replaceConfirm")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
