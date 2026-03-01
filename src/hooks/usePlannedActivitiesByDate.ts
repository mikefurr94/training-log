import { useMemo } from 'react'
import { startOfWeek, addDays, addWeeks, startOfDay, isAfter, format } from 'date-fns'
import { useAppStore } from '../store/useAppStore'
import type { PlannedActivity, WeekDayIndex } from '../store/types'

/**
 * Returns a map of 'YYYY-MM-DD' → PlannedActivity[] for every day in [start, end].
 * Merges weekTemplate with any weekOverrides per day.
 *
 * Returns planned activities for all days in range (past and future up to 4 weeks out).
 */
export function usePlannedActivitiesByDate(
  start: Date,
  end: Date
): Record<string, PlannedActivity[]> {
  const weekTemplate = useAppStore((s) => s.weekTemplate)
  const weekOverrides = useAppStore((s) => s.weekOverrides)

  return useMemo(() => {
    const today = startOfDay(new Date())
    const horizon = addWeeks(today, 4)

    const map: Record<string, PlannedActivity[]> = {}
    let current = new Date(start)
    while (current <= end) {
      const dateStr = format(current, 'yyyy-MM-dd')
      const currentDay = startOfDay(current)

      // Only hide planned activities beyond 4 weeks in the future
      if (isAfter(currentDay, horizon)) {
        map[dateStr] = []
        current = addDays(current, 1)
        continue
      }

      const ws = startOfWeek(current, { weekStartsOn: 1 })
      const wsStr = format(ws, 'yyyy-MM-dd')
      const dayIndex = current.getDay() as WeekDayIndex

      const override = weekOverrides.find((o) => o.weekStart === wsStr)
      if (override && override.days[dayIndex] !== undefined) {
        map[dateStr] = override.days[dayIndex]!
      } else {
        map[dateStr] = weekTemplate.days[dayIndex] ?? []
      }
      current = addDays(current, 1)
    }
    return map
  }, [weekTemplate, weekOverrides, format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd')])
}
