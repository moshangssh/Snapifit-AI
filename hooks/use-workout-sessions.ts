"use client"

import { useCallback, useEffect, useState } from "react"
import { useIndexedDB } from "@/hooks/use-indexed-db"
import type { WorkoutSession } from "@/lib/workout/types"

interface WorkoutSessionMeta {
  activeSessionId?: string
  completedSessionIds: string[]
}

const META_KEY = "singleton"
const EMPTY_META: WorkoutSessionMeta = {
  completedSessionIds: [],
}

export function useWorkoutSessions() {
  const {
    getData: getSessionData,
    saveData: saveSessionData,
    isInitializing: sessionsInitializing,
  } = useIndexedDB("workoutSessions")
  const {
    getData: getMetaData,
    saveData: saveMetaData,
    isInitializing: metaInitializing,
  } = useIndexedDB("workoutSessionMeta")
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null)
  const [meta, setMeta] = useState<WorkoutSessionMeta>(EMPTY_META)
  const [isReady, setIsReady] = useState(false)

  const refresh = useCallback(async () => {
    if (sessionsInitializing || metaInitializing) return

    const storedMeta =
      ((await getMetaData(META_KEY)) as WorkoutSessionMeta | null) ??
      EMPTY_META
    setMeta(storedMeta)

    if (storedMeta.activeSessionId) {
      const storedSession = (await getSessionData(
        storedMeta.activeSessionId,
      )) as WorkoutSession | null
      setActiveSession(storedSession)
    } else {
      setActiveSession(null)
    }

    setIsReady(true)
  }, [getMetaData, getSessionData, metaInitializing, sessionsInitializing])

  useEffect(() => {
    refresh()
  }, [refresh])

  const saveActiveSession = useCallback(
    async (session: WorkoutSession) => {
      await saveSessionData(session.sessionId, session)
      const nextMeta: WorkoutSessionMeta = {
        ...meta,
        activeSessionId: session.sessionId,
      }
      await saveMetaData(META_KEY, nextMeta)
      setMeta(nextMeta)
      setActiveSession(session)
    },
    [meta, saveMetaData, saveSessionData],
  )

  const markSessionCompleted = useCallback(
    async (session: WorkoutSession) => {
      await saveSessionData(session.sessionId, session)
      const nextMeta: WorkoutSessionMeta = {
        activeSessionId: undefined,
        completedSessionIds: [
          session.sessionId,
          ...meta.completedSessionIds.filter((id) => id !== session.sessionId),
        ],
      }
      await saveMetaData(META_KEY, nextMeta)
      setMeta(nextMeta)
      setActiveSession(null)
    },
    [meta.completedSessionIds, saveMetaData, saveSessionData],
  )

  const hasCompletedWorkout = meta.completedSessionIds.length > 0

  const getCompletedSessions = useCallback(
    async (limit = 5): Promise<WorkoutSession[]> => {
      const ids = meta.completedSessionIds.slice(0, limit)
      const sessions = await Promise.all(
        ids.map((id) => getSessionData(id) as Promise<WorkoutSession | null>),
      )
      return sessions.filter((item): item is WorkoutSession => Boolean(item))
    },
    [getSessionData, meta.completedSessionIds],
  )

  return {
    activeSession,
    hasCompletedWorkout,
    isReady,
    refresh,
    saveActiveSession,
    markSessionCompleted,
    getCompletedSessions,
  }
}
