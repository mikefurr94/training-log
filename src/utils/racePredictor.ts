import type { StravaActivity } from '../store/types'
import { metersToMiles } from './formatters'
import {
  subMonths, startOfWeek, eachWeekOfInterval, format, parseISO, isWithinInterval,
  endOfWeek, eachDayOfInterval,
} from 'date-fns'

// ── Race Distances ──────────────────────────────────────────────────────────

export interface RaceDistance {
  name: string
  shortName: string
  meters: number
}

export const RACE_DISTANCES: RaceDistance[] = [
  { name: '5K',             shortName: '5K',   meters: 5000 },
  { name: '10 Miler',       shortName: '10mi', meters: 16093.4 },
  { name: 'Half Marathon',  shortName: 'Half', meters: 21097.5 },
  { name: 'Marathon',       shortName: 'Full', meters: 42195 },
]

// ── Types ───────────────────────────────────────────────────────────────────

export interface QualifyingRun {
  activity: StravaActivity
  vdot: number
}

export interface RacePrediction {
  distance: RaceDistance
  predictedTime: number   // seconds
  predictedPace: number   // seconds per mile
  confidence: 'high' | 'medium' | 'low'
}

export interface TrainingMetrics {
  weeklyMileageAvg: number
  totalRuns: number
  longestRunMiles: number
}

export interface PredictionResult {
  predictions: RacePrediction[]
  bestEfforts: QualifyingRun[]
  metrics: TrainingMetrics
  referenceVdot: number
}

export interface WeeklyTrendPoint {
  week: string        // 'MMM d' label
  weekDate: string    // ISO date
  predictedTime: number | null  // seconds, null if insufficient data
}

// ── VDOT Calculation (Jack Daniels) ─────────────────────────────────────────

/**
 * Calculate VDOT from a run's distance (meters) and time (seconds).
 * Uses the Daniels/Gilbert oxygen cost and % VO2max formulas.
 */
export function calculateVDOT(distanceMeters: number, timeSeconds: number): number {
  const t = timeSeconds / 60 // duration in minutes
  const v = distanceMeters / t // velocity in m/min

  // Oxygen cost of running at velocity v
  const vo2 = -4.60 + 0.182258 * v + 0.000104 * v * v

  // Fraction of VO2max sustainable for duration t
  const pctVo2max = 0.8 + 0.1894393 * Math.exp(-0.012778 * t) +
    0.2989558 * Math.exp(-0.1932605 * t)

  const vdot = vo2 / pctVo2max
  return vdot
}

/**
 * Predict race time (seconds) for a given VDOT and target distance.
 * Uses bisection search since the VDOT equation is not analytically invertible.
 */
export function predictTimeFromVDOT(vdot: number, targetDistanceMeters: number): number {
  // Search bounds: from world-class pace (~6 m/s) to slow jog (~2 m/s)
  let lo = targetDistanceMeters / 6.5 // fastest plausible (seconds)
  let hi = targetDistanceMeters / 1.8 // slowest plausible (seconds)

  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2
    const computedVdot = calculateVDOT(targetDistanceMeters, mid)

    if (Math.abs(computedVdot - vdot) < 0.01) return mid

    // Higher VDOT = faster = less time, so if computed VDOT is too high, time is too short
    if (computedVdot > vdot) {
      lo = mid // need more time (slower)
    } else {
      hi = mid // need less time (faster)
    }
  }

  return (lo + hi) / 2
}

// ── Riegel's Formula ────────────────────────────────────────────────────────

export function riegelPredict(
  knownDistanceMeters: number,
  knownTimeSeconds: number,
  targetDistanceMeters: number,
): number {
  // Use 1.045 exponent (closer to COROS/Garmin) instead of original 1.06
  // 1.06 over-penalizes longer distances; 1.045 better matches real-world performance
  return knownTimeSeconds * Math.pow(targetDistanceMeters / knownDistanceMeters, 1.045)
}

