import {
  HEALTH_DB_STORES,
  openHealthDatabase,
} from "@/lib/indexed-db"
import {
  EXPORTABLE_HEALTH_STORES,
  type ExportStoreName,
  type StoreRecord,
} from "@/lib/health-data-export"

export { openHealthDatabase }

export async function exportStores(
  storeNames: ExportStoreName[] = EXPORTABLE_HEALTH_STORES,
): Promise<Record<ExportStoreName, StoreRecord>> {
  const db = await openHealthDatabase()
  try {
    return await new Promise((resolve, reject) => {
      const result = {} as Record<ExportStoreName, StoreRecord>
      const transaction = db.transaction(storeNames, "readonly")

      transaction.oncomplete = () => resolve(result)
      transaction.onerror = () =>
        reject(transaction.error ?? new Error("Failed to export stores"))

      for (const storeName of storeNames) {
        const storeResult: StoreRecord = {}
        result[storeName] = storeResult
        const request = transaction.objectStore(storeName).openCursor()
        request.onsuccess = () => {
          const cursor = request.result
          if (!cursor) return
          storeResult[String(cursor.key)] = cursor.value
          cursor.continue()
        }
      }
    })
  } finally {
    db.close()
  }
}

export async function replaceStores(
  dataByStore: Partial<Record<ExportStoreName, StoreRecord>>,
): Promise<void> {
  const storeNames = EXPORTABLE_HEALTH_STORES.filter((storeName) =>
    Object.prototype.hasOwnProperty.call(dataByStore, storeName),
  )
  if (storeNames.length === 0) return

  const db = await openHealthDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(storeNames, "readwrite")
      transaction.oncomplete = () => resolve()
      transaction.onerror = () =>
        reject(transaction.error ?? new Error("Failed to replace stores"))

      for (const storeName of storeNames) {
        const objectStore = transaction.objectStore(storeName)
        objectStore.clear()
        for (const [key, value] of Object.entries(dataByStore[storeName] ?? {})) {
          objectStore.put(value, key)
        }
      }
    })
  } finally {
    db.close()
  }
}

export async function clearStores(
  storeNames: ExportStoreName[] = EXPORTABLE_HEALTH_STORES,
): Promise<void> {
  const db = await openHealthDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(storeNames, "readwrite")
      transaction.oncomplete = () => resolve()
      transaction.onerror = () =>
        reject(transaction.error ?? new Error("Failed to clear stores"))

      for (const storeName of storeNames) {
        transaction.objectStore(storeName).clear()
      }
    })
  } finally {
    db.close()
  }
}

export const HEALTH_LOG_STORE = HEALTH_DB_STORES.healthLogs
