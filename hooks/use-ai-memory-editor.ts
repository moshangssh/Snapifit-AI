"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { AIMemoryUpdateRequest } from "@/lib/types"

const AUTO_SAVE_DELAY_MS = 3000
const MEMORY_MAX_LENGTH = 500

export interface AIMemoryEditor {
  /** 当前草稿内容(编辑中,可能尚未持久化)。 */
  draft: string
  /** 更新草稿并安排 3 秒防抖自动保存;超过 500 字的输入被忽略。 */
  setDraft: (content: string) => void
  /** 立即保存草稿,取消挂起的自动保存。 */
  save: () => Promise<void>
  isSaving: boolean
  hasUnsavedChanges: boolean
}

/**
 * 单个专家的 AI 记忆编辑器:草稿状态、3 秒防抖自动保存、保存状态与
 * 卸载清理全部内藏,页面只剩绑定。持久化内容变化(保存完成、外部清空)
 * 时草稿会同步回持久化值。toast 等 UI 反馈经回调注入。
 */
export function useAIMemoryEditor(input: {
  expertId: string
  /** 该专家当前已持久化的记忆内容("" 表示无记忆)。 */
  persistedContent: string
  updateMemory: (request: AIMemoryUpdateRequest) => Promise<void>
  onSaveSuccess?: () => void
  onSaveError?: (error: unknown) => void
}): AIMemoryEditor {
  const { expertId, persistedContent, updateMemory, onSaveSuccess, onSaveError } =
    input
  const [draft, setDraftState] = useState(persistedContent)
  const [isSaving, setIsSaving] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 持久化内容变化时同步草稿(保存完成后的回填、清空记忆后的复位)
  useEffect(() => {
    setDraftState(persistedContent)
  }, [persistedContent])

  const cancelPendingSave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const persist = useCallback(
    async (content: string, reason: string) => {
      try {
        setIsSaving(true)
        await updateMemory({ expertId, newContent: content, reason })
        onSaveSuccess?.()
      } catch (error) {
        onSaveError?.(error)
      } finally {
        setIsSaving(false)
      }
    },
    [expertId, updateMemory, onSaveSuccess, onSaveError],
  )

  const setDraft = useCallback(
    (content: string) => {
      if (content.length > MEMORY_MAX_LENGTH) return

      setDraftState(content)
      cancelPendingSave()
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null
        void persist(content, "用户手动编辑")
      }, AUTO_SAVE_DELAY_MS)
    },
    [cancelPendingSave, persist],
  )

  const save = useCallback(async () => {
    cancelPendingSave()
    await persist(draft, "用户手动保存")
  }, [cancelPendingSave, persist, draft])

  // 卸载时清理挂起的自动保存
  useEffect(() => cancelPendingSave, [cancelPendingSave])

  return {
    draft,
    setDraft,
    save,
    isSaving,
    hasUnsavedChanges: draft !== persistedContent,
  }
}
