import { useEffect, useRef } from 'react'
import { useAppStore } from '../store/useAppStore'
import { loadHabits, saveHabitDay, loadPlan, savePlan, loadCoachPlan, loadHabitDefinitions, saveHabitDefinitions } from '../api/db'
import type { CoachPlan, HabitDefinition } from '../store/types'

// Debounce helper
function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>
  return ((...args: unknown[]) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }) as T
}

export function useSupabaseSync() {
  const athlete = useAppStore((s) => s.athlete)
  const habitCounts = useAppStore((s) => s.habitCounts)
  const habits = useAppStore((s) => s.habits)
  const weekTemplate = useAppStore((s) => s.weekTemplate)
  const weekOverrides = useAppStore((s) => s.weekOverrides)
  const keyDates = useAppStore((s) => s.keyDates)
  const setHabitCounts = useAppStore((s) => s.setHabitCounts)
  const loadedRef = useRef(false)
  const prevCompletionsRef = useRef<string>('')
  const prevPlanRef = useRef<string>('')
  const prevHabitsRef = useRef<string | null>(null) // null = remote load not yet complete

  const athleteId = athlete?.id

  // On login: load habits + plan from Supabase
  useEffect(() => {
    if (!athleteId || loadedRef.current) return
    loadedRef.current = true

    loadHabits(athleteId)
      .then((data) => {
        if (Object.keys(data).length > 0) {
          // Convert remote string[] format → counts, merging with local (take max per habit)
          const local = useAppStore.getState().habitCounts
          const merged: Record<string, Record<string, number>> = {}
          const allDates = new Set([...Object.keys(local), ...Object.keys(data)])
          for (const date of allDates) {
            const localDay = local[date] ?? {}
            const remoteIds = data[date] ?? []
            const day: Record<string, number> = { ...localDay }
            for (const id of remoteIds) {
              day[id] = Math.max(day[id] ?? 0, 1)
            }
            merged[date] = day
          }
          setHabitCounts(merged)
        }
      })
      .catch(console.error)

    // Load habit definitions — Supabase wins if it has data (enables cross-device sync)
    loadHabitDefinitions(athleteId)
      .then((remoteHabits) => {
        if (remoteHabits && remoteHabits.length > 0) {
          useAppStore.getState().reorderHabits(remoteHabits as HabitDefinition[])
          prevHabitsRef.current = JSON.stringify(remoteHabits)
        } else {
          // No remote habits yet — push local habits up so other devices get them
          const localHabits = useAppStore.getState().habits
          if (localHabits.length > 0) {
            saveHabitDefinitions(athleteId, localHabits).catch(console.error)
            prevHabitsRef.current = JSON.stringify(localHabits)
          }
        }
      })
      .catch(console.error)

    loadPlan(athleteId)
      .then((data) => {
        if (data && Object.keys(data).length > 0) {
          useAppStore.getState().loadPlanFromDb(data)
        }
      })
      .catch(console.error)

    loadCoachPlan(athleteId)
      .then((data) => {
        if (data && typeof data === 'object' && 'id' in data) {
          // Map snake_case DB response to camelCase CoachPlan
          const raw = data as Record<string, unknown>
          const plan: CoachPlan = {
            id: raw.id as string,
            athleteId: (raw.athlete_id ?? raw.athleteId) as number,
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
  }, [athleteId])

  // Reset on logout
  useEffect(() => {
    if (!athleteId) {
      loadedRef.current = false
      prevCompletionsRef.current = ''
      prevPlanRef.current = ''
      prevHabitsRef.current = null
    }
  }, [athleteId])

  // Sync habit definitions to Supabase when they change
  useEffect(() => {
    if (!athleteId || !loadedRef.current) return
    if (prevHabitsRef.current === null) return // wait for remote load to complete first

    const serialized = JSON.stringify(habits)
    if (serialized === prevHabitsRef.current) return
    prevHabitsRef.current = serialized

    const syncHabits = debounce(async () => {
      try {
        await saveHabitDefinitions(athleteId, habits)
      } catch (err) {
        console.error('Failed to sync habit definitions:', err)
      }
    }, 1000)

    syncHabits()
  }, [athleteId, habits])

  // Sync habit completions to Supabase when counts change
  // Sends habit IDs where count >= dailyTarget (preserves existing DB schema)
  useEffect(() => {
    if (!athleteId || !loadedRef.current) return

    const serialized = JSON.stringify(habitCounts)
    if (serialized === prevCompletionsRef.current) return
    prevCompletionsRef.current = serialized

    const syncChanges = debounce(async () => {
      const currentHabits = useAppStore.getState().habits
      for (const [date, dayCounts] of Object.entries(habitCounts)) {
        const completedIds = Object.entries(dayCounts)
          .filter(([habitId, count]) => {
            const habit = currentHabits.find((h) => h.id === habitId)
            const target = habit?.dailyTarget ?? 1
            return count >= target
          })
          .map(([id]) => id)
        try {
          await saveHabitDay(athleteId, date, completedIds)
        } catch (err) {
          console.error('Failed to sync habit:', err)
        }
      }
    }, 1000)

    syncChanges()
  }, [athleteId, habitCounts])

  // Sync training plan to Supabase when it changes
  useEffect(() => {
    if (!athleteId || !loadedRef.current) return

    const planData = { weekTemplate, weekOverrides, keyDates }
    const serialized = JSON.stringify(planData)
    if (serialized === prevPlanRef.current) return
    prevPlanRef.current = serialized

    const syncPlan = debounce(async () => {
      try {
        await savePlan(athleteId, planData as Record<string, unknown>)
      } catch (err) {
        console.error('Failed to sync plan:', err)
      }
    }, 2000)

    syncPlan()
  }, [athleteId, weekTemplate, weekOverrides, keyDates])
}
