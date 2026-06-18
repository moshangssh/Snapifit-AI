import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

describe("workout page AS safety lock integration", () => {
  const pageSource = readFileSync(
    join(process.cwd(), "app/workout/page.tsx"),
    "utf8",
  )
  const cardSource = readFileSync(
    join(process.cwd(), "components/workout/as-safety-unlock-card.tsx"),
    "utf8",
  )

  it("disables the AS safety card while generating a workout plan", () => {
    const cardBlock = pageSource.slice(
      pageSource.indexOf("<ASSafetyUnlockCard"),
      pageSource.indexOf("/>", pageSource.indexOf("<ASSafetyUnlockCard")),
    )

    expect(cardBlock).toContain("disabled={isGenerating}")
  })

  it("forwards disabled state to every safety switch", () => {
    expect(cardSource).toContain("disabled = false")
    expect(cardSource).toContain("disabled?: boolean")
    expect(cardSource).toContain("disabled={disabled}")
  })
})
