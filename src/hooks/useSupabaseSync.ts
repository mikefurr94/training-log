import { useEffect, useRef } from 'react'
import { useAppStore } from '../store/useAppStore'
import { loadHabits, saveHabitDay, loadPlan, savePlan } from '../api/db'

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
  const habitCompletions = useAppStore((s) => s.habitCompletions)
  const weekTemplate = useAppStore((s) => s.weekTemplate)
  const weekOverrides = useAppStore((s) => s.weekOverrides)
  const keyDates = useAppStore((s) => s.keyDates)
  const setHabitCompletions = useAppStore((s) => s.setHabitCompletions)
  const loadedRef = useRef(false)
  const prevCompletionsRef = useRef<string>('')
  const prevPlanRef = useRef<string>('')

  const athleteId = athlete?.id

  // On login: load habits + plan from Supabase
  useEffect(() => {
    if (!athleteId || loadedRef.current) return
    loadedRef.current = true

    loadHabits(athleteId)
      .then((data) => {
        if (Object.keys(data).length > 0) {
          setHabitCompletions(data)
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
  }, [athleteId])

  // Reset on logout
  useEffect(() => {
    if (!athleteId) {
      loadedRef.current = false
      prevCompletionsRef.current = ''
      prevPlanRef.current = ''
    }
  }, [athleteId])

  // Sync habit completions to Supabase when they change
  useEffect(() => {
    if (!athleteId || !loadedRef.current) return

    const serialized = JSON.stringify(habitCompletions)
    if (serialized === prevCompletionsRef.current) return
    prevCompletionsRef.current = serialized

    const syncChanges = debounce(async () => {
      for (const [date, habitIds] of Object.entries(habitCompletions)) {
        try {
          await saveHabitDay(athleteId, date, habitIds)
        } catch (err) {
          console.error('Failed to sync habit:', err)
        }
      }
    }, 1000)

    syncChanges()
  }, [athleteId, habitCompletions])

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
