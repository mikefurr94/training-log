import type { StravaActivity, HRStream } from '../store/types'

interface EffortResult {
  score: number        // 0–100
  label: string        // "Easy" | "Moderate" | "Hard" | "Max Effort"
  color: string        // hex color for the score
}

/** Compute percentile rank of `value` within a sorted (ascending) array. Returns 0–100. */
function percentileRank(sorted: number[], value: number): number {
  if (sorted.length === 0) return 50
  let below = 0
  for (const v of sorted) {
    if (v < value) below++
    else break
  }
  return (below / sorted.length) * 100
}

/** Fraction of HR samples above the given threshold (0–1). */
function hrZoneFraction(heartrate: number[], threshold: number): number {
  if (heartrate.length === 0) return 0
  let above = 0
  for (const hr of heartrate) {
    if (hr >= threshold) above++
  }
  return above / heartrate.length
}

export function computeEffortScore(
  activity: StravaActivity,
  allRuns: StravaActivity[],
  streams: HRStream | null,
): EffortResult {
  // Need at least a few runs for meaningful percentiles
  if (allRuns.length < 2) {
    return { score: 50, label: 'Moderate', color: '#f59e0b' }
  }

  // Pre-sort arrays for percentile lookups
  const durations = allRuns.map((r) => r.moving_time).sort((a, b) => a - b)
  const distances = allRuns.map((r) => r.distance).sort((a, b) => a - b)
  const speeds = allRuns.map((r) => r.average_speed).sort((a, b) => a - b)

  const hasHR = activity.average_heartrate != null && activity.average_heartrate > 0
  const runsWithHR = allRuns.filter((r) => r.average_heartrate != null && r.average_heartrate! > 0)
  const avgHRs = runsWithHR.map((r) => r.average_heartrate!).sort((a, b) => a - b)
  const hasHRHistory = hasHR && avgHRs.length >= 2

  const hasStreams = streams != null && streams.heartrate.length > 0

  // Component scores (0–100 each)
  const durationScore = percentileRank(durations, activity.moving_time)
  const distanceScore = percentileRank(distances, activity.distance)
  const paceScore = percentileRank(speeds, activity.average_speed)

  let avgHRScore = 0
  if (hasHRHistory) {
    avgHRScore = percentileRank(avgHRs, activity.average_heartrate!)
  }

  let hrZoneScore = 0
  if (hasStreams) {
    // Use 80% of max observed HR across all runs as the "high zone" threshold
    const maxHRs = allRuns
      .filter((r) => r.max_heartrate != null && r.max_heartrate! > 0)
      .map((r) => r.max_heartrate!)
    const globalMaxHR = maxHRs.length > 0 ? Math.max(...maxHRs) : 190
    const threshold = globalMaxHR * 0.8
    hrZoneScore = hrZoneFraction(streams!.heartrate, threshold) * 100
  }

  // Build weighted score — redistribute weights if HR data is missing
  let weights: { value: number; weight: number }[]

  if (hasHRHistory && hasStreams) {
    weights = [
      { value: durationScore, weight: 0.25 },
      { value: distanceScore, weight: 0.20 },
      { value: paceScore, weight: 0.20 },
      { value: avgHRScore, weight: 0.25 },
      { value: hrZoneScore, weight: 0.10 },
    ]
  } else if (hasHRHistory) {
    weights = [
      { value: durationScore, weight: 0.25 },
      { value: distanceScore, weight: 0.20 },
      { value: paceScore, weight: 0.20 },
      { value: avgHRScore, weight: 0.35 },
    ]
  } else {
    // No HR data at all — use duration, distance, pace only
    weights = [
      { value: durationScore, weight: 0.40 },
      { value: distanceScore, weight: 0.30 },
      { value: paceScore, weight: 0.30 },
    ]
  }

  const raw = weights.reduce((sum, w) => sum + w.value * w.weight, 0)
  const score = Math.round(Math.min(100, Math.max(0, raw)))

  let label: string
  let color: string
  if (score <= 30) {
    label = 'Easy'
    color = '#22c55e'
  } else if (score <= 60) {
    label = 'Moderate'
    color = '#f59e0b'
  } else if (score <= 85) {
    label = 'Hard'
    color = '#f97316'
  } else {
    label = 'Max Effort'
    color = '#ef4444'
  }

  return { score, label, color }
}
