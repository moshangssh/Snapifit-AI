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

interface ReplaceExerciseDialogProps {
  displayName: string
  onReplace: (name: string) => void
}

export function ReplaceExerciseDialog({
  displayName,
  onReplace,
}: ReplaceExerciseDialogProps) {
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
          {"替换动作"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{"替换训练动作"}</DialogTitle>
          <DialogDescription>
            {`当前计划动作是 ${displayName}。替换后会在完成训练时重新补全肌群和热量分析。`}
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
            {"取消"}
          </Button>
          <Button onClick={submit}>{"确认替换"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
