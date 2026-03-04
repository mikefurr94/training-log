import type { StravaActivity, FitnessSummary, CoachPlannedActivity, CoachDay, PlannedActivity, WorkoutType } from '../store/types'
import { mapStravaType } from './activityColors'
import { startOfWeek, subWeeks, format, parseISO } from 'date-fns'

const METERS_PER_MILE = 1609.344

export function buildFitnessSummary(
  activitiesByDate: Record<string, StravaActivity[]>,
  weeksBack = 8
): FitnessSummary {
  const today = new Date()
  const cutoff = subWeeks(startOfWeek(today, { weekStartsOn: 1 }), weeksBack)
  const cutoffStr = format(cutoff, 'yyyy-MM-dd')

  const weeklyMiles: number[] = Array(weeksBack).fill(0)
  const weeklyRuns: number[] = Array(weeksBack).fill(0)
  const weeklyStrength: number[] = Array(weeksBack).fill(0)
  const weeklyYoga: number[] = Array(weeksBack).fill(0)
  let totalPaceSum = 0
  let totalPaceCount = 0
  let longestRun = 0

  for (const [dateStr, activities] of Object.entries(activitiesByDate)) {
    if (dateStr < cutoffStr) continue
    const date = parseISO(dateStr)
    const weekStart = startOfWeek(date, { weekStartsOn: 1 })
    const weeksSinceStart = Math.floor(
      (weekStart.getTime() - cutoff.getTime()) / (7 * 24 * 60 * 60 * 1000)
    )
    if (weeksSinceStart < 0 || weeksSinceStart >= weeksBack) continue

    for (const activity of activities) {
      const type = mapStravaType(activity.sport_type || activity.type)
      if (type === 'Run') {
        const miles = activity.distance / METERS_PER_MILE
        weeklyMiles[weeksSinceStart] += miles
        weeklyRuns[weeksSinceStart]++
        if (miles > longestRun) longestRun = miles
        if (activity.average_speed > 0) {
          totalPaceSum += activity.average_speed
          totalPaceCount++
        }
      } else if (type === 'WeightTraining') {
        weeklyStrength[weeksSinceStart]++
      } else if (type === 'Yoga') {
        weeklyYoga[weeksSinceStart]++
      }
    }
  }

  const nonZeroWeeks = weeklyMiles.filter((m) => m > 0).length || 1
  const avgWeeklyMiles = weeklyMiles.reduce((a, b) => a + b, 0) / nonZeroWeeks
  const avgRunsPerWeek = weeklyRuns.reduce((a, b) => a + b, 0) / nonZeroWeeks

  // Calculate pace
  let avgPace = '--'
  if (totalPaceCount > 0) {
    const avgSpeed = totalPaceSum / totalPaceCount
    const secPerMile = METERS_PER_MILE / avgSpeed
    const min = Math.floor(secPerMile / 60)
    const sec = Math.floor(secPerMile % 60)
    avgPace = `${min}:${String(sec).padStart(2, '0')}/mi`
  }

  // Trend: compare first half vs second half of weeks
  const half = Math.floor(weeksBack / 2)
  const firstHalf = weeklyMiles.slice(0, half).reduce((a, b) => a + b, 0) / half
  const secondHalf = weeklyMiles.slice(half).reduce((a, b) => a + b, 0) / (weeksBack - half)
  const recentTrend: FitnessSummary['recentTrend'] =
    secondHalf > firstHalf * 1.1 ? 'increasing' :
    secondHalf < firstHalf * 0.9 ? 'decreasing' : 'steady'

  return {
    recentWeeks: weeksBack,
    avgWeeklyMiles: Math.round(avgWeeklyMiles * 10) / 10,
    avgRunsPerWeek: Math.round(avgRunsPerWeek * 10) / 10,
    longestRecentRun: Math.round(longestRun * 10) / 10,
    avgPace,
    avgWeeklyStrengthSessions: Math.round(weeklyStrength.reduce((a, b) => a + b, 0) / nonZeroWeeks * 10) / 10,
    avgWeeklyYogaSessions: Math.round(weeklyYoga.reduce((a, b) => a + b, 0) / nonZeroWeeks * 10) / 10,
    recentTrend,
  }
}

export const RACE_DISTANCE_LABELS: Record<string, string> = {
  marathon: 'Marathon (26.2 mi)',
  half_marathon: 'Half Marathon (13.1 mi)',
  '10k': '10K (6.2 mi)',
  '5k': '5K (3.1 mi)',
}

export const RACE_GOAL_LABELS: Record<string, string> = {
  time_target: 'Target Time',
  just_finish: 'Just Finish',
  bq: 'Boston Qualify',
  pr: 'Personal Record',
}

export const PHASE_COLORS: Record<string, string> = {
  base: '#3b82f6',
  build: '#10b981',
  peak: '#f59e0b',
  taper: '#8b5cf6',
  race: '#ef4444',
}

export const PHASE_LABELS: Record<string, string> = {
  base: 'Base',
  build: 'Build',
  peak: 'Peak',
  taper: 'Taper',
  race: 'Race',
}

export function formatGoalTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function parseGoalTime(str: string): number | undefined {
  const parts = str.split(':').map(Number)
  if (parts.some(isNaN)) return undefined
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return undefined
}

// ── Coach → Training Calendar Conversion ──────────────────────────────────────

const WORKOUT_TYPE_KEYWORDS: [string, WorkoutType][] = [
  ['upper', 'Upper Body'],
  ['lower', 'Lower Body'],
  ['full body', 'Full Body'],
  ['core', 'Core'],
  ['push', 'Push'],
  ['pull', 'Pull'],
  ['leg', 'Legs'],
]

export function inferWorkoutType(label: string): WorkoutType {
  const lower = label.toLowerCase()
  for (const [keyword, type] of WORKOUT_TYPE_KEYWORDS) {
    if (lower.includes(keyword)) return type
  }
  return 'Full Body'
}

function buildNotes(label: string, detail?: string): string | undefined {
  const parts = [label, detail].filter(Boolean)
  const result = parts.join(' — ')
  return result || undefined
}

export function coachToPlanned(activity: CoachPlannedActivity): PlannedActivity | null {
  if (activity.skipped) return null

  switch (activity.type) {
    case 'Run':
      return {
        id: activity.id,
        type: 'Run',
        targetDistance: activity.targetDistanceMiles ?? 0,
        targetPace: activity.targetPace ?? '',
        notes: buildNotes(activity.label, activity.detail),
      }
    case 'WeightTraining':
      return {
        id: activity.id,
        type: 'WeightTraining',
        workoutType: inferWorkoutType(activity.label),
        notes: buildNotes(activity.label, activity.detail),
      }
    case 'Yoga':
      return {
        id: activity.id,
        type: 'Yoga',
        notes: buildNotes(activity.label, activity.detail),
      }
    case 'Rest':
      return {
        id: activity.id,
        type: 'Rest',
      }
    default:
      return null
  }
}

export function coachDayToPlanned(day: CoachDay): PlannedActivity[] {
  return day.activities
    .map(coachToPlanned)
    .filter((a): a is PlannedActivity => a !== null)
}
