import "fake-indexeddb/auto"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  HEALTH_DB_NAME,
  HEALTH_DB_STORES,
  HEALTH_DB_VERSION,
  openHealthDatabase,
} from "@/lib/indexed-db"

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name)
    request.onsuccess = () => resolve()
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to delete database"))
    request.onblocked = () => resolve()
  })
}

function openRaw(name: string, version: number): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to open database"))
  })
}

describe("openHealthDatabase", () => {
  beforeEach(async () => {
    await deleteDatabase(HEALTH_DB_NAME)
  })

  afterEach(async () => {
    await deleteDatabase(HEALTH_DB_NAME)
  })

  it("creates all health stores on a fresh open", async () => {
    const db = await openHealthDatabase()
    try {
      expect(db.objectStoreNames.contains(HEALTH_DB_STORES.healthLogs)).toBe(
        true,
      )
      expect(db.objectStoreNames.contains(HEALTH_DB_STORES.aiMemories)).toBe(
        true,
      )
      expect(
        db.objectStoreNames.contains(HEALTH_DB_STORES.workoutSessions),
      ).toBe(true)
      expect(
        db.objectStoreNames.contains(HEALTH_DB_STORES.workoutSessionMeta),
      ).toBe(true)
    } finally {
      db.close()
    }
  })

  it("heals a database that reached the current version without workout stores", async () => {
    // Simulate the broken state: another hook opened the DB at the current
    // version without an onupgradeneeded handler, so workout stores were never
    // created.
    const brokenRequest = indexedDB.open(HEALTH_DB_NAME, HEALTH_DB_VERSION - 1)
    brokenRequest.onupgradeneeded = () => {
      const db = brokenRequest.result
      db.createObjectStore(HEALTH_DB_STORES.healthLogs)
      db.createObjectStore(HEALTH_DB_STORES.aiMemories)
    }
    const brokenDb = await new Promise<IDBDatabase>((resolve, reject) => {
      brokenRequest.onsuccess = () => resolve(brokenRequest.result)
      brokenRequest.onerror = () =>
        reject(brokenRequest.error ?? new Error("Failed to open"))
    })
    expect(
      brokenDb.objectStoreNames.contains(HEALTH_DB_STORES.workoutSessions),
    ).toBe(false)
    brokenDb.close()

    // The centralized open should detect the missing stores and create them.
    const db = await openHealthDatabase()
    try {
      expect(
        db.objectStoreNames.contains(HEALTH_DB_STORES.workoutSessions),
      ).toBe(true)
      expect(
        db.objectStoreNames.contains(HEALTH_DB_STORES.workoutSessionMeta),
      ).toBe(true)

      // The workout stores must be usable in a transaction without throwing
      // NotFoundError (the original bug).
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(
          [HEALTH_DB_STORES.workoutSessions],
          "readonly",
        )
        tx.oncomplete = () => resolve()
        tx.onerror = () =>
          reject(tx.error ?? new Error("Transaction failed"))
        tx.objectStore(HEALTH_DB_STORES.workoutSessions)
      })
    } finally {
      db.close()
    }
  })

  it("survives a race where multiple opens fire concurrently", async () => {
    const [a, b, c] = await Promise.all([
      openHealthDatabase(),
      openHealthDatabase(),
      openHealthDatabase(),
    ])
    try {
      for (const db of [a, b, c]) {
        expect(
          db.objectStoreNames.contains(HEALTH_DB_STORES.workoutSessions),
        ).toBe(true)
        expect(
          db.objectStoreNames.contains(HEALTH_DB_STORES.workoutSessionMeta),
        ).toBe(true)
      }
    } finally {
      a.close()
      b.close()
      c.close()
    }
  })

  it("never lets the version drift to a state where stores are missing", async () => {
    // After any sequence of opens, the workout stores must exist.
    const db1 = await openHealthDatabase()
    db1.close()
    const db2 = await openRaw(HEALTH_DB_NAME, HEALTH_DB_VERSION)
    try {
      expect(
        db2.objectStoreNames.contains(HEALTH_DB_STORES.workoutSessions),
      ).toBe(true)
    } finally {
      db2.close()
    }
  })

  it("heals a database already at the current version but missing healthLogs", async () => {
    // Simulate the broken-in-the-wild state: a previous build of the app
    // raced an upgrade and left the DB at HEALTH_DB_VERSION with no stores.
    const brokenRequest = indexedDB.open(HEALTH_DB_NAME, HEALTH_DB_VERSION)
    // Intentionally NO onupgradeneeded — upgrades to the target version with
    // zero stores created. This is exactly the original-bug pattern.
    const brokenDb = await new Promise<IDBDatabase>((resolve, reject) => {
      brokenRequest.onsuccess = () => resolve(brokenRequest.result)
      brokenRequest.onerror = () =>
        reject(brokenRequest.error ?? new Error("Failed to open"))
    })
    expect(
      brokenDb.objectStoreNames.contains(HEALTH_DB_STORES.healthLogs),
    ).toBe(false)
    brokenDb.close()

    // openHealthDatabase must heal it — even though the version is already
    // at HEALTH_DB_VERSION so onupgradeneeded would not fire on a plain open.
    const db = await openHealthDatabase()
    try {
      expect(
        db.objectStoreNames.contains(HEALTH_DB_STORES.healthLogs),
      ).toBe(true)

      // The transaction that triggers the production NotFoundError must now
      // succeed.
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction([HEALTH_DB_STORES.healthLogs], "readonly")
        tx.oncomplete = () => resolve()
        tx.onerror = () =>
          reject(tx.error ?? new Error("Transaction failed"))
        tx.objectStore(HEALTH_DB_STORES.healthLogs)
      })
    } finally {
      db.close()
    }
  })

  it("heals a database already at the current version but missing workoutSessions", async () => {
    // Same broken-state scenario but with the workout stores absent — covers
    // the partial-failure shape where some stores exist and some don't.
    const brokenRequest = indexedDB.open(HEALTH_DB_NAME, HEALTH_DB_VERSION)
    brokenRequest.onupgradeneeded = () => {
      const db = brokenRequest.result
      db.createObjectStore(HEALTH_DB_STORES.healthLogs)
      db.createObjectStore(HEALTH_DB_STORES.aiMemories)
    }
    const brokenDb = await new Promise<IDBDatabase>((resolve, reject) => {
      brokenRequest.onsuccess = () => resolve(brokenRequest.result)
      brokenRequest.onerror = () =>
        reject(brokenRequest.error ?? new Error("Failed to open"))
    })
    expect(
      brokenDb.objectStoreNames.contains(HEALTH_DB_STORES.workoutSessions),
    ).toBe(false)
    brokenDb.close()

    const db = await openHealthDatabase()
    try {
      expect(
        db.objectStoreNames.contains(HEALTH_DB_STORES.workoutSessions),
      ).toBe(true)
      expect(
        db.objectStoreNames.contains(HEALTH_DB_STORES.workoutSessionMeta),
      ).toBe(true)
    } finally {
      db.close()
    }
  })

  it("opens cleanly when the DB has been bumped past HEALTH_DB_VERSION by a prior self-heal", async () => {
    // After self-heal, the user's DB may be at HEALTH_DB_VERSION + 1.  A
    // later build still opening at HEALTH_DB_VERSION must not throw
    // VersionError; it should open at whatever version exists.
    const aheadVersion = HEALTH_DB_VERSION + 1
    const aheadRequest = indexedDB.open(HEALTH_DB_NAME, aheadVersion)
    aheadRequest.onupgradeneeded = () => {
      const db = aheadRequest.result
      for (const storeName of Object.values(HEALTH_DB_STORES)) {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName)
        }
      }
    }
    const aheadDb = await new Promise<IDBDatabase>((resolve, reject) => {
      aheadRequest.onsuccess = () => resolve(aheadRequest.result)
      aheadRequest.onerror = () =>
        reject(aheadRequest.error ?? new Error("Failed to open"))
    })
    aheadDb.close()

    const db = await openHealthDatabase()
    try {
      expect(db.version).toBe(aheadVersion)
      expect(
        db.objectStoreNames.contains(HEALTH_DB_STORES.healthLogs),
      ).toBe(true)
    } finally {
      db.close()
    }
  })
})
