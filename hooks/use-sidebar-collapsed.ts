"use client"

import { useEffect, useState } from "react"

const STORAGE_KEY = "snapifit:sidebar-collapsed"

export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === "1") setCollapsed(true)
  }, [])

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0")
      return next
    })
  }

  return { collapsed, toggle }
}
