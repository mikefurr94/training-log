import { useMemo } from 'react'
import { startOfWeek, addDays, addWeeks, startOfDay, isBefore, isAfter, format } from 'date-fns'
import { useAppStore } from '../store/useAppStore'
import type { PlannedActivity, WeekDayIndex } from '../store/types'

/**
 * Returns a map of 'YYYY-MM-DD' → PlannedActivity[] for every day in [start, end].
 * Merges weekTemplate with any weekOverrides per day.
 *
 * Only returns planned activities for days in the range [today, today + 4 weeks].
 * Past days and days beyond 4 weeks from today return an empty array.
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

      // Only show planned activities between today and 4 weeks out
      if (isBefore(currentDay, today) || isAfter(currentDay, horizon)) {
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
