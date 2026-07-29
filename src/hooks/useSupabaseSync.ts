import { useEffect, useRef } from 'react'
import { useAppStore } from '../store/useAppStore'
import { loadPlan, savePlan, loadCoachPlan } from '../api/db'
import type { CoachPlan, WeekTemplate, WeekOverride, KeyDate } from '../store/types'

// Debounce helper
function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>
  return ((...args: unknown[]) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }) as T
}

export function useSupabaseSync() {
  const user = useAppStore((s) => s.user)
  const weekTemplate = useAppStore((s) => s.weekTemplate)
  const weekOverrides = useAppStore((s) => s.weekOverrides)
  const keyDates = useAppStore((s) => s.keyDates)
  const loadedRef = useRef(false)
  const prevPlanRef = useRef<string | null>(null) // null = remote load not yet complete

  const userId = user?.id

  // On login: load plan from Supabase
  useEffect(() => {
    if (!userId || loadedRef.current) return
    loadedRef.current = true

    loadPlan()
      .then((data) => {
        const local = useAppStore.getState()
        const remote = (data ?? {}) as { weekTemplate?: WeekTemplate; weekOverrides?: WeekOverride[]; keyDates?: KeyDate[] }
        const remoteOverrides = Array.isArray(remote.weekOverrides) ? remote.weekOverrides : []
        const remoteKeyDates = Array.isArray(remote.keyDates) ? remote.keyDates : []
        const remoteHasData = remoteOverrides.length > 0 || remoteKeyDates.length > 0
        const localHasData = (local.weekOverrides?.length ?? 0) > 0 || (local.keyDates?.length ?? 0) > 0

        console.log('[plan-sync] load result:', {
          remoteOverrideCount: remoteOverrides.length,
          remoteKeyDateCount: remoteKeyDates.length,
          localOverrideCount: local.weekOverrides?.length ?? 0,
          localKeyDateCount: local.keyDates?.length ?? 0,
          remoteHasData,
          localHasData,
        })

        if (remoteHasData) {
          // Remote wins when it has data
          console.log('[plan-sync] using remote plan')
          useAppStore.getState().loadPlanFromDb(remote as Record<string, unknown>)
          const s = useAppStore.getState()
          prevPlanRef.current = JSON.stringify({ weekTemplate: s.weekTemplate, weekOverrides: s.weekOverrides, keyDates: s.keyDates })
        } else if (localHasData) {
          // Remote empty but local has data — push local up to recover (e.g. after a prior wipe)
          console.log('[plan-sync] pushing local plan up to recover')
          const localPlan = { weekTemplate: local.weekTemplate, weekOverrides: local.weekOverrides, keyDates: local.keyDates }
          savePlan(localPlan as Record<string, unknown>).catch(console.error)
          prevPlanRef.current = JSON.stringify(localPlan)
        } else {
          // Both empty — nothing to do
          console.log('[plan-sync] both empty, nothing to sync')
          prevPlanRef.current = JSON.stringify({ weekTemplate: local.weekTemplate, weekOverrides: local.weekOverrides, keyDates: local.keyDates })
        }
      })
      .catch(console.error)

    loadCoachPlan()
      .then((data) => {
        if (data && typeof data === 'object' && 'id' in data) {
          // Map snake_case DB response to camelCase CoachPlan
          const raw = data as Record<string, unknown>
          const plan: CoachPlan = {
            id: raw.id as string,
            name: raw.name as string,
            raceName: (raw.race_name ?? raw.raceName) as string | undefined,
            raceDate: (raw.race_date ?? raw.raceDate) as string | undefined,
            raceDistance: (raw.race_distance ?? raw.raceDistance) as string | undefined,
            goalTime: (raw.goal_time ?? raw.goalTime) as string | undefined,
            preferences: (raw.preferences ?? {}) as CoachPlan['preferences'],
            weeks: (raw.weeks ?? []) as CoachPlan['weeks'],
            status: (raw.status ?? 'active') as CoachPlan['status'],
            conversationId: (raw.conversation_id ?? raw.conversationId) as string | undefined,
            createdAt: (raw.created_at ?? raw.createdAt ?? new Date().toISOString()) as string,
            updatedAt: (raw.updated_at ?? raw.updatedAt ?? new Date().toISOString()) as string,
          }
          useAppStore.getState().setCoachPlan(plan)
        }
      })
      .catch(console.error)
  }, [userId])

  // Reset on logout
  useEffect(() => {
    if (!userId) {
      loadedRef.current = false
      prevPlanRef.current = null
    }
  }, [userId])

  // Sync training plan to Supabase when it changes
  useEffect(() => {
    if (!userId || !loadedRef.current) return
    if (prevPlanRef.current === null) return // wait for remote load to complete first

    const planData = { weekTemplate, weekOverrides, keyDates }
    const serialized = JSON.stringify(planData)
    if (serialized === prevPlanRef.current) return
    prevPlanRef.current = serialized

    const syncPlan = debounce(async () => {
      try {
        await savePlan(planData as Record<string, unknown>)
      } catch (err) {
        console.error('Failed to sync plan:', err)
      }
    }, 2000)

    syncPlan()
  }, [userId, weekTemplate, weekOverrides, keyDates])
}
