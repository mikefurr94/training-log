import type { ActivityType } from '../utils/activityColors'
import type { CalendarView } from '../utils/dateUtils'
export type { ActivityType, CalendarView }

export interface StravaAthlete {
  id: number
  firstname: string
  lastname: string
  profile_medium: string
  profile: string
  city: string
  state: string
  country: string
  sex: string
  premium: boolean
}

export interface StravaActivity {
  id: number
  name: string
  type: string
  sport_type: string
  start_date: string
  start_date_local: string
  distance: number
  moving_time: number
  elapsed_time: number
  total_elevation_gain: number
  average_speed: number
  max_speed: number
  average_heartrate?: number
  max_heartrate?: number
  average_watts?: number
  kilojoules?: number
  calories?: number
  map?: {
    summary_polyline: string
  }
}

export interface Split {
  distance: number
  elapsed_time: number
  elevation_difference: number
  moving_time: number
  split: number
  average_speed: number
  average_heartrate?: number
  average_grade_adjusted_speed?: number
  pace_zone?: number
}

export interface SegmentEffort {
  id: number
  name: string
  elapsed_time: number
  moving_time: number
  distance: number
  average_heartrate?: number
  max_heartrate?: number
  kom_rank?: number
  pr_rank?: number
}

export interface StravaActivityDetail extends StravaActivity {
  description?: string
  splits_metric: Split[]
  splits_standard: Split[]
  segment_efforts: SegmentEffort[]
  perceived_exertion?: number
  suffer_score?: number
}

export interface HRStream {
  heartrate: number[]
  time: number[]
  distance: number[]
}

export interface FetchedRange {
  start: string // ISO date string
  end: string
}

// ── Weekly Planning Types ────────────────────────────────────────────────────

export type WorkoutType =
  | 'Upper Body'
  | 'Lower Body'
  | 'Full Body'
  | 'Core'
  | 'Push'
  | 'Pull'
  | 'Legs'

export type WeekDayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 // 0 = Sunday

// ── Planned Activities ──────────────────────────────────────────────────────

export interface PlannedExercise {
  name: string           // e.g. "Barbell Squat", "Dumbbell Row"
  sets: number
  reps: string           // e.g. "8-10", "12", "30sec"
  notes?: string         // e.g. "moderate weight", "each side"
}

export type PlannedActivity =
  | { id: string; type: 'Run'; targetDistance: number; targetPace: string; notes?: string }
  | { id: string; type: 'WeightTraining'; workoutType: WorkoutType; exercises?: PlannedExercise[]; notes?: string }
  | { id: string; type: 'Yoga'; notes?: string }
  | { id: string; type: 'Tennis'; notes?: string }
  | { id: string; type: 'Rest'; notes?: string }
  | { id: string; type: 'Race'; name?: string; distance?: string; goalTime?: string; targetPace?: string; notes?: string }

export interface WeekTemplate {
  days: Record<WeekDayIndex, PlannedActivity[]>
}

export interface WeekOverride {
  weekStart: string // ISO 'YYYY-MM-DD' of Sunday
  days: Partial<Record<WeekDayIndex, PlannedActivity[]>>
}

export type PlanStatus = 'completed' | 'partial' | 'missed' | 'unplanned'

export interface PlanMatchResult {
  planned: PlannedActivity
  status: PlanStatus
  actualActivityId?: number
  notes?: string
}

// ── Key Dates ────────────────────────────────────────────────────────────────

export type KeyDateType = 'race' | 'event'

export interface KeyDate {
  id: string
  date: string // 'YYYY-MM-DD'
  name: string
  type: KeyDateType
  distance?: string   // e.g. 'Marathon', 'Half Marathon', '10K', '5K', or custom
  goalTime?: string   // e.g. '1:45:00' in HH:MM:SS format
}

// ── Habit Tracker Types ──────────────────────────────────────────────────────

export type HabitFrequency = 'daily' | 'weekly'

export interface HabitDefinition {
  id: string
  name: string
  emoji: string
  order: number
  notes?: string
  archived?: boolean
  weeklyGoal?: number        // completions per week to consider goal met (1-7 for daily, 1 for weekly)
  frequency?: HabitFrequency // defaults to 'daily'
  color?: string             // hex color for grid display; falls back to palette if unset
}

/** Maps 'YYYY-MM-DD' → array of completed habit IDs */
export type HabitCompletions = Record<string, string[]>

export type HabitView = 'week' | 'grid' | 'dashboard'

// ── Review Types ─────────────────────────────────────────────────────────────

export type ReviewScope = 'week' | 'month' | 'quarter'
export type WeekScore = 'green' | 'yellow' | 'red'

// ── Theme ────────────────────────────────────────────────────────────────────

export type ThemeMode = 'light' | 'dark'

// ── App Mode ────────────────────────────────────────────────────────────────

export type AppMode = 'calendar' | 'grid' | 'dashboard' | 'review'

export type ActiveApp = 'training' | 'habits' | 'coach'

export type CoachView = 'chat' | 'plan' | 'intake'

// ── Coach Plan Types ────────────────────────────────────────────────────────

export interface CoachPlanPreferences {
  runDaysPerWeek: number
  liftDaysPerWeek: number
  planWeeks: number
  currentWeeklyMileage?: number
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced'
  notes?: string
}

export interface CoachPlanWeek {
  weekNumber: number
  weekStart: string          // 'YYYY-MM-DD'
  label: string              // 'Base Building', 'Speed Work', 'Taper', etc.
  days: Record<WeekDayIndex, PlannedActivity[]>
}

export interface CoachPlan {
  id: string
  athleteId: number
  name: string
  raceName?: string
  raceDate?: string
  raceDistance?: string
  goalTime?: string
  preferences: CoachPlanPreferences
  weeks: CoachPlanWeek[]
  status: 'active' | 'archived'
  conversationId?: string
  createdAt: string
  updatedAt: string
}

