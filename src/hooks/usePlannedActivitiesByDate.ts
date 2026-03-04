import { useMemo } from 'react'
import { startOfWeek, addDays, format } from 'date-fns'
import { useAppStore } from '../store/useAppStore'
import type { PlannedActivity, WeekDayIndex } from '../store/types'

/**
 * Returns a map of 'YYYY-MM-DD' → PlannedActivity[] for every day in [start, end].
 * Uses week overrides for user-edited days; empty array otherwise.
 */
export function usePlannedActivitiesByDate(
  start: Date,
  end: Date
): Record<string, PlannedActivity[]> {
  const weekOverrides = useAppStore((s) => s.weekOverrides)

  return useMemo(() => {
    const map: Record<string, PlannedActivity[]> = {}
    let current = new Date(start)
    while (current <= end) {
      const dateStr = format(current, 'yyyy-MM-dd')

      const ws = startOfWeek(current, { weekStartsOn: 1 })
      const wsStr = format(ws, 'yyyy-MM-dd')
      const dayIndex = current.getDay() as WeekDayIndex

      const override = weekOverrides.find((o) => o.weekStart === wsStr)
      if (override && override.days[dayIndex] !== undefined) {
        map[dateStr] = override.days[dayIndex]!
      } else {
        map[dateStr] = []
      }

      current = addDays(current, 1)
    }
    return map
  }, [weekOverrides, format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd')])
}
