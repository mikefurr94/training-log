export type ActivityType = 'Run' | 'WeightTraining' | 'Yoga' | 'Tennis' | 'Rest' | 'Other'

export interface ActivityColor {
  bg: string
  light: string
  border: string
  text: string
  label: string
  emoji: string
  hex: string // raw hex for canvas/svg use
}

export const ACTIVITY_COLORS: Record<ActivityType, ActivityColor> = {
  Run: {
    bg: 'var(--color-run)',
    light: 'var(--color-run-light)',
    border: 'var(--color-run-border)',
    text: '#ffffff',
    label: 'Run',
    emoji: '🏃',
    hex: '#6366f1',
  },
  WeightTraining: {
    bg: 'var(--color-weight)',
    light: 'var(--color-weight-light)',
    border: 'var(--color-weight-border)',
    text: '#ffffff',
    label: 'Weights',
    emoji: '🏋️',
    hex: '#0891b2',
  },
  Yoga: {
    bg: 'var(--color-yoga)',
    light: 'var(--color-yoga-light)',
    border: 'var(--color-yoga-border)',
    text: '#ffffff',
    label: 'Yoga',
    emoji: '🧘',
    hex: '#8b5cf6',
  },
  Tennis: {
    bg: 'var(--color-tennis)',
    light: 'var(--color-tennis-light)',
    border: 'var(--color-tennis-border)',
    text: '#ffffff',
    label: 'Tennis',
    emoji: '🎾',
    hex: '#f59e0b',
  },
  Rest: {
    bg: 'var(--color-rest)',
    light: 'var(--color-rest-light)',
    border: 'var(--color-rest-border)',
    text: '#ffffff',
    label: 'Rest',
    emoji: '😴',
    hex: '#ec4899',
  },
  Other: {
    bg: '#9ca3af',
    light: '#f9fafb',
    border: '#e5e7eb',
    text: '#ffffff',
    label: 'Activity',
    emoji: '⚡',
    hex: '#9ca3af',
  },
}

// Map Strava's activity type strings to our simplified ActivityType
const STRAVA_TYPE_MAP: Record<string, ActivityType> = {
  Run: 'Run',
  TrailRun: 'Run',
  VirtualRun: 'Run',
  Treadmill: 'Run',
  WeightTraining: 'WeightTraining',
  Workout: 'WeightTraining',
  CrossFit: 'WeightTraining',
  Yoga: 'Yoga',
  Pilates: 'Yoga',
  Stretching: 'Yoga',
  Tennis: 'Tennis',
  Squash: 'Tennis',
  Racquetball: 'Tennis',
  Badminton: 'Tennis',
  Pickleball: 'Tennis',
  TableTennis: 'Tennis',
}

export function mapStravaType(stravaType: string): ActivityType {
  return STRAVA_TYPE_MAP[stravaType] ?? 'Other'
}

export function getActivityColor(type: ActivityType): ActivityColor {
  return ACTIVITY_COLORS[type] ?? ACTIVITY_COLORS.Other
}

export const ALL_ACTIVITY_TYPES: ActivityType[] = ['Run', 'WeightTraining', 'Yoga', 'Tennis', 'Rest']