// ── Reflection Types ────────────────────────────────────────────────────────

export interface ChartSpec {
  type: 'bar' | 'line' | 'area'
  title: string
  data: Array<Record<string, string | number>>
  xKey: string
  series: Array<{ dataKey: string; label: string; color: string }>
  xLabel?: string
  yLabel?: string
}

export interface ReflectionConversation {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

export interface ReflectionMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  charts?: ChartSpec[]
  createdAt: string
}

// ── Store ────────────────────────────────────────────────────────────────────

export interface AppState {
  // Auth
  accessToken: string | null
  refreshToken: string | null
  tokenExpiresAt: number | null
  athlete: StravaAthlete | null

  // App mode
  activeApp: ActiveApp
  appMode: AppMode
  coachView: CoachView

  // Calendar navigation
  currentView: CalendarView
  anchorDate: string // ISO date string (serializable for Zustand persist)

  // Activity filters
  enabledTypes: ActivityType[]

  // Fetched data
  activitiesByDate: Record<string, StravaActivity[]> // key = 'YYYY-MM-DD'
  fetchedRanges: FetchedRange[]

  // Detail panel
  selectedActivityId: number | null
  activityDetails: Record<number, StravaActivityDetail>
  activityStreams: Record<number, HRStream>
  isPanelOpen: boolean

  // Planned activity panel
  selectedPlannedActivity: PlannedActivity | null
  selectedPlannedDate: string | null // 'YYYY-MM-DD'
  isPlannedPanelOpen: boolean

  // UI
  isLoading: boolean
  error: string | null

  // Unit preference
  distanceUnit: 'mi' | 'km'

  // Plan overlay
  showPlan: boolean

  // Weekly planning
  weekTemplate: WeekTemplate
  weekOverrides: WeekOverride[]

  // Key dates
  keyDates: KeyDate[]
  editingKeyDate: KeyDate | null      // key date being edited, or null
  editingKeyDateDefault: string | null // default date for new key date modal

  // Habits
  habits: HabitDefinition[]
  habitCompletions: HabitCompletions
  habitView: HabitView
  selectedHabitId: string | null

  // Coach plan
  coachPlan: CoachPlan | null

  // Theme
  theme: ThemeMode
}

export interface AppActions {
  // Auth
  setToken: (access: string, refresh: string, expiresAt: number) => void
  setAthlete: (athlete: StravaAthlete) => void
  updateTokens: (access: string, refresh: string, expiresAt: number) => void
  logout: () => void

  // Navigation
  setView: (view: CalendarView) => void
  setAnchorDate: (date: Date) => void
  navigate: (direction: 'prev' | 'next') => void
  goToToday: () => void

  // Filters
  toggleActivityType: (type: ActivityType) => void

  // Data
  addActivities: (activities: StravaActivity[]) => void
  markRangeFetched: (start: Date, end: Date) => void
  isRangeFetched: (start: Date, end: Date) => boolean
  setActivityDetail: (id: number, detail: StravaActivityDetail) => void
  setActivityStreams: (id: number, streams: HRStream) => void

  // Panel
  selectActivity: (id: number) => void
  closePanel: () => void

  // Planned activity panel
  openPlannedPanel: (activity: PlannedActivity, date: string) => void
  closePlannedPanel: () => void
  updatePlannedInPanel: (activity: PlannedActivity) => void

  // UI
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  // App mode
  setActiveApp: (app: ActiveApp) => void
  setAppMode: (mode: AppMode) => void
  setCoachView: (view: CoachView) => void

  // Coach plan
  setCoachPlan: (plan: CoachPlan | null) => void
  updateCoachPlanWeek: (weekNumber: number, days: Partial<Record<WeekDayIndex, PlannedActivity[]>>, label?: string) => void

  // Settings
  setDistanceUnit: (unit: 'mi' | 'km') => void

  // Plan overlay
  toggleShowPlan: () => void

  // Weekly planning
  setDayTemplate: (day: WeekDayIndex, activities: PlannedActivity[]) => void
  setDayOverride: (weekStart: Date, day: WeekDayIndex, activities: PlannedActivity[]) => void
  clearDayOverride: (weekStart: Date, day: WeekDayIndex) => void
  movePlannedActivity: (fromDate: string, toDate: string, activityId: string) => void
  clearWeekOverride: (weekStart: Date) => void
  getWeekPlan: (weekStart: Date) => Record<WeekDayIndex, PlannedActivity[]>

  // Key dates
  addKeyDate: (keyDate: KeyDate) => void
  updateKeyDate: (id: string, updates: Partial<Omit<KeyDate, 'id'>>) => void
  deleteKeyDate: (id: string) => void
  openKeyDateModal: (keyDate?: KeyDate, defaultDate?: string) => void
  closeKeyDateModal: () => void

  // Add new planned activity from calendar
  addNewPlannedActivity: (dateStr: string) => void

  // Habits
  toggleHabitCompletion: (date: string, habitId: string) => void
  setHabitCompletions: (completions: Record<string, string[]>) => void
  loadPlanFromDb: (data: Record<string, unknown>) => void
  addHabit: (habit: HabitDefinition) => void
  removeHabit: (id: string) => void
  reorderHabits: (habits: HabitDefinition[]) => void
  setHabitView: (view: HabitView) => void
  setSelectedHabitId: (id: string | null) => void
  updateHabit: (id: string, updates: Partial<HabitDefinition>) => void
  moveHabit: (id: string, direction: 'up' | 'down') => void

  // Theme
  toggleTheme: () => void
}

export type AppStore = AppState & AppActions
