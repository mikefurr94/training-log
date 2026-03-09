import type { PlannedActivity, PlanMatchResult, PlanStatus } from '../store/types'
import type { StravaActivity } from '../store/types'
import { mapStravaType } from './activityColors'

// ── Pace helpers ─────────────────────────────────────────────────────────────

/** Parse "MM:SS" pace string → seconds */
export function paceStringToSeconds(pace: string): number {
  const parts = pace.split(':')
  if (parts.length !== 2) return 0
  const minutes = parseInt(parts[0], 10) || 0
  const seconds = parseInt(parts[1], 10) || 0
  return minutes * 60 + seconds
}

/** Convert m/s → seconds per mile */
export function speedToSecondsPerMile(mps: number): number {
  if (mps <= 0) return 0
  const milesPerSecond = mps / 1609.344
  return 1 / milesPerSecond
}

/** Convert m/s → seconds per km */
export function speedToSecondsPerKm(mps: number): number {
  if (mps <= 0) return 0
  const kmPerSecond = mps / 1000
  return 1 / kmPerSecond
}

/** Format seconds → "MM:SS" */
export function secondsToPaceString(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// ── Race distance constants ───────────────────────────────────────────────────

/** Distance in miles for each race preset */
export const RACE_DISTANCE_MILES: Record<string, number> = {
  '5K': 3.10686,
  '10 Miler': 10,
  'Half Marathon': 13.10937,
  'Marathon': 26.21875,
}

/** Parse "H:MM:SS" or "M:SS" goal time string → total seconds */
export function parseGoalTimeToSeconds(time: string): number {
  const parts = time.split(':').map((p) => parseInt(p, 10) || 0)
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return 0
}

/** Format total seconds → "H:MM:SS" string */
export function secondsToGoalTimeString(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = Math.round(totalSeconds % 60)
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

/** Given a pace string ("MM:SS /mi") and distance in miles, return a goal time string ("H:MM:SS") */
export function calcGoalTime(paceStr: string, distanceMiles: number): string {
  const paceSec = paceStringToSeconds(paceStr)
  if (paceSec <= 0 || distanceMiles <= 0) return ''
  return secondsToGoalTimeString(Math.round(paceSec * distanceMiles))
}

/** Given a goal time string ("H:MM:SS") and distance in miles, return a pace string ("MM:SS") */
export function calcPaceFromGoalTime(goalTimeStr: string, distanceMiles: number): string {
  const totalSec = parseGoalTimeToSeconds(goalTimeStr)
  if (totalSec <= 0 || distanceMiles <= 0) return ''
  return secondsToPaceString(Math.round(totalSec / distanceMiles))
}

// ── Status display ────────────────────────────────────────────────────────────

export const STATUS_ICONS: Record<PlanStatus, string> = {
  completed: '✅',
  partial: '⚠️',
  missed: '❌',
  unplanned: '',
}

export const STATUS_COLORS: Record<PlanStatus, { bg: string; text: string; border: string }> = {
  completed: { bg: 'var(--color-status-completed-bg)', text: 'var(--color-status-completed-text)', border: 'var(--color-status-completed-border)' },
  partial:   { bg: 'var(--color-status-partial-bg)', text: 'var(--color-status-partial-text)', border: 'var(--color-status-partial-border)' },
  missed:    { bg: 'var(--color-status-missed-bg)', text: 'var(--color-status-missed-text)', border: 'var(--color-status-missed-border)' },
  unplanned: { bg: 'transparent', text: 'var(--color-text-tertiary)', border: 'transparent' },
}

// ── Label helpers ─────────────────────────────────────────────────────────────

export function getPlannedActivityLabel(planned: PlannedActivity): string {
  switch (planned.type) {
    case 'Run':
      return `Run ${planned.targetDistance}mi @ ${planned.targetPace}/mi`
    case 'WeightTraining':
      return `${planned.workoutType}`
    case 'Yoga':
      return 'Yoga'
    case 'Tennis':
      return 'Tennis'
    case 'Rest':
      return 'Rest'
    case 'Race': {
      const parts: string[] = [planned.name || 'Race']
      if (planned.distance) parts.push(planned.distance)
      if (planned.targetPace) parts.push(`${planned.targetPace}/mi`)
      if (planned.goalTime) parts.push(planned.goalTime)
      return parts.join(' · ')
    }
    default:
      return ''
  }
}

export function getPlannedActivityEmoji(planned: PlannedActivity): string {
  switch (planned.type) {
    case 'Run': return '🏃'
    case 'WeightTraining': return '🏋️'
    case 'Yoga': return '🧘'
    case 'Tennis': return '🎾'
    case 'Rest': return '😴'
    case 'Race': return '🏁'
    default: return ''
  }
}

// ── Matching logic ────────────────────────────────────────────────────────────

// Distance tolerance for "partial" — only kicks in if they ran significantly short
const DISTANCE_PARTIAL_THRESHOLD = 0.85 // below 85% of target = partial (not complete)
const PACE_TOLERANCE_SECONDS = 30 // 30s/mi — only used for tracking notes, not status

/**
 * Determine the status of one planned activity against the day's actuals.
 * Rules:
 *  - Run: completed if distance ≥ 85% of target (pace is shown as tracking info only)
 *         partial if ran but < 85% of target distance
 *         missed if no run at all
 *  - WeightTraining/Yoga/Tennis: completed if matching type found, missed otherwise
 *  - Rest: completed if no activities, partial if they did something anyway
 */
export function getPlanStatus(
  planned: PlannedActivity,
  actuals: StravaActivity[]
): PlanMatchResult {
  if (planned.type === 'Rest') {
    const hasAnyActivity = actuals.length > 0
    return {
      planned,
      status: hasAnyActivity ? 'partial' : 'completed',
      notes: hasAnyActivity ? 'Activity on rest day' : undefined,
    }
  }

  if (planned.type === 'Run') {
    const runs = actuals.filter((a) => mapStravaType(a.sport_type || a.type) === 'Run')
    if (runs.length === 0) {
      return { planned, status: 'missed' }
    }

    // Pick best run (longest by distance)
    const best = runs.reduce((a, b) => (a.distance > b.distance ? a : b))

    const targetDistanceMeters = planned.targetDistance * 1609.344
    const distanceRatio = best.distance / targetDistanceMeters

    // Distance determines complete vs partial — pace is info only
    const distanceOk = distanceRatio >= DISTANCE_PARTIAL_THRESHOLD
    const status: PlanStatus = distanceOk ? 'completed' : 'partial'

    const notes: string[] = []
    const actualMi = best.distance / 1609.344
    notes.push(`${actualMi.toFixed(1)}mi`)

    if (best.average_speed > 0) {
      const actualPaceSec = speedToSecondsPerMile(best.average_speed)
      notes.push(`${secondsToPaceString(actualPaceSec)}/mi`)
    }

    return {
      planned,
      status,
      actualActivityId: best.id,
      notes: notes.join(' · '),
    }
  }

  // Race — match any Run activity on race day
  if (planned.type === 'Race') {
    const runs = actuals.filter((a) => mapStravaType(a.sport_type || a.type) === 'Run')
    if (runs.length > 0) {
      return { planned, status: 'completed', actualActivityId: runs[0].id }
    }
    return { planned, status: 'missed' }
  }

  // WeightTraining, Yoga, Tennis — match by type
  const matching = actuals.filter(
    (a) => mapStravaType(a.sport_type || a.type) === planned.type
  )

  if (matching.length > 0) {
    return { planned, status: 'completed', actualActivityId: matching[0].id }
  }

  return { planned, status: 'missed' }
}

/**
 * Match a list of planned activities against actual Strava activities for the day.
 * Returns one PlanMatchResult per planned activity.
 */
export function matchActualToPlanned(
  planned: PlannedActivity[],
  actuals: StravaActivity[]
): PlanMatchResult[] {
  return planned.map((p) => getPlanStatus(p, actuals))
}
