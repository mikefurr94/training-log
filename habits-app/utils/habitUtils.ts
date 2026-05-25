import { subDays, format, startOfWeek, addDays, subWeeks } from 'date-fns'
import type { HabitDefinition, HabitCounts } from '../store/types'

export function calculateStreak(
  habit: HabitDefinition,
  counts: HabitCounts,
  fromDate: Date
): { current: number; longest: number } {
  const target = habit.dailyTarget ?? 1
  let current = 0
  let longest = 0
  let streak = 0

  for (let i = 0; i < 365; i++) {
    const d = format(subDays(fromDate, i), 'yyyy-MM-dd')
    const done = (counts[d]?.[habit.id] ?? 0) >= target
    if (done) {
      if (i === current) current++
      streak++
    } else {
      longest = Math.max(longest, streak)
      streak = 0
    }
  }
  longest = Math.max(longest, streak)

  return { current, longest }
}

export function weeklyCompletionRate(
  habit: HabitDefinition,
  counts: HabitCounts,
  weekStart: Date,
): number {
  const target = habit.dailyTarget ?? 1
  if (habit.frequency === 'weekly') {
    const key = format(weekStart, 'yyyy-MM-dd')
    return (counts[key]?.[habit.id] ?? 0) >= target ? 1 : 0
  }
  let completed = 0
  for (let i = 0; i < 7; i++) {
    const d = format(addDays(weekStart, i), 'yyyy-MM-dd')
    if ((counts[d]?.[habit.id] ?? 0) >= target) completed++
  }
  return completed / 7
}

export interface HabitWeekStat {
  label: string
  weekOf: string
  rates: Record<string, number>
  overallRate: number
}

export function buildHabitWeekStats(
  habits: HabitDefinition[],
  counts: HabitCounts,
  weeksBack: number
): HabitWeekStat[] {
  const today = new Date()
  const stats: HabitWeekStat[] = []

  for (let w = weeksBack - 1; w >= 0; w--) {
    const anchor = subWeeks(today, w)
    const ws = startOfWeek(anchor, { weekStartsOn: 1 })
    const rates: Record<string, number> = {}

    for (const habit of habits) {
      rates[habit.id] = weeklyCompletionRate(habit, counts, ws)
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
