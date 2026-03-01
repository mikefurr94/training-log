import { useMemo } from 'react'
import { parseISO, isBefore } from 'date-fns'
import { useAppStore } from '../store/useAppStore'
import { mapStravaType } from '../utils/activityColors'
import type { CoachWeek } from '../store/types'

export interface WeekProgress {
  weekNumber: number
  phase: string
  plannedActivities: number
  completedActivities: number
  skippedActivities: number
  plannedMiles: number
  actualMiles: number
  completionRate: number
}

export function useCoachProgress(): {
  weekProgress: WeekProgress[]
  overallCompletionRate: number
  totalPlannedMiles: number
  totalActualMiles: number
} {
  const coachPlan = useAppStore((s) => s.coachPlan)
  const activitiesByDate = useAppStore((s) => s.activitiesByDate)

  return useMemo(() => {
    if (!coachPlan) {
      return { weekProgress: [], overallCompletionRate: 0, totalPlannedMiles: 0, totalActualMiles: 0 }
    }

    const today = new Date()
    const METERS_PER_MILE = 1609.344
    const weekProgress: WeekProgress[] = []
    let totalPlanned = 0
    let totalCompleted = 0

    for (const week of coachPlan.weeks) {
      let plannedCount = 0
      let completedCount = 0
      let skippedCount = 0
      let plannedMiles = 0
      let actualMiles = 0

      for (const day of week.days) {
        const dayDate = parseISO(day.date)
        if (!isBefore(dayDate, today)) continue // Only count past days

        const actualActivities = activitiesByDate[day.date] ?? []

        for (const planned of day.activities) {
          if (planned.type === 'Rest') continue
          plannedCount++

          if (planned.skipped) {
            skippedCount++
            continue
          }

          if (planned.targetDistanceMiles) {
            plannedMiles += planned.targetDistanceMiles
          }

          // Check if there's a matching actual activity
          const matchingActual = actualActivities.find((actual) => {
            const actualType = mapStravaType(actual.sport_type || actual.type)
            return actualType === planned.type
          })

          if (matchingActual) {
            completedCount++
            actualMiles += matchingActual.distance / METERS_PER_MILE
          }
        }
      }

      const completionRate = plannedCount > 0
        ? Math.round((completedCount / plannedCount) * 100)
        : 0

      weekProgress.push({
        weekNumber: week.weekNumber,
        phase: week.phase,
        plannedActivities: plannedCount,
        completedActivities: completedCount,
        skippedActivities: skippedCount,
        plannedMiles: Math.round(plannedMiles * 10) / 10,
        actualMiles: Math.round(actualMiles * 10) / 10,
        completionRate,
      })

      totalPlanned += plannedCount
      totalCompleted += completedCount
    }

    const overallCompletionRate = totalPlanned > 0
      ? Math.round((totalCompleted / totalPlanned) * 100)
      : 0

    return {
      weekProgress,
      overallCompletionRate,
      totalPlannedMiles: Math.round(weekProgress.reduce((s, w) => s + w.plannedMiles, 0) * 10) / 10,
      totalActualMiles: Math.round(weekProgress.reduce((s, w) => s + w.actualMiles, 0) * 10) / 10,
    }
  }, [coachPlan, activitiesByDate])
}
