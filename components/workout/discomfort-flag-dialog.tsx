"use client"

import { AlertTriangle } from "lucide-react"
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

interface DiscomfortFlagDialogProps {
  displayName: string
  isMarked: boolean
  onConfirm: () => void
}

export function DiscomfortFlagDialog({
  displayName,
  isMarked,
  onConfirm,
}: DiscomfortFlagDialogProps) {
  if (isMarked) {
    return (
      <Button
        variant="secondary"
        size="sm"
        className="text-xs"
        onClick={onConfirm}
      >
        <AlertTriangle className="mr-1.5 h-4 w-4" />
        取消不适
      </Button>
    )
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="bare" size="sm" className="text-xs">
          <AlertTriangle className="mr-1.5 h-4 w-4" />
          感觉不对
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>标记动作不适</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              你确定要标记 <strong>{displayName}</strong> 为不适动作吗？
            </p>
            <p className="text-sm">
              标记后，此动作会在<strong>下次训练计划</strong>中被替换为同肌群、同力学模式的其他动作，并加入黑名单避免再次出现。
            </p>
            <p className="text-sm text-muted-foreground">
              如果只是暂时不想做这个动作，请使用"跳过"功能。
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>确认标记</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
