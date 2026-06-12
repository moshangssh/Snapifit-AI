"use client"

import { useState, useEffect, useCallback } from "react"
import { openHealthDatabase } from "@/lib/indexed-db"

interface IndexedDBHook {
  getData: (key: string) => Promise<any>
  saveData: (key: string, data: any) => Promise<void>
  deleteData: (key: string) => Promise<void>
  clearAllData: () => Promise<void>
  isLoading: boolean
  isInitializing: boolean
  error: Error | null
}

export function useIndexedDB(storeName: string): IndexedDBHook {
  const [isLoading, setIsLoading] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [db, setDb] = useState<IDBDatabase | null>(null)

  useEffect(() => {
    let cancelled = false
    let openedDb: IDBDatabase | null = null

    openHealthDatabase()
      .then((result) => {
        if (cancelled) {
          result.close()
          return
        }
        openedDb = result
        setDb(result)
        setIsInitializing(false)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err : new Error("无法打开数据库"))
        setIsInitializing(false)
        console.error("IndexedDB error:", err)
      })

    return () => {
      cancelled = true
      openedDb?.close()
    }
  }, [storeName])

  // 获取数据
  const getData = useCallback(
    async (key: string): Promise<any> => {
      if (!db) return null

      setIsLoading(true)
      setError(null)

      try {
        return new Promise((resolve, reject) => {
          const transaction = db.transaction([storeName], "readonly")
          const store = transaction.objectStore(storeName)
          const request = store.get(key)

          request.onsuccess = () => {
            setIsLoading(false)
            resolve(request.result)
          }

          request.onerror = () => {
            setIsLoading(false)
            setError(new Error("获取数据失败"))
            reject(new Error("获取数据失败"))
          }
        })
      } catch (err) {
        setIsLoading(false)
        setError(err instanceof Error ? err : new Error("获取数据时发生未知错误"))
        throw err
      }
    },
    [db, storeName],
  )

  // 保存数据
  const saveData = useCallback(
    async (key: string, data: any): Promise<void> => {
      if (!db) return

      setIsLoading(true)
      setError(null)

      try {
        return new Promise((resolve, reject) => {
          const transaction = db.transaction([storeName], "readwrite")
          const store = transaction.objectStore(storeName)
          const request = store.put(data, key)

          request.onsuccess = () => {
            setIsLoading(false)
            resolve()
          }

          request.onerror = () => {
            setIsLoading(false)
            setError(new Error("保存数据失败"))
            reject(new Error("保存数据失败"))
          }
        })
      } catch (err) {
        setIsLoading(false)
        setError(err instanceof Error ? err : new Error("保存数据时发生未知错误"))
        throw err
      }
    },
    [db, storeName],
  )

  // 删除数据
  const deleteData = useCallback(
    async (key: string): Promise<void> => {
      if (!db) return

      setIsLoading(true)
      setError(null)

      try {
        return new Promise((resolve, reject) => {
          const transaction = db.transaction([storeName], "readwrite")
          const store = transaction.objectStore(storeName)
          const request = store.delete(key)

          request.onsuccess = () => {
            setIsLoading(false)
            resolve()
          }

          request.onerror = () => {
            setIsLoading(false)
            setError(new Error("删除数据失败"))
            reject(new Error("删除数据失败"))
          }
        })
      } catch (err) {
        setIsLoading(false)
        setError(err instanceof Error ? err : new Error("删除数据时发生未知错误"))
        throw err
      }
    },
    [db, storeName],
  )

  // 清空所有数据
  const clearAllData = useCallback(async (): Promise<void> => {
    if (!db) return

    setIsLoading(true)
    setError(null)

    try {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], "readwrite")
        const store = transaction.objectStore(storeName)
        const request = store.clear()

        request.onsuccess = () => {
          setIsLoading(false)
          resolve()
        }

        request.onerror = () => {
          setIsLoading(false)
          setError(new Error("清空数据失败"))
          reject(new Error("清空数据失败"))
        }
      })
    } catch (err) {
      setIsLoading(false)
      setError(err instanceof Error ? err : new Error("清空数据时发生未知错误"))
      throw err
    }
  }, [db, storeName])

  return { getData, saveData, deleteData, clearAllData, isLoading, isInitializing, error }
}
