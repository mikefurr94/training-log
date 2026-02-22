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
 * Returns an array of 7 WeekPlanDay entries (Sun–Sat) for the week
 * containing the given anchor date, merging the template with any override.
 *
 * Subscribes directly to weekTemplate + weekOverrides so it re-renders
 * immediately whenever either changes.
 */
export function useWeekPlan(anchor: Date): WeekPlanDay[] {
  // Subscribe to both reactive slices so any edit triggers a re-render
  const weekTemplate = useAppStore((s) => s.weekTemplate)
  const weekOverrides = useAppStore((s) => s.weekOverrides)

  return useMemo(() => {
    const weekStart = startOfWeek(anchor, { weekStartsOn: 1 })
    const weekStartStr = format(weekStart, 'yyyy-MM-dd')

    // Merge: override takes precedence per-day over template
    const override = weekOverrides.find((o) => o.weekStart === weekStartStr)
    const merged = { ...weekTemplate.days } as Record<WeekDayIndex, PlannedActivity[]>
    if (override) {
      for (const dayStr of Object.keys(override.days)) {
        const dayIdx = Number(dayStr) as WeekDayIndex
        const overrideDay = override.days[dayIdx]
        if (overrideDay !== undefined) {
          merged[dayIdx] = overrideDay
        }
      }
    }

    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i)
      const dayIndex = date.getDay() as WeekDayIndex  // real JS day: Mon=1…Sun=0
      return {
        date,
        dayIndex,
        activities: merged[dayIndex] ?? [],
      }
    })
  }, [weekTemplate, weekOverrides, format(startOfWeek(anchor, { weekStartsOn: 1 }), 'yyyy-MM-dd')])
}
