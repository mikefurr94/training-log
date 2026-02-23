import { useState, useMemo } from 'react'
import { startOfWeek, addWeeks, addDays, format, parseISO, isToday, isBefore, startOfDay } from 'date-fns'
import { useAppStore } from '../store/useAppStore'
import { useWeekPlan } from '../hooks/useWeekPlan'
import { useIsMobile } from '../hooks/useIsMobile'
import { getPlannedActivityEmoji, getPlannedActivityLabel } from '../utils/planningUtils'
import DayPlanColumn from '../components/planning/DayPlanColumn'
import PlannedActivityItem from '../components/planning/PlannedActivityItem'
import ActivityPlanModal from '../components/planning/ActivityPlanModal'
import type { WeekDayIndex, PlannedActivity } from '../store/types'

// Mon-Sun day order to match Monday-start weeks (JS dayIndex: Mon=1...Sat=6, Sun=0)
const MON_TO_SUN_ORDER: WeekDayIndex[] = [1, 2, 3, 4, 5, 6, 0]
const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function PlannerPage() {
  const plannerAnchor = useAppStore((s) => s.plannerAnchor)
  const plannerView = useAppStore((s) => s.plannerView)
  const isMobile = useIsMobile()

  const anchor = parseISO(plannerAnchor)
  const padding = isMobile ? 8 : 16

  return (
    <div style={{
      height: '100%',
      padding,
      overflow: isMobile ? 'auto' : 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {plannerView === 'week' && (
        <WeekSection
          weekStart={startOfWeek(anchor, { weekStartsOn: 1 })}
          isMobile={isMobile}
        />
      )}
      {plannerView === 'month' && (
        <PlannerForwardView isMobile={isMobile} />
      )}
      {plannerView === 'template' && (
        <TemplateSection isMobile={isMobile} />
      )}
    </div>
  )
}

// ── Forward-looking view: current week + next 3 weeks ───────────────────────

function PlannerForwardView({ isMobile }: { isMobile: boolean }) {
  const today = startOfDay(new Date())
  const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 })
  const weekTemplate = useAppStore((s) => s.weekTemplate)
  const weekOverrides = useAppStore((s) => s.weekOverrides)

  // Build 4 weeks: current week + next 3
  const weeks = useMemo(() => {
    return Array.from({ length: 4 }, (_, i) => {
      const weekStart = addWeeks(currentWeekStart, i)
      return Array.from({ length: 7 }, (_, d) => addDays(weekStart, d))
    })
  }, [currentWeekStart.getTime()])

  // Build a map of date → planned activities for all 4 weeks
  const planByDate = useMemo(() => {
    const map: Record<string, PlannedActivity[]> = {}
    for (const week of weeks) {
      const weekStart = startOfWeek(week[0], { weekStartsOn: 1 })
      const weekStartStr = format(weekStart, 'yyyy-MM-dd')
      const override = weekOverrides.find((o) => o.weekStart === weekStartStr)
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
      for (const date of week) {
        const dayIndex = date.getDay() as WeekDayIndex
        map[format(date, 'yyyy-MM-dd')] = merged[dayIndex] ?? []
      }
    }
    return map
  }, [weeks, weekTemplate, weekOverrides])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Day-of-week headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 4,
        marginBottom: 4,
      }}>
        {DAY_HEADERS.map((d) => (
          <div key={d} style={{
            fontSize: 'var(--font-size-xs)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-text-tertiary)',
            textAlign: 'center',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            padding: '4px 0',
          }}>
            {d}
          </div>
        ))}
      </div>

      {/* 4-week grid */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateRows: 'repeat(4, 1fr)',
        gap: 4,
      }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 4,
          }}>
            {week.map((date) => {
              const key = format(date, 'yyyy-MM-dd')
              const isPast = isBefore(startOfDay(date), today)
              const activities = isPast ? [] : (planByDate[key] ?? [])
              return (
                <PlannerDayCell
                  key={key}
                  date={date}
                  activities={activities}
                  isPast={isPast}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Day cell for planner forward view ────────────────────────────────────────

function PlannerDayCell({
  date,
  activities,
  isPast,
}: {
  date: Date
  activities: PlannedActivity[]
  isPast: boolean
}) {
  const setDayOverride = useAppStore((s) => s.setDayOverride)
  const weekTemplate = useAppStore((s) => s.weekTemplate)
  const weekOverrides = useAppStore((s) => s.weekOverrides)

  const [showModal, setShowModal] = useState(false)
  const [editingActivity, setEditingActivity] = useState<PlannedActivity | null>(null)

  const today = isToday(date)
  const dayIndex = date.getDay() as WeekDayIndex
  const overrideWeekStart = startOfWeek(date, { weekStartsOn: 1 })

  function getCurrentActivities(): PlannedActivity[] {
    const weekStartStr = format(overrideWeekStart, 'yyyy-MM-dd')
    const override = weekOverrides.find((o) => o.weekStart === weekStartStr)
    if (override && override.days[dayIndex] !== undefined) {
      return override.days[dayIndex]!
    }
    return weekTemplate.days[dayIndex] ?? []
  }

  function save(updated: PlannedActivity[]) {
    setDayOverride(overrideWeekStart, dayIndex, updated)
  }

  function handleAdd(activity: PlannedActivity) {
    save([...getCurrentActivities(), activity])
    setShowModal(false)
  }

  function handleEdit(activity: PlannedActivity) {
    save(getCurrentActivities().map((a) => (a.id === activity.id ? activity : a)))
    setEditingActivity(null)
  }

  function handleDelete(id: string) {
    save(getCurrentActivities().filter((a) => a.id !== id))
  }

  const MAX_BADGES = 3
  const visible = activities.slice(0, MAX_BADGES)
  const overflow = activities.length - MAX_BADGES

  return (
    <>
      <div
        style={{
          padding: '6px 8px',
          background: today
            ? 'var(--color-today-bg)'
            : isPast
            ? 'var(--color-outside-month)'
            : 'var(--color-surface)',
          borderRadius: 'var(--radius-sm)',
          opacity: isPast ? 0.45 : 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          minHeight: 90,
          transition: 'background var(--transition-fast)',
          overflow: 'hidden',
        }}
      >
        {/* Date number + month label for first day or month boundary */}
        <div style={{
          fontSize: 'var(--font-size-sm)',
          fontWeight: today ? 'var(--font-weight-bold)' : 'var(--font-weight-medium)',
          color: today ? 'var(--color-accent)' : isPast ? 'var(--color-text-tertiary)' : 'var(--color-text-secondary)',
          lineHeight: 1,
          letterSpacing: '-0.1px',
          flexShrink: 0,
        }}>
          {today ? (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: 'var(--color-accent)',
              color: '#fff',
              fontSize: 'var(--font-size-xs)',
              fontWeight: 'var(--font-weight-bold)',
            }}>
              {format(date, 'd')}
            </span>
          ) : (
            // Show "Mar 1" for the 1st of a month, otherwise just the day number
            format(date, date.getDate() === 1 ? 'MMM d' : 'd')
          )}
        </div>

        {/* Planned activity badges */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
          {visible.map((activity) => (
            <PlannerBadge
              key={activity.id}
              activity={activity}
              onEdit={() => setEditingActivity(activity)}
              onDelete={() => handleDelete(activity.id)}
            />
          ))}
          {overflow > 0 && (
            <div style={{
              fontSize: 10,
              color: 'var(--color-text-tertiary)',
              padding: '1px 4px',
              fontWeight: 500,
            }}>
              +{overflow} more
            </div>
          )}
        </div>

        {/* Add button — only for today and future */}
        {!isPast && (
          <button
            onClick={() => setShowModal(true)}
            style={{
              width: '100%',
              padding: '3px 0',
              borderRadius: 'var(--radius-sm)',
              background: 'transparent',
              border: '1px dashed var(--color-border)',
              color: 'var(--color-text-tertiary)',
              fontSize: 10,
              cursor: 'pointer',
              fontWeight: 500,
              transition: 'all var(--transition-fast)',
              flexShrink: 0,
              marginTop: 'auto',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-accent)'
              e.currentTarget.style.color = 'var(--color-accent)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)'
              e.currentTarget.style.color = 'var(--color-text-tertiary)'
            }}
          >
            + Add
          </button>
        )}
      </div>

      {showModal && (
        <ActivityPlanModal
          onSave={handleAdd}
          onClose={() => setShowModal(false)}
        />
      )}
      {editingActivity && (
        <ActivityPlanModal
          initial={editingActivity}
          onSave={handleEdit}
          onClose={() => setEditingActivity(null)}
        />
      )}
    </>
  )
}

// ── Compact badge for planner month view (matches calendar ActivityBadge) ───

const PLAN_TYPE_COLORS: Record<string, { light: string; bg: string; border: string; emoji: string; label: string }> = {
  Run:            { light: 'var(--color-run-light)',    bg: 'var(--color-run)',    border: 'var(--color-run-border)',    emoji: '🏃', label: 'Run' },
  WeightTraining: { light: 'var(--color-weight-light)', bg: 'var(--color-weight)', border: 'var(--color-weight-border)', emoji: '🏋️', label: 'Weights' },
  Yoga:           { light: 'var(--color-yoga-light)',   bg: 'var(--color-yoga)',   border: 'var(--color-yoga-border)',   emoji: '🧘', label: 'Yoga' },
  Tennis:         { light: 'var(--color-tennis-light)', bg: 'var(--color-tennis)', border: 'var(--color-tennis-border)', emoji: '🎾', label: 'Tennis' },
  Rest:           { light: 'var(--color-border-light)', bg: 'var(--color-text-tertiary)', border: 'var(--color-border)', emoji: '😴', label: 'Rest' },
}

function PlannerBadge({
  activity,
  onEdit,
  onDelete,
}: {
  activity: PlannedActivity
  onEdit: () => void
  onDelete: () => void
}) {
  const colors = PLAN_TYPE_COLORS[activity.type] ?? PLAN_TYPE_COLORS.Rest

  let label = colors.label
  if (activity.type === 'Run') {
    label = `${activity.targetDistance}mi`
  } else if (activity.type === 'WeightTraining') {
    label = activity.workoutType
  }

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onEdit() }}
      title={getPlannedActivityLabel(activity)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        width: '100%',
        background: colors.light,
        border: `1px solid ${colors.border}`,
        borderRadius: 5,
        padding: '3px 7px',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all var(--transition-fast)',
        overflow: 'hidden',
        minWidth: 0,
      }}
    >
      <span style={{ fontSize: 11, flexShrink: 0 }}>{colors.emoji}</span>
      <span style={{
        fontSize: 'var(--font-size-xs)',
        fontWeight: 'var(--font-weight-medium)',
        color: colors.bg,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        minWidth: 0,
        lineHeight: 1.2,
        letterSpacing: '-0.1px',
      }}>
        {label}
      </span>
    </button>
  )
}

