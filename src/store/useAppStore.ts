import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { format, parseISO, startOfWeek } from 'date-fns'
import { navigateAnchor } from '../utils/dateUtils'
import type {
  AppStore,
  ActivityType,
  StravaActivity,
  StravaActivityDetail,
  HRStream,
  StravaAthlete,
  AppMode,
  WeekTemplate,
  WeekOverride,
  WeekDayIndex,
  PlannedActivity,
  KeyDate,
  HabitDefinition,
  HabitView,
  ActiveApp,
  ThemeMode,
} from './types'
import type { CalendarView } from '../utils/dateUtils'

const DEFAULT_ENABLED_TYPES: ActivityType[] = ['Run', 'WeightTraining', 'Yoga', 'Tennis']

const DEFAULT_HABITS: HabitDefinition[] = [
  { id: 'journal',    name: 'Journaling',    emoji: '📓', order: 0 },
  { id: 'meditate',   name: 'Meditation',    emoji: '🧘', order: 1 },
  { id: 'stretch',    name: 'Stretching',    emoji: '🤸', order: 2 },
  { id: 'probiotics', name: 'Probiotics',    emoji: '💊', order: 3 },
  { id: 'protein',    name: 'Protein shake', emoji: '🥤', order: 4 },
]

function makeEmptyTemplate(): WeekTemplate {
  return {
    days: {
      0: [],
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
    },
  }
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // ── Auth ──────────────────────────────────────────────────────────
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      athlete: null,

      setToken: (access, refresh, expiresAt) =>
        set({ accessToken: access, refreshToken: refresh, tokenExpiresAt: expiresAt }),

      setAthlete: (athlete: StravaAthlete) => set({ athlete }),

      updateTokens: (access, refresh, expiresAt) =>
        set({ accessToken: access, refreshToken: refresh, tokenExpiresAt: expiresAt }),

      logout: () =>
        set({
          accessToken: null,
          refreshToken: null,
          tokenExpiresAt: null,
          athlete: null,
          activitiesByDate: {},
          fetchedRanges: [],
          selectedActivityId: null,
          activityDetails: {},
          activityStreams: {},
          isPanelOpen: false,
          error: null,
        }),

      // ── App mode ─────────────────────────────────────────────────────
      activeApp: 'training' as ActiveApp,
      setActiveApp: (app: ActiveApp) => set({ activeApp: app }),

      appMode: 'calendar' as AppMode,
      setAppMode: (mode: AppMode) => set({ appMode: mode }),

      // ── Calendar navigation ───────────────────────────────────────────
      currentView: 'month',
      anchorDate: format(new Date(), 'yyyy-MM-dd'),

      setView: (view: CalendarView) => {
        set({ currentView: view })
      },

      setAnchorDate: (date: Date) => {
        set({ anchorDate: format(date, 'yyyy-MM-dd') })
      },

      navigate: (direction) => {
        const { currentView, anchorDate } = get()
        const anchor = parseISO(anchorDate)
        const newAnchor = navigateAnchor(currentView, anchor, direction)
        set({ anchorDate: format(newAnchor, 'yyyy-MM-dd') })
      },

      goToToday: () => {
        set({ anchorDate: format(new Date(), 'yyyy-MM-dd') })
      },

      // ── Activity filters ──────────────────────────────────────────────
      enabledTypes: DEFAULT_ENABLED_TYPES,

      toggleActivityType: (type: ActivityType) => {
        const { enabledTypes } = get()
        if (enabledTypes.includes(type)) {
          // Don't allow deselecting all types
          if (enabledTypes.length === 1) return
          set({ enabledTypes: enabledTypes.filter((t) => t !== type) })
        } else {
          set({ enabledTypes: [...enabledTypes, type] })
        }
      },

      // ── Fetched data ──────────────────────────────────────────────────
      activitiesByDate: {},
      fetchedRanges: [],

      addActivities: (activities: StravaActivity[]) => {
        const { activitiesByDate } = get()
        const updated = { ...activitiesByDate }

        // Ignore Walk activities everywhere in the app
        const IGNORED_TYPES = new Set(['Walk', 'Hike'])

        for (const activity of activities) {
          const stravaType = activity.sport_type || activity.type
          if (IGNORED_TYPES.has(stravaType)) continue

          const dateKey = activity.start_date_local.slice(0, 10) // 'YYYY-MM-DD'
          if (!updated[dateKey]) {
            updated[dateKey] = []
          }
          // Deduplicate by ID
          if (!updated[dateKey].find((a) => a.id === activity.id)) {
            updated[dateKey] = [...updated[dateKey], activity]
          }
        }

        set({ activitiesByDate: updated })
      },

      markRangeFetched: (start: Date, end: Date) => {
        const { fetchedRanges } = get()
        set({
          fetchedRanges: [
            ...fetchedRanges,
            {
              start: format(start, 'yyyy-MM-dd'),
              end: format(end, 'yyyy-MM-dd'),
            },
          ],
        })
      },

      isRangeFetched: (start: Date, end: Date) => {
        const { fetchedRanges } = get()
        const startStr = format(start, 'yyyy-MM-dd')
        const endStr = format(end, 'yyyy-MM-dd')
        return fetchedRanges.some((r) => r.start <= startStr && r.end >= endStr)
      },

      activityDetails: {},
      activityStreams: {},

      setActivityDetail: (id: number, detail: StravaActivityDetail) => {
        set((state) => ({
          activityDetails: { ...state.activityDetails, [id]: detail },
        }))
      },

      setActivityStreams: (id: number, streams: HRStream) => {
        set((state) => ({
          activityStreams: { ...state.activityStreams, [id]: streams },
        }))
      },

      // ── Detail panel ──────────────────────────────────────────────────
      selectedActivityId: null,
      isPanelOpen: false,

      selectActivity: (id: number) => {
        set({ selectedActivityId: id, isPanelOpen: true })
      },

      closePanel: () => {
        set({ isPanelOpen: false, selectedActivityId: null })
      },

      // ── UI ────────────────────────────────────────────────────────────
      isLoading: false,
      error: null,

      setLoading: (loading: boolean) => set({ isLoading: loading }),
      setError: (error: string | null) => set({ error }),

      // ── Settings ──────────────────────────────────────────────────────
      distanceUnit: 'mi',
      setDistanceUnit: (unit) => set({ distanceUnit: unit }),

      // ── Weekly planning ───────────────────────────────────────────────
      weekTemplate: makeEmptyTemplate(),
      weekOverrides: [],

      setDayTemplate: (day: WeekDayIndex, activities: PlannedActivity[]) => {
        const { weekTemplate } = get()
        set({
          weekTemplate: {
            days: {
              ...weekTemplate.days,
              [day]: activities,
            },
          },
        })
      },

      setDayOverride: (weekStart: Date, day: WeekDayIndex, activities: PlannedActivity[]) => {
        const { weekOverrides } = get()
        const weekStartStr = format(
          startOfWeek(weekStart, { weekStartsOn: 1 }),
          'yyyy-MM-dd'
        )
        const existing = weekOverrides.find((o) => o.weekStart === weekStartStr)
        if (existing) {
          set({
            weekOverrides: weekOverrides.map((o) =>
              o.weekStart === weekStartStr
                ? { ...o, days: { ...o.days, [day]: activities } }
                : o
            ),
          })
        } else {
          set({
            weekOverrides: [
              ...weekOverrides,
              { weekStart: weekStartStr, days: { [day]: activities } },
            ],
          })
        }
      },

      clearWeekOverride: (weekStart: Date) => {
        const { weekOverrides } = get()
        const weekStartStr = format(
          startOfWeek(weekStart, { weekStartsOn: 1 }),
          'yyyy-MM-dd'
        )
        set({
          weekOverrides: weekOverrides.filter((o) => o.weekStart !== weekStartStr),
        })
      },

      getWeekPlan: (weekStart: Date): Record<WeekDayIndex, PlannedActivity[]> => {
        const { weekTemplate, weekOverrides } = get()
        const weekStartStr = format(
          startOfWeek(weekStart, { weekStartsOn: 1 }),
          'yyyy-MM-dd'
        )
        const override = weekOverrides.find((o) => o.weekStart === weekStartStr)

        // Merge: override.days takes precedence per-day over template.days
        const merged = { ...weekTemplate.days } as Record<WeekDayIndex, PlannedActivity[]>
        if (override) {
          for (const dayStr of Object.keys(override.days)) {
            const dayIdx = Number(dayStr) as WeekDayIndex
            const overrideDay = override.days[dayIdx]
            if (overrideDay !== undefined) {
              merged[dayIdx] = overrideDay
            }
          }
        }
        return merged
      },

      // ── Key dates ──────────────────────────────────────────────────────────
      keyDates: [],

      addKeyDate: (keyDate: KeyDate) =>
        set((s) => ({ keyDates: [...s.keyDates, keyDate] })),

      updateKeyDate: (id: string, updates: Partial<Omit<KeyDate, 'id'>>) =>
        set((s) => ({
          keyDates: s.keyDates.map((kd) => (kd.id === id ? { ...kd, ...updates } : kd)),
        })),

      deleteKeyDate: (id: string) =>
        set((s) => ({ keyDates: s.keyDates.filter((kd) => kd.id !== id) })),

      // ── Habits ─────────────────────────────────────────────────────────────
      habits: DEFAULT_HABITS,
      habitCompletions: {},
      habitView: 'week' as HabitView,

      toggleHabitCompletion: (date: string, habitId: string) =>
        set((s) => {
          const existing = s.habitCompletions[date] ?? []
          const updated = existing.includes(habitId)
            ? existing.filter((id) => id !== habitId)
            : [...existing, habitId]
          return { habitCompletions: { ...s.habitCompletions, [date]: updated } }
        }),

      setHabitCompletions: (completions: Record<string, string[]>) =>
        set({ habitCompletions: completions }),

      loadPlanFromDb: (data: Record<string, unknown>) =>
        set({
          weekTemplate: (data.weekTemplate as WeekTemplate) ?? {},
          weekOverrides: (data.weekOverrides as WeekOverride[]) ?? [],
          keyDates: (data.keyDates as KeyDate[]) ?? [],
        }),

      addHabit: (habit: HabitDefinition) =>
        set((s) => ({ habits: [...s.habits, habit] })),

      removeHabit: (id: string) =>
        set((s) => ({ habits: s.habits.filter((h) => h.id !== id) })),

      reorderHabits: (habits: HabitDefinition[]) => set({ habits }),

      setHabitView: (view: HabitView) => set({ habitView: view }),

      // ── Theme ──────────────────────────────────────────────────────────────
      theme: 'light' as ThemeMode,

      toggleTheme: () =>
        set((s) => {
          const newTheme = s.theme === 'light' ? 'dark' : 'light'
          document.documentElement.setAttribute('data-theme', newTheme)
          return { theme: newTheme }
        }),
    }),
    {
      name: 'training-log-store',
      // Only persist auth state + preferences + planning data; activity data re-fetched on load
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        tokenExpiresAt: state.tokenExpiresAt,
        athlete: state.athlete,
        currentView: state.currentView,
        activeApp: state.activeApp,
        appMode: state.appMode,
        distanceUnit: state.distanceUnit,
        enabledTypes: state.enabledTypes,
        weekTemplate: state.weekTemplate,
        weekOverrides: state.weekOverrides,
        keyDates: state.keyDates,
        habits: state.habits,
        habitCompletions: state.habitCompletions,
        habitView: state.habitView,
        theme: state.theme,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.theme) {
          document.documentElement.setAttribute('data-theme', state.theme)
        }
      },
    }
  )
)
