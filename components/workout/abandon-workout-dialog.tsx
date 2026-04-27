"use client"

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
import { useTranslation } from "@/hooks/use-i18n"

interface AbandonWorkoutDialogProps {
  disabled: boolean
  onConfirm: () => void
}

export function AbandonWorkoutDialog({
  disabled,
  onConfirm,
}: AbandonWorkoutDialogProps) {
  const t = useTranslation("workout")

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" disabled={disabled}>
          {t("abandon.open")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("abandon.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("abandon.description")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("abandon.cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            {t("abandon.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