// ── Template section ────────────────────────────────────────────────────────

function TemplateSection({ isMobile }: { isMobile: boolean }) {
  const weekTemplate = useAppStore((s) => s.weekTemplate)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
      <div style={{
        fontSize: 'var(--font-size-xs)',
        color: 'var(--color-text-tertiary)',
        padding: isMobile ? '4px 4px' : '4px 0',
      }}>
        Your default plan — repeats every week unless you customize a specific week.
      </div>
      <WeekGrid
        days={MON_TO_SUN_ORDER.map((dayIndex) => ({
          dayIndex,
          date: new Date(0),
          activities: weekTemplate.days[dayIndex] ?? [],
        }))}
        overrideWeekStart={undefined}
        showDate={false}
        isMobile={isMobile}
      />
    </div>
  )
}

// ── Per-week section (week view only) ────────────────────────────────────────

function WeekSection({ weekStart, isMobile }: { weekStart: Date; isMobile: boolean }) {
  const weekOverrides = useAppStore((s) => s.weekOverrides)
  const clearWeekOverride = useAppStore((s) => s.clearWeekOverride)
  const weekPlan = useWeekPlan(weekStart)

  const weekStartStr = format(weekStart, 'yyyy-MM-dd')
  const hasOverride = weekOverrides.some((o) => o.weekStart === weekStartStr)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 8 : 10, flex: 1 }}>
      {/* Toolbar row — only show override badge if applicable */}
      {hasOverride && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: isMobile ? '4px 4px 0' : '4px 0 0',
        }}>
          <span style={{
            fontSize: 11, color: 'var(--color-accent)', fontWeight: 600,
            background: 'var(--color-accent-light)', padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
          }}>
            Custom override
          </span>
          <button onClick={() => clearWeekOverride(weekStart)} style={{
            fontSize: 11, color: 'var(--color-text-secondary)', background: 'transparent',
            border: '1px solid var(--color-border)', borderRadius: 'var(--radius-full)',
            padding: '2px 8px', cursor: 'pointer',
          }}>
            Reset to template
          </button>
        </div>
      )}

      {/* Week grid */}
      <WeekGrid
        days={weekPlan.map((d) => ({
          dayIndex: d.dayIndex,
          date: d.date,
          activities: d.activities,
        }))}
        overrideWeekStart={weekStart}
        showDate
        isMobile={isMobile}
      />
    </div>
  )
}

// ── Shared week grid (for week + template views) ─────────────────────────────

interface DayEntry {
  dayIndex: WeekDayIndex
  date: Date
  activities: PlannedActivity[]
}

function WeekGrid({
  days,
  overrideWeekStart,
  showDate,
  isMobile,
}: {
  days: DayEntry[]
  overrideWeekStart?: Date
  showDate: boolean
  isMobile: boolean
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      gap: 0,
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
      background: 'var(--color-surface)',
      flex: isMobile ? undefined : 1,
      minHeight: isMobile ? undefined : 0,
    }}>
      {days.map((day, i) => (
        <div
          key={day.dayIndex}
          style={{
            flex: isMobile ? undefined : 1,
            minWidth: 0,
            borderRight: !isMobile && i < 6 ? '1px solid var(--color-border)' : 'none',
            borderBottom: isMobile && i < 6 ? '1px solid var(--color-border)' : 'none',
          }}
        >
          <DayPlanColumn
            date={day.date}
            dayIndex={day.dayIndex}
            activities={day.activities}
            overrideWeekStart={overrideWeekStart}
            showDate={showDate}
          />
        </div>
      ))}
    </div>
  )
}
