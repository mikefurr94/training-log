import { subDays, format, startOfWeek, addDays, subWeeks } from 'date-fns'
import type { HabitDefinition, HabitCompletions } from '../store/types'

export function calculateStreak(
  habitId: string,
  completions: HabitCompletions,
  fromDate: Date
): { current: number; longest: number } {
  let current = 0
  let longest = 0
  let streak = 0

  // Walk backwards from fromDate for current streak
  for (let i = 0; i < 365; i++) {
    const d = format(subDays(fromDate, i), 'yyyy-MM-dd')
    if ((completions[d] ?? []).includes(habitId)) {
      if (i === current) current++ // only if consecutive from today
      streak++
    } else {
      if (i === current) {
        // current streak broken
      }
      longest = Math.max(longest, streak)
      streak = 0
    }
  }
  longest = Math.max(longest, streak)

  return { current, longest }
}

export function weeklyCompletionRate(
  habitId: string,
  completions: HabitCompletions,
  weekStart: Date
): number {
  let completed = 0
  for (let i = 0; i < 7; i++) {
    const d = format(addDays(weekStart, i), 'yyyy-MM-dd')
    if ((completions[d] ?? []).includes(habitId)) completed++
  }
  return completed / 7
}

export interface HabitWeekStat {
  label: string
  weekOf: string
  rates: Record<string, number> // habitId -> completion rate (0-1)
  overallRate: number
}

export function buildHabitWeekStats(
  habits: HabitDefinition[],
  completions: HabitCompletions,
  weeksBack: number
): HabitWeekStat[] {
  const today = new Date()
  const stats: HabitWeekStat[] = []

  for (let w = weeksBack - 1; w >= 0; w--) {
    const anchor = subWeeks(today, w)
    const ws = startOfWeek(anchor, { weekStartsOn: 1 })
    const rates: Record<string, number> = {}

    for (const habit of habits) {
      rates[habit.id] = weeklyCompletionRate(habit.id, completions, ws)
    }

    const values = Object.values(rates)
    const overallRate = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0

    stats.push({
      label: format(ws, 'MMM d'),
      weekOf: format(ws, 'yyyy-MM-dd'),
      rates,
      overallRate,
    })
  }

  return stats
}
