"use client"

import { useEffect } from "react"

export function PWARegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return
    if (typeof window === "undefined") return
    if (!("serviceWorker" in navigator)) return

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          console.info("[SW] registered, scope:", reg.scope)
        })
        .catch((err) => {
          console.error("[SW] register failed:", err)
        })
    }

    if (document.readyState === "complete") {
      register()
    } else {
      window.addEventListener("load", register, { once: true })
    }
  }, [])

  return null
}
