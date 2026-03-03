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

export type PlannedActivity =
  | { id: string; type: 'Run'; targetDistance: number; targetPace: string; notes?: string }
  | { id: string; type: 'WeightTraining'; workoutType: WorkoutType; notes?: string }
  | { id: string; type: 'Yoga'; notes?: string }
  | { id: string; type: 'Tennis'; notes?: string }
  | { id: string; type: 'Rest'; notes?: string }

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
}

// ── Habit Tracker Types ──────────────────────────────────────────────────────

export interface HabitDefinition {
  id: string
  name: string
  emoji: string
  order: number
}

/** Maps 'YYYY-MM-DD' → array of completed habit IDs */
export type HabitCompletions = Record<string, string[]>

export type HabitView = 'week' | 'grid' | 'dashboard'

// ── Review Types ─────────────────────────────────────────────────────────────

export type ReviewScope = 'week' | 'month' | 'quarter'
export type WeekScore = 'green' | 'yellow' | 'red'

// ── Theme ────────────────────────────────────────────────────────────────────

export type ThemeMode = 'light' | 'dark'

// ── Marathon Coach Types ─────────────────────────────────────────────────────

export type TrainingPhase = 'base' | 'build' | 'peak' | 'taper' | 'race'
export type RaceDistance = 'marathon' | 'half_marathon' | '10k' | '5k'
export type RaceGoal = 'time_target' | 'just_finish' | 'bq' | 'pr'
export type CoachActivityIntensity = 'easy' | 'moderate' | 'hard' | 'recovery'

export interface CoachPlannedActivity {
  id: string
  type: ActivityType
  label: string
  durationMinutes?: number
  targetDistanceMiles?: number
  targetPace?: string
  intensity?: CoachActivityIntensity
  detail?: string
  userModified?: boolean
  userNotes?: string
  skipped?: boolean
}

export interface CoachDay {
  date: string
  dayOfWeek: number
  activities: CoachPlannedActivity[]
  detailGenerated: boolean
}

export interface CoachWeek {
  weekNumber: number
  weekStart: string
  phase: TrainingPhase
  totalMiles: number
  summary: string
  days: CoachDay[]
}

export interface CoachPlan {
  id: string
  athleteId: number
  raceDate: string
  raceDistance: RaceDistance
  raceGoal: RaceGoal
  goalTimeSeconds?: number
  daysPerWeekRun: number
  daysPerWeekStrength: number
  strengthTypes: string[]
  includeYoga: boolean
  fitnessSummary: FitnessSummary | null
  planStartDate: string
  planWeeks: number
  weeks: CoachWeek[]
  status: 'active' | 'completed' | 'archived'
  createdAt: string
  updatedAt: string
}

export interface FitnessSummary {
  recentWeeks: number
  avgWeeklyMiles: number
  avgRunsPerWeek: number
  longestRecentRun: number
  avgPace: string
  avgWeeklyStrengthSessions: number
  avgWeeklyYogaSessions: number
  recentTrend: 'increasing' | 'steady' | 'decreasing'
}

export interface CoachChatMessage {
  id: string
  planId: string
  athleteId: number
  role: 'user' | 'assistant'
  content: string
  planModified: boolean
  createdAt: string
}

export type CoachWizardStep = 'race' | 'goals' | 'schedule' | 'fitness' | 'review'

export interface CoachWizardData {
  raceDate: string
  raceDistance: RaceDistance
  raceGoal: RaceGoal
  goalTimeSeconds?: number
  daysPerWeekRun: number
  daysPerWeekStrength: number
  strengthTypes: string[]
  includeYoga: boolean
}

// ── App Mode ────────────────────────────────────────────────────────────────

export type AppMode = 'calendar' | 'grid' | 'dashboard' | 'planner' | 'review'

export type ActiveApp = 'training' | 'habits'

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

  // Habits
  habits: HabitDefinition[]
  habitCompletions: HabitCompletions
  habitView: HabitView

  // Theme
  theme: ThemeMode

  // Marathon Coach
  coachPlan: CoachPlan | null
  coachLoading: boolean
  coachError: string | null
  coachWizardOpen: boolean
  coachSelectedWeek: number | null
  coachSelectedDate: string | null
  coachCalendarMonth: string | null // 'YYYY-MM-DD' first of month, null = auto

  // Coach Chat
  coachChatOpen: boolean
  coachChatMessages: CoachChatMessage[]
  coachChatLoading: boolean
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

  // Habits
  toggleHabitCompletion: (date: string, habitId: string) => void
  setHabitCompletions: (completions: Record<string, string[]>) => void
  loadPlanFromDb: (data: Record<string, unknown>) => void
  addHabit: (habit: HabitDefinition) => void
  removeHabit: (id: string) => void
  reorderHabits: (habits: HabitDefinition[]) => void
  setHabitView: (view: HabitView) => void

  // Theme
  toggleTheme: () => void

  // Marathon Coach
  setCoachPlan: (plan: CoachPlan | null) => void
  setCoachLoading: (loading: boolean) => void
  setCoachError: (error: string | null) => void
  setCoachWizardOpen: (open: boolean) => void
  setCoachSelectedWeek: (weekNumber: number | null) => void
  setCoachSelectedDate: (date: string | null) => void
  setCoachCalendarMonth: (month: string | null) => void
  navigateCoachCalendar: (direction: 'prev' | 'next') => void
  updateCoachDay: (date: string, activities: CoachPlannedActivity[]) => void
  markDayDetailGenerated: (date: string, detail: string, activityId: string) => void
  skipCoachActivity: (date: string, activityId: string) => void

  // Coach Chat
  openCoachChat: () => void
  closeCoachChat: () => void
  setCoachChatMessages: (messages: CoachChatMessage[]) => void
  addCoachChatMessage: (message: CoachChatMessage) => void
  setCoachChatLoading: (loading: boolean) => void
}

export type AppStore = AppState & AppActions
