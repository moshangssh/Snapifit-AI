"use client"

import { CircleX } from "lucide-react"
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
import { Button } from "@/components/ui/button"

interface AbandonWorkoutDialogProps {
  disabled: boolean
  onConfirm: () => void
}

export function AbandonWorkoutDialog({
  disabled,
  onConfirm,
}: AbandonWorkoutDialogProps) {

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <CircleX className="mr-1.5 h-4 w-4" />
          {"放弃训练"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{"放弃当前训练计划？"}</AlertDialogTitle>
          <AlertDialogDescription>
            {"放弃后不会写入运动记录，你可以重新生成一份训练计划。"}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{"继续训练"}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            {"确认放弃"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
