import { useMemo } from 'react'
import { startOfWeek, addDays, format } from 'date-fns'
import { useAppStore } from '../store/useAppStore'
import { coachDayToPlanned } from '../utils/coachUtils'
import type { PlannedActivity, WeekDayIndex } from '../store/types'

export interface WeekPlanDay {
  date: Date
  dayIndex: WeekDayIndex
  activities: PlannedActivity[]
}

/**
 * Returns an array of 7 WeekPlanDay entries (Mon–Sun) for the week
 * containing the given anchor date, merging coach plan with any override.
 *
 * Two-tier priority:
 *   1. WeekOverride  (highest — user manual edits)
 *   2. CoachPlan     (AI-generated, date-specific)
 */
export function useWeekPlan(anchor: Date): WeekPlanDay[] {
  const weekOverrides = useAppStore((s) => s.weekOverrides)
  const coachPlan = useAppStore((s) => s.coachPlan)

  return useMemo(() => {
    const weekStart = startOfWeek(anchor, { weekStartsOn: 1 })
    const weekStartStr = format(weekStart, 'yyyy-MM-dd')

    const override = weekOverrides.find((o) => o.weekStart === weekStartStr)

    // Build coach plan lookup for this week
    const coachDayMap: Record<string, PlannedActivity[]> = {}
    if (coachPlan) {
      for (const week of coachPlan.weeks) {
        for (const day of week.days) {
          coachDayMap[day.date] = coachDayToPlanned(day)
        }
      }
    }

    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i)
      const dayIndex = date.getDay() as WeekDayIndex
      const dateStr = format(date, 'yyyy-MM-dd')

      // Priority 1: Override
      if (override && override.days[dayIndex] !== undefined) {
        return { date, dayIndex, activities: override.days[dayIndex]! }
      }
      // Priority 2: Coach plan
      if (dateStr in coachDayMap) {
        return { date, dayIndex, activities: coachDayMap[dateStr] }
      }
      // No planned activities
      return { date, dayIndex, activities: [] }
    })
  }, [weekOverrides, coachPlan, format(startOfWeek(anchor, { weekStartsOn: 1 }), 'yyyy-MM-dd')])
}
