export const HEALTH_DB_NAME = "healthApp"
export const HEALTH_DB_VERSION = 5

export const HEALTH_DB_STORES = {
  healthLogs: "healthLogs",
  aiMemories: "aiMemories",
  workoutSessions: "workoutSessions",
  workoutSessionMeta: "workoutSessionMeta",
} as const

const ALL_HEALTH_STORES: readonly string[] = Object.values(HEALTH_DB_STORES)

function ensureHealthStores(db: IDBDatabase): void {
  for (const storeName of ALL_HEALTH_STORES) {
    if (!db.objectStoreNames.contains(storeName)) {
      db.createObjectStore(storeName)
    }
  }
}

function hasAllHealthStores(db: IDBDatabase): boolean {
  return ALL_HEALTH_STORES.every((name) => db.objectStoreNames.contains(name))
}

function openAt(version?: number): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request =
      version === undefined
        ? indexedDB.open(HEALTH_DB_NAME)
        : indexedDB.open(HEALTH_DB_NAME, version)

    request.onupgradeneeded = () => ensureHealthStores(request.result)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to open IndexedDB"))
    request.onblocked = () =>
      reject(new Error("IndexedDB upgrade blocked by another connection"))
  })
}

export async function openHealthDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is not available in this environment")
  }

  let db: IDBDatabase
  try {
    db = await openAt(HEALTH_DB_VERSION)
  } catch (err) {
    // A prior self-heal may have bumped the user's DB above HEALTH_DB_VERSION.
    // IndexedDB rejects downgrades with VersionError — open at whatever
    // version already exists instead.
    if (err instanceof Error && err.name === "VersionError") {
      db = await openAt()
    } else {
      throw err
    }
  }

  if (hasAllHealthStores(db)) {
    return db
  }

  // Old builds raced an upgrade and left the DB at the current version with
  // missing stores. onupgradeneeded won't fire on a same-version open, so
  // bump once to force it and let ensureHealthStores create what's missing.
  const nextVersion = db.version + 1
  db.close()
  return openAt(nextVersion)
}
