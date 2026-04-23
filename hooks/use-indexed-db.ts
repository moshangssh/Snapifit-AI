"use client"

import { useState, useEffect, useCallback } from "react"
import {
  HEALTH_DB_NAME,
  HEALTH_DB_STORES,
  HEALTH_DB_VERSION,
} from "@/lib/indexed-db"

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

  // 初始化数据库
  useEffect(() => {
    const initDB = async () => {
      try {
        const request = window.indexedDB.open(HEALTH_DB_NAME, HEALTH_DB_VERSION)

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName)
          }
          // 确保aiMemories存储也被创建
          if (!db.objectStoreNames.contains(HEALTH_DB_STORES.aiMemories)) {
            db.createObjectStore(HEALTH_DB_STORES.aiMemories)
          }
          if (!db.objectStoreNames.contains(HEALTH_DB_STORES.workoutSessions)) {
            db.createObjectStore(HEALTH_DB_STORES.workoutSessions)
          }
          if (!db.objectStoreNames.contains(HEALTH_DB_STORES.workoutSessionMeta)) {
            db.createObjectStore(HEALTH_DB_STORES.workoutSessionMeta)
          }
        }

        request.onsuccess = (event) => {
          setDb((event.target as IDBOpenDBRequest).result)
          setIsInitializing(false)
        }

        request.onerror = (event) => {
          setError(new Error("无法打开数据库"))
          setIsInitializing(false)
          console.error("IndexedDB error:", (event.target as IDBOpenDBRequest).error)
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error("初始化数据库时发生未知错误"))
        setIsInitializing(false)
      }
    }

    initDB()

    return () => {
      if (db) {
        db.close()
      }
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
