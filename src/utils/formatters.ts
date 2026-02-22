export type DistanceUnit = 'mi' | 'km'

const METERS_PER_MILE = 1609.344
const METERS_PER_KM = 1000

export function metersToMiles(meters: number): number {
  return meters / METERS_PER_MILE
}

export function metersToKm(meters: number): number {
  return meters / METERS_PER_KM
}

export function formatDistance(meters: number, unit: DistanceUnit = 'mi'): string {
  if (!meters || meters === 0) return '—'
  const val = unit === 'mi' ? metersToMiles(meters) : metersToKm(meters)
  return `${val.toFixed(2)} ${unit}`
}

export function formatDistanceShort(meters: number, unit: DistanceUnit = 'mi'): string {
  if (!meters || meters === 0) return '—'
  const val = unit === 'mi' ? metersToMiles(meters) : metersToKm(meters)
  return `${val.toFixed(1)} ${unit}`
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds === 0) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${m}:${String(s).padStart(2, '0')}`
}

// Pace from meters/second → "MM:SS /unit"
export function formatPace(metersPerSecond: number, unit: DistanceUnit = 'mi'): string {
  if (!metersPerSecond || metersPerSecond === 0) return '—'
  const metersPerUnit = unit === 'mi' ? METERS_PER_MILE : METERS_PER_KM
  const secondsPerUnit = metersPerUnit / metersPerSecond
  const minutes = Math.floor(secondsPerUnit / 60)
  const seconds = Math.floor(secondsPerUnit % 60)
  return `${minutes}:${String(seconds).padStart(2, '0')} /${unit}`
}

// From split elapsed_time and distance
export function splitPace(distanceMeters: number, elapsedSeconds: number, unit: DistanceUnit = 'mi'): string {
  if (!distanceMeters || !elapsedSeconds) return '—'
  const speed = distanceMeters / elapsedSeconds
  return formatPace(speed, unit)
}

export function formatHeartRate(bpm: number | undefined | null): string {
  if (bpm == null || bpm === 0) return '—'
  return `${Math.round(bpm)} bpm`
}

export function formatElevation(meters: number, unit: DistanceUnit = 'mi'): string {
  if (!meters || meters === 0) return '0 ft'
  if (unit === 'mi') {
    return `${Math.round(meters * 3.28084)} ft`
  }
  return `${Math.round(meters)} m`
}

export function formatCalories(calories: number | undefined | null): string {
  if (!calories) return '—'
  return `${Math.round(calories)} kcal`
}