// ── Trail Run Elevation Adjustment ──────────────────────────────────────────

/**
 * Adjust a trail run's effective time by subtracting an elevation penalty.
 * Approximation: ~12 seconds per mile per 100 ft of elevation gain per mile.
 */
function getElevationAdjustedTime(activity: StravaActivity): number {
  const distMiles = metersToMiles(activity.distance)
  if (distMiles <= 0) return activity.moving_time

  const elevGainFt = activity.total_elevation_gain * 3.28084
  const gainPerMile = elevGainFt / distMiles
  // 12 seconds penalty per 100ft gain per mile, applied per mile
  const penaltyPerMile = (gainPerMile / 100) * 12
  const totalPenalty = penaltyPerMile * distMiles

  const adjusted = activity.moving_time - totalPenalty
  // Don't let adjustment make it unreasonably fast
  return Math.max(adjusted, activity.moving_time * 0.75)
}

// ── Run Qualification ───────────────────────────────────────────────────────

const RUN_STRAVA_TYPES = new Set(['Run', 'TrailRun', 'VirtualRun', 'Treadmill'])

function isRunType(activity: StravaActivity): boolean {
  return RUN_STRAVA_TYPES.has(activity.sport_type || activity.type)
}

function isTrailRun(activity: StravaActivity): boolean {
  return (activity.sport_type || activity.type) === 'TrailRun'
}

export function isQualifyingRun(activity: StravaActivity): boolean {
  if (!isRunType(activity)) return false
  if (activity.distance < 1600) return false     // at least ~1 mile
  if (activity.moving_time < 600) return false    // at least 10 minutes
  // Pace check: faster than 15 min/mile (~1.79 m/s)
  const speed = activity.distance / activity.moving_time
  if (speed < 1.79) return false
  return true
}

// ── Training Volume Adjustment ──────────────────────────────────────────────

function getVolumeAdjustment(weeklyMilesAvg: number, distance: RaceDistance): number {
  // Reduced volume penalties to align with COROS/Garmin approach.
  // These platforms focus on physiological capacity (VO2max) with minimal volume penalties.
  if (distance.meters === 42195) {
    // Marathon — only penalize very low volume
    if (weeklyMilesAvg < 20) return 1.04
    if (weeklyMilesAvg < 30) return 1.01
    if (weeklyMilesAvg >= 50) return 0.99
    return 1.0
  }
  if (distance.meters === 21097.5) {
    // Half Marathon
    if (weeklyMilesAvg < 15) return 1.02
    return 1.0
  }
  // 10 Miler & 5K — no volume adjustment (fitness-based prediction)
  return 1.0
}

// ── Confidence ──────────────────────────────────────────────────────────────

function calculateConfidence(
  qualifyingRuns: QualifyingRun[],
  weeklyMilesAvg: number,
  distance: RaceDistance,
): 'high' | 'medium' | 'low' {
  if (qualifyingRuns.length < 2) return 'low'

  const vdots = qualifyingRuns.map((r) => r.vdot)
  const mean = vdots.reduce((a, b) => a + b, 0) / vdots.length
  const variance = vdots.reduce((sum, v) => sum + (v - mean) ** 2, 0) / vdots.length
  const stdDev = Math.sqrt(variance)

  // Volume thresholds per distance
  const minVolume = distance.meters === 42195 ? 30
    : distance.meters === 21097.5 ? 20
    : 10

  if (qualifyingRuns.length >= 3 && stdDev < 1.5 && weeklyMilesAvg >= minVolume) return 'high'
  if (qualifyingRuns.length >= 2 && weeklyMilesAvg >= minVolume * 0.6) return 'medium'
  return 'low'
}

// ── Core Prediction Generator ───────────────────────────────────────────────

