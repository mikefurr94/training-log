import { useMemo } from 'react'
import { startOfWeek, addDays, addWeeks, startOfDay, isAfter, format } from 'date-fns'
import { useAppStore } from '../store/useAppStore'
import { coachDayToPlanned } from '../utils/coachUtils'
import type { PlannedActivity, WeekDayIndex, CoachDay } from '../store/types'

/**
 * Returns a map of 'YYYY-MM-DD' → PlannedActivity[] for every day in [start, end].
 *
 * Three-tier priority:
 *   1. WeekOverride  (highest — user manual edits on specific dates)
 *   2. CoachPlan     (middle — AI-generated, date-specific)
 *   3. WeekTemplate  (lowest — repeating weekly fallback)
 *
 * The 4-week future horizon is lifted for dates covered by the coach plan.
 */
export function usePlannedActivitiesByDate(
  start: Date,
  end: Date
): Record<string, PlannedActivity[]> {
  const weekTemplate = useAppStore((s) => s.weekTemplate)
  const weekOverrides = useAppStore((s) => s.weekOverrides)
  const coachPlan = useAppStore((s) => s.coachPlan)

  return useMemo(() => {
    const today = startOfDay(new Date())
    const horizon = addWeeks(today, 4)

    // Pre-build a lookup from coachPlan for O(1) per-date access
    const coachDayMap: Record<string, CoachDay> = {}
    if (coachPlan) {
      for (const week of coachPlan.weeks) {
        for (const day of week.days) {
          coachDayMap[day.date] = day
        }
      }
    }

    const map: Record<string, PlannedActivity[]> = {}
    let current = new Date(start)
    while (current <= end) {
      const dateStr = format(current, 'yyyy-MM-dd')
      const currentDay = startOfDay(current)
      const inCoachPlan = dateStr in coachDayMap

      // Lift the 4-week horizon for dates covered by the coach plan
      if (!inCoachPlan && isAfter(currentDay, horizon)) {
        map[dateStr] = []
        current = addDays(current, 1)
        continue
      }

      const ws = startOfWeek(current, { weekStartsOn: 1 })
      const wsStr = format(ws, 'yyyy-MM-dd')
      const dayIndex = current.getDay() as WeekDayIndex

      // Priority 1: WeekOverride (user manual edits)
      const override = weekOverrides.find((o) => o.weekStart === wsStr)
      if (override && override.days[dayIndex] !== undefined) {
        map[dateStr] = override.days[dayIndex]!
      }
      // Priority 2: CoachPlan (AI-generated, date-specific)
      else if (inCoachPlan) {
        map[dateStr] = coachDayToPlanned(coachDayMap[dateStr])
      }
      // Priority 3: WeekTemplate (repeating fallback)
      else {
        map[dateStr] = weekTemplate.days[dayIndex] ?? []
      }

      current = addDays(current, 1)
    }
    return map
  }, [weekTemplate, weekOverrides, coachPlan, format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd')])
}
