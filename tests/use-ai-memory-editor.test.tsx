// @vitest-environment happy-dom
import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  useAIMemoryEditor,
  type AIMemoryEditor,
} from "@/hooks/use-ai-memory-editor"

// 防抖时序正对 hook interface 测试(评审候选 6):此前这套 timeout 逻辑
// 长在 settings 页面里,只能穿整页渲染测。

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

type EditorInput = Parameters<typeof useAIMemoryEditor>[0]

function renderEditor(initialInput: EditorInput) {
  const result = { current: null as unknown as AIMemoryEditor }
  function Probe(props: { input: EditorInput }) {
    result.current = useAIMemoryEditor(props.input)
    return null
  }
  const container = document.createElement("div")
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(<Probe input={initialInput} />))
  return {
    result,
    setDraft: (content: string) => act(() => result.current.setDraft(content)),
    save: async () => act(async () => result.current.save()),
    rerender: (input: EditorInput) => act(() => root.render(<Probe input={input} />)),
    unmount: () => act(() => root.unmount()),
  }
}

function baseInput(overrides: Partial<EditorInput> = {}): EditorInput {
  return {
    expertId: "nutrition",
    persistedContent: "既有记忆",
    updateMemory: vi.fn(async () => {}),
    ...overrides,
  }
}

async function advance(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms)
  })
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe("useAIMemoryEditor", () => {
  it("auto-saves the draft once after the 3s debounce window", async () => {
    const updateMemory = vi.fn(async () => {})
    const onSaveSuccess = vi.fn()
    const editor = renderEditor(baseInput({ updateMemory, onSaveSuccess }))

    editor.setDraft("新的记忆内容")
    expect(editor.result.current.draft).toBe("新的记忆内容")
    expect(editor.result.current.hasUnsavedChanges).toBe(true)

    await advance(2999)
    expect(updateMemory).not.toHaveBeenCalled()

    await advance(1)
    expect(updateMemory).toHaveBeenCalledOnce()
    expect(updateMemory).toHaveBeenCalledWith({
      expertId: "nutrition",
      newContent: "新的记忆内容",
      reason: "用户手动编辑",
    })
    expect(onSaveSuccess).toHaveBeenCalledOnce()
  })

  it("collapses rapid edits into a single save of the latest content", async () => {
    const updateMemory = vi.fn(async () => {})
    const editor = renderEditor(baseInput({ updateMemory }))

    editor.setDraft("第一版")
    await advance(2000)
    editor.setDraft("第二版")
    await advance(3000)

    expect(updateMemory).toHaveBeenCalledOnce()
    expect(updateMemory).toHaveBeenLastCalledWith(
      expect.objectContaining({ newContent: "第二版" }),
    )
  })

  it("manual save persists immediately and cancels the pending auto-save", async () => {
    const updateMemory = vi.fn(async () => {})
    const editor = renderEditor(baseInput({ updateMemory }))

    editor.setDraft("手动保存内容")
    await editor.save()

    expect(updateMemory).toHaveBeenCalledOnce()
    expect(updateMemory).toHaveBeenCalledWith({
      expertId: "nutrition",
      newContent: "手动保存内容",
      reason: "用户手动保存",
    })

    await advance(5000)
    expect(updateMemory).toHaveBeenCalledOnce()
  })

  it("exposes isSaving while a save is in flight", async () => {
    let resolveSave!: () => void
    const updateMemory = vi.fn(
      () => new Promise<void>((resolve) => { resolveSave = resolve }),
    )
    const editor = renderEditor(baseInput({ updateMemory }))

    editor.setDraft("慢速保存")
    await advance(3000)
    expect(editor.result.current.isSaving).toBe(true)

    await act(async () => {
      resolveSave()
    })
    expect(editor.result.current.isSaving).toBe(false)
  })

  it("resyncs the draft when the persisted content changes", () => {
    const editor = renderEditor(baseInput({ persistedContent: "旧内容" }))

    editor.setDraft("编辑中")
    editor.rerender(baseInput({ persistedContent: "外部更新" }))

    expect(editor.result.current.draft).toBe("外部更新")
    expect(editor.result.current.hasUnsavedChanges).toBe(false)
  })

  it("drops the pending auto-save on unmount", async () => {
    const updateMemory = vi.fn(async () => {})
    const editor = renderEditor(baseInput({ updateMemory }))

    editor.setDraft("即将卸载")
    editor.unmount()
    await advance(5000)

    expect(updateMemory).not.toHaveBeenCalled()
  })

  it("ignores input beyond the 500-character limit", async () => {
    const updateMemory = vi.fn(async () => {})
    const editor = renderEditor(baseInput({ updateMemory }))

    editor.setDraft("a".repeat(501))
    expect(editor.result.current.draft).toBe("既有记忆")

    await advance(4000)
    expect(updateMemory).not.toHaveBeenCalled()
  })

  it("reports failures through onSaveError and clears isSaving", async () => {
    const updateMemory = vi.fn(async () => {
      throw new Error("boom")
    })
    const onSaveError = vi.fn()
    const editor = renderEditor(baseInput({ updateMemory, onSaveError }))

    editor.setDraft("会失败的保存")
    await advance(3000)

    expect(onSaveError).toHaveBeenCalledOnce()
    expect(editor.result.current.isSaving).toBe(false)
  })
})