function getRunsInWindow(
  activitiesByDate: Record<string, StravaActivity[]>,
  windowStart: Date,
  windowEnd: Date,
): StravaActivity[] {
  const runs: StravaActivity[] = []
  const days = eachDayOfInterval({ start: windowStart, end: windowEnd })
  for (const day of days) {
    const key = format(day, 'yyyy-MM-dd')
    const acts = activitiesByDate[key] ?? []
    for (const a of acts) {
      if (isQualifyingRun(a)) {
        runs.push(a)
      }
    }
  }
  return runs
}

function computeWeeklyMileage(
  activitiesByDate: Record<string, StravaActivity[]>,
  windowStart: Date,
  windowEnd: Date,
): number {
  let totalMiles = 0
  let weeksWithRuns = 0
  const weeks = eachWeekOfInterval({ start: windowStart, end: windowEnd }, { weekStartsOn: 1 })

  for (const weekStart of weeks) {
    const weekEnd_ = endOfWeek(weekStart, { weekStartsOn: 1 })
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd_ })
    let weekMiles = 0
    for (const day of days) {
      const key = format(day, 'yyyy-MM-dd')
      const acts = activitiesByDate[key] ?? []
      for (const a of acts) {
        if (isRunType(a)) {
          weekMiles += metersToMiles(a.distance)
        }
      }
    }
    totalMiles += weekMiles
    if (weekMiles > 0) weeksWithRuns++
  }

  return weeksWithRuns > 0 ? totalMiles / weeksWithRuns : 0
}

function buildQualifyingRuns(runs: StravaActivity[]): QualifyingRun[] {
  return runs.map((activity) => {
    const time = isTrailRun(activity)
      ? getElevationAdjustedTime(activity)
      : activity.moving_time
    const vdot = calculateVDOT(activity.distance, time)
    return { activity, vdot }
  }).filter((r) => r.vdot >= 15 && r.vdot <= 85) // clamp unrealistic values
    .sort((a, b) => b.vdot - a.vdot)
}

/**
 * Generate race predictions from activity data.
 * @param activitiesByDate - all activities keyed by date
 * @param asOfDate - compute predictions as of this date (default: today)
 * @param vo2maxOverride - optional manual VO2Max entry (e.g. from COROS watch)
 */
