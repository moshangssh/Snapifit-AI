import { HEALTH_DB_STORES } from "@/lib/indexed-db"

export type ExportStoreName =
  (typeof HEALTH_DB_STORES)[keyof typeof HEALTH_DB_STORES]

export type StoreRecord = Record<string, unknown>

export interface ExportedHealthDataV2 {
  version: 2
  exportedAt: string
  userProfile: unknown
  aiConfig: unknown
  stores: Record<ExportStoreName, StoreRecord>
}

export interface NormalizedImportedHealthData {
  userProfile?: unknown
  aiConfig?: unknown
  stores: Partial<Record<ExportStoreName, StoreRecord>>
}

export const EXPORTABLE_HEALTH_STORES = Object.values(
  HEALTH_DB_STORES,
) as ExportStoreName[]

function isRecord(value: unknown): value is StoreRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function recordOrUndefined(value: unknown): StoreRecord | undefined {
  return isRecord(value) ? value : undefined
}

export function createExportedHealthData(input: {
  userProfile: unknown
  aiConfig: unknown
  stores: Record<ExportStoreName, StoreRecord>
  exportedAt: string
}): ExportedHealthDataV2 {
  return {
    version: 2,
    exportedAt: input.exportedAt,
    userProfile: input.userProfile,
    aiConfig: input.aiConfig,
    stores: input.stores,
  }
}

export function normalizeImportedHealthData(
  input: unknown,
): NormalizedImportedHealthData {
  if (!isRecord(input)) {
    throw new Error("Invalid health data export")
  }

  if (isRecord(input.stores)) {
    const stores: Partial<Record<ExportStoreName, StoreRecord>> = {}
    for (const storeName of EXPORTABLE_HEALTH_STORES) {
      const storeValue = recordOrUndefined(input.stores[storeName])
      if (storeValue) stores[storeName] = storeValue
    }
    return {
      userProfile: input.userProfile,
      aiConfig: input.aiConfig,
      stores,
    }
  }

  const stores: Partial<Record<ExportStoreName, StoreRecord>> = {}
  const healthLogs = recordOrUndefined(input.healthLogs)
  const aiMemories = recordOrUndefined(input.aiMemories)
  const workoutSessions = recordOrUndefined(input.workoutSessions)
  const workoutSessionMeta = recordOrUndefined(input.workoutSessionMeta)

  if (healthLogs) stores.healthLogs = healthLogs
  if (aiMemories) stores.aiMemories = aiMemories
  if (workoutSessions) stores.workoutSessions = workoutSessions
  if (workoutSessionMeta) stores.workoutSessionMeta = workoutSessionMeta

  if (!input.userProfile || !stores.healthLogs) {
    throw new Error("Invalid health data export")
  }

  return {
    userProfile: input.userProfile,
    aiConfig: input.aiConfig,
    stores,
  }
}
