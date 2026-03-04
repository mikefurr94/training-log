import { useMemo } from 'react'
import { startOfWeek, addDays, format } from 'date-fns'
import { useAppStore } from '../store/useAppStore'
import type { PlannedActivity, WeekDayIndex } from '../store/types'

export interface WeekPlanDay {
  date: Date
  dayIndex: WeekDayIndex
  activities: PlannedActivity[]
}

/**
 * Returns an array of 7 WeekPlanDay entries (Mon–Sun) for the week
 * containing the given anchor date, using any week overrides.
 */
export function useWeekPlan(anchor: Date): WeekPlanDay[] {
  const weekOverrides = useAppStore((s) => s.weekOverrides)

  return useMemo(() => {
    const weekStart = startOfWeek(anchor, { weekStartsOn: 1 })
    const weekStartStr = format(weekStart, 'yyyy-MM-dd')

    const override = weekOverrides.find((o) => o.weekStart === weekStartStr)

    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i)
      const dayIndex = date.getDay() as WeekDayIndex

      if (override && override.days[dayIndex] !== undefined) {
        return { date, dayIndex, activities: override.days[dayIndex]! }
      }
      return { date, dayIndex, activities: [] }
    })
  }, [weekOverrides, format(startOfWeek(anchor, { weekStartsOn: 1 }), 'yyyy-MM-dd')])
}
