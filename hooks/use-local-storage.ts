"use client"

import { useState, useCallback, useEffect } from "react"

type LocalStorageValue<T> = T | ((previous: T) => T)

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: LocalStorageValue<T>) => void, boolean] {
  // 状态用于在组件中存储值
  const [storedValue, setStoredValue] = useState<T>(initialValue)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key)
      if (item !== null) {
        setStoredValue(JSON.parse(item))
      }
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error)
    } finally {
      setIsHydrated(true)
    }
  }, [key])

  // 返回一个包装版的 setState 函数，同时更新 localStorage
  const setValue = useCallback(
    (value: LocalStorageValue<T>) => {
      setStoredValue((previous) => {
        const valueToStore = value instanceof Function ? value(previous) : value

        try {
          // 保存到 localStorage
          if (typeof window !== "undefined") {
            window.localStorage.setItem(key, JSON.stringify(valueToStore))
          }
        } catch (error) {
          console.error(`Error setting localStorage key "${key}":`, error)
        }

        return valueToStore
      })
    },
    [key],
  )

  return [storedValue, setValue, isHydrated]
}