export function generatePredictions(
  activitiesByDate: Record<string, StravaActivity[]>,
  asOfDate?: Date,
  vo2maxOverride?: number | null,
): PredictionResult | null {
  const endDate = asOfDate ?? new Date()
  const startDate = subMonths(endDate, 6)

  const runs = getRunsInWindow(activitiesByDate, startDate, endDate)

  // If VO2Max override is provided, we can generate predictions even with fewer runs
  const hasOverride = typeof vo2maxOverride === 'number' && vo2maxOverride > 0
  if (!hasOverride && runs.length < 2) return null

  const qualifyingRuns = buildQualifyingRuns(runs)
  if (!hasOverride && qualifyingRuns.length < 2) return null

  // Use 75th percentile of top 5 VDOT scores (like COROS/Garmin — emphasis on best efforts)
  const topN = qualifyingRuns.slice(0, Math.min(5, qualifyingRuns.length))
  const sorted = [...topN].sort((a, b) => a.vdot - b.vdot)
  const p75Index = Math.min(Math.floor(sorted.length * 0.75), sorted.length - 1)
  const calculatedVdot = sorted.length > 0 ? sorted[p75Index].vdot : 0

  // When VO2Max override is set, convert to effective VDOT.
  // Watch VO2Max (COROS/Garmin) is raw physiological capacity; VDOT factors in
  // running economy. For most runners, VDOT ≈ VO2Max × 0.875.
  // e.g. COROS VO2Max 61 → effective VDOT ~53.4 → matches COROS race predictions.
  const VO2MAX_TO_VDOT_FACTOR = 0.875
  const referenceVdot = hasOverride
    ? vo2maxOverride! * VO2MAX_TO_VDOT_FACTOR
    : calculatedVdot

  // Best effort for Riegel (only if we have qualifying runs)
  const hasBestEffort = qualifyingRuns.length > 0
  const bestEffort = hasBestEffort ? qualifyingRuns[0] : null
  const bestEffortTime = bestEffort
    ? (isTrailRun(bestEffort.activity)
        ? getElevationAdjustedTime(bestEffort.activity)
        : bestEffort.activity.moving_time)
    : 0

  const weeklyMilesAvg = computeWeeklyMileage(activitiesByDate, startDate, endDate)

  // Find longest run
  let longestRunMiles = 0
  for (const r of runs) {
    const miles = metersToMiles(r.distance)
    if (miles > longestRunMiles) longestRunMiles = miles
  }

  const predictions: RacePrediction[] = RACE_DISTANCES.map((distance) => {
    // VDOT-based prediction (primary — always available with override or calculated)
    const vdotTime = predictTimeFromVDOT(referenceVdot, distance.meters)

    // If we have a best effort, blend with Riegel; otherwise use pure VDOT
    let blendedTime: number
    if (bestEffort) {
      const riegelTime = riegelPredict(
        bestEffort.activity.distance,
        bestEffortTime,
        distance.meters,
      )
      // Blend: 80% VDOT, 20% Riegel (COROS/Garmin lean heavily on VO2max-based prediction)
      blendedTime = vdotTime * 0.8 + riegelTime * 0.2
    } else {
      // Pure VDOT prediction when using override with no run data
      blendedTime = vdotTime
    }

    // Apply volume adjustment
    blendedTime *= getVolumeAdjustment(weeklyMilesAvg, distance)

    const predictedPace = blendedTime / metersToMiles(distance.meters) // seconds per mile

    return {
      distance,
      predictedTime: Math.round(blendedTime),
      predictedPace,
      confidence: hasOverride ? 'high' as const : calculateConfidence(topN, weeklyMilesAvg, distance),
    }
  })

  return {
    predictions,
    bestEfforts: topN.slice(0, 5),
    metrics: {
      weeklyMileageAvg: Math.round(weeklyMilesAvg * 10) / 10,
      totalRuns: runs.length,
      longestRunMiles: Math.round(longestRunMiles * 10) / 10,
    },
    referenceVdot: Math.round(referenceVdot * 10) / 10,
  }
}

// ── Weekly Trend ────────────────────────────────────────────────────────────

/**
 * Compute weekly trend of predicted times for a specific race distance.
 * Each data point represents the prediction as of that week using a trailing 6-month window.
 */
export function generateWeeklyTrend(
  activitiesByDate: Record<string, StravaActivity[]>,
  distanceIndex: number,
  vo2maxOverride?: number | null,
): WeeklyTrendPoint[] {
  const today = new Date()
  const trendStart = subMonths(today, 6)
  const weeks = eachWeekOfInterval({ start: trendStart, end: today }, { weekStartsOn: 1 })

  return weeks.map((weekStart) => {
    const weekEnd_ = endOfWeek(weekStart, { weekStartsOn: 1 })
    // Use the end of this week (or today if it's the current week) as the "as of" date
    const asOf = weekEnd_ > today ? today : weekEnd_

    const result = generatePredictions(activitiesByDate, asOf, vo2maxOverride)
    const prediction = result?.predictions[distanceIndex] ?? null

    return {
      week: format(weekStart, 'MMM d'),
      weekDate: format(weekStart, 'yyyy-MM-dd'),
      predictedTime: prediction?.predictedTime ?? null,
    }
  })
}

// ── Goal Time Parsing ───────────────────────────────────────────────────────

/** Parse a goal time string like "22:00" or "3:45:00" into seconds */
export function parseGoalTime(str: string): number | null {
  const parts = str.trim().split(':').map(Number)
  if (parts.some(isNaN)) return null
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return null
}

/** Format seconds into goal time string "MM:SS" or "H:MM:SS" */
export function formatGoalTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}
