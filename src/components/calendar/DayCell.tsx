import { useState } from 'react'
import { format, isToday, isSameMonth, startOfWeek } from 'date-fns'
import ActivityBadge from './ActivityBadge'
import PlannedBadge from './PlannedBadge'
import { mapStravaType } from '../../utils/activityColors'
import { secondsToPaceString, speedToSecondsPerMile } from '../../utils/planningUtils'
import { useAppStore } from '../../store/useAppStore'
import ActivityPlanModal from '../planning/ActivityPlanModal'
import type { StravaActivity, PlannedActivity, WeekDayIndex } from '../../store/types'
import type { ActivityType } from '../../utils/activityColors'

interface Props {
  date: Date
  activities: StravaActivity[]
  plannedActivities?: PlannedActivity[]
  monthRef?: Date // to detect out-of-month days
  compact?: boolean // for quarter/6month views
  isYearView?: boolean
  size?: number // cell size in px for year view (default 14)
}

export default function DayCell({
  date,
  activities,
  plannedActivities,
  monthRef,
  compact = false,
  isYearView = false,
  size = 14,
}: Props) {
  const enabledTypes = useAppStore((s) => s.enabledTypes)
  const selectActivity = useAppStore((s) => s.selectActivity)
  const setDayOverride = useAppStore((s) => s.setDayOverride)
  const weekTemplate = useAppStore((s) => s.weekTemplate)
  const weekOverrides = useAppStore((s) => s.weekOverrides)

  const [editingPlanned, setEditingPlanned] = useState<PlannedActivity | null>(null)
  const [showAddPlanModal, setShowAddPlanModal] = useState(false)

  const today = isToday(date)
  const outsideMonth = monthRef ? !isSameMonth(date, monthRef) : false

  // Filter actual activities to enabled types
  const filtered = activities.filter((a) =>
    enabledTypes.includes(mapStravaType(a.sport_type || a.type) as ActivityType)
  )

  // Filter planned activities to enabled types (skip Rest in calendar)
  const filteredPlanned = (plannedActivities ?? []).filter(
    (p) => p.type !== 'Rest' && enabledTypes.includes(p.type as ActivityType)
  )

  const MAX_BADGES = compact ? 2 : 3
  const visible = filtered.slice(0, MAX_BADGES)
  const overflow = filtered.length - MAX_BADGES

  // Planned badges get leftover slots after actual badges
  const plannedSlots = Math.max(0, MAX_BADGES - Math.min(filtered.length, MAX_BADGES))
  const plannedVisible = compact ? [] : filteredPlanned.slice(0, plannedSlots)
  const plannedOverflow = compact ? 0 : Math.max(0, filteredPlanned.length - plannedSlots)

  const hasPlanned = filteredPlanned.length > 0

  // Helpers for editing planned activities
  const dayIndex = date.getDay() as WeekDayIndex
  const overrideWeekStart = startOfWeek(date, { weekStartsOn: 1 })

  function getCurrentPlannedActivities(): PlannedActivity[] {
    const weekStartStr = format(overrideWeekStart, 'yyyy-MM-dd')
    const override = weekOverrides.find((o) => o.weekStart === weekStartStr)
    if (override && override.days[dayIndex] !== undefined) {
      return override.days[dayIndex]!
    }
    return weekTemplate.days[dayIndex] ?? []
  }

  function handleSavePlanned(activity: PlannedActivity) {
    const current = getCurrentPlannedActivities()
    const updated = current.map((a) => (a.id === activity.id ? activity : a))
    setDayOverride(overrideWeekStart, dayIndex, updated)
    setEditingPlanned(null)
  }

  function handleAddPlanned(activity: PlannedActivity) {
    const current = getCurrentPlannedActivities()
    setDayOverride(overrideWeekStart, dayIndex, [...current, activity])
    setShowAddPlanModal(false)
  }

  if (isYearView) {
    // Compact square for year heatmap — no planned data shown
    const count = filtered.length
    const intensity = count === 0 ? 0 : Math.min(count, 4)
    const bgMap: Record<number, string> = {
      0: 'var(--color-border-light)',
      1: 'var(--color-run-light)',
      2: '#c7d2fe',
      3: '#818cf8',
      4: 'var(--color-accent)',
    }
    return (
      <div
        title={`${format(date, 'MMM d')}${count > 0 ? `: ${count} activity${count > 1 ? 'ies' : 'y'}` : ''}`}
        onClick={() => visible[0] && selectActivity(visible[0].id)}
        style={{
          width: size,
          height: size,
          borderRadius: size <= 10 ? 2 : 3,
          background: bgMap[intensity],
          cursor: count > 0 ? 'pointer' : 'default',
          transition: 'transform var(--transition-fast)',
        }}
        onMouseEnter={(e) => count > 0 && (e.currentTarget.style.transform = 'scale(1.2)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      />
    )
  }

  return (
    <>
      <div
        style={{
          padding: compact ? '4px 5px' : '6px 8px',
          background: today
            ? 'var(--color-today-bg)'
            : outsideMonth
            ? 'var(--color-outside-month)'
            : 'var(--color-surface)',
          borderRadius: 'var(--radius-sm)',
          opacity: outsideMonth ? 0.45 : 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          minHeight: compact ? 50 : 90,
          transition: 'background var(--transition-fast)',
          overflow: 'hidden',
        }}
      >
        {/* Date number */}
        <div style={{
          fontSize: compact ? 'var(--font-size-xs)' : 'var(--font-size-sm)',
          fontWeight: today ? 'var(--font-weight-bold)' : 'var(--font-weight-medium)',
          color: today ? 'var(--color-accent)' : outsideMonth ? 'var(--color-text-tertiary)' : 'var(--color-text-secondary)',
          lineHeight: 1,
          letterSpacing: '-0.1px',
          flexShrink: 0,
        }}>
          {today && !compact ? (
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
            format(date, 'd')
          )}
        </div>

        {/* Activity badges (actual + planned) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
          {/* Actual activity badges */}
          {visible.map((activity) => {
            const isRun = !compact && mapStravaType(activity.sport_type || activity.type) === 'Run'
            const pace = isRun && activity.average_speed > 0
              ? secondsToPaceString(speedToSecondsPerMile(activity.average_speed))
              : null
            return (
              <div key={activity.id}>
                <ActivityBadge activity={activity} compact={compact} />
                {pace && (
                  <div style={{ fontSize: 9, color: 'var(--color-text-tertiary)', marginTop: 1, paddingLeft: 3, fontVariantNumeric: 'tabular-nums' }}>
                    {pace}/mi
                  </div>
                )}
              </div>
            )
          })}
          {overflow > 0 && (
            <button
              onClick={() => filtered[MAX_BADGES] && selectActivity(filtered[MAX_BADGES].id)}
              style={{
                fontSize: 10,
                color: 'var(--color-text-tertiary)',
                textAlign: 'left',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '1px 4px',
                fontWeight: 500,
              }}
            >
              +{overflow} more
            </button>
          )}

          {/* Planned activity badges (dashed style) */}
          {plannedVisible.map((planned) => {
            const targetPace = !compact && planned.type === 'Run' && planned.targetPace
              ? planned.targetPace
              : null
            return (
              <div key={planned.id}>
                <PlannedBadge
                  activity={planned}
                  compact={compact}
                  onClick={(e) => { e.stopPropagation(); setEditingPlanned(planned) }}
                />
                {targetPace && (
                  <div style={{ fontSize: 9, color: 'var(--color-text-tertiary)', marginTop: 1, paddingLeft: 3, fontVariantNumeric: 'tabular-nums', opacity: 0.8 }}>
                    {targetPace}/mi
                  </div>
                )}
              </div>
            )
          })}
          {plannedOverflow > 0 && (
            <div style={{
              fontSize: 10,
              color: 'var(--color-text-tertiary)',
              padding: '1px 4px',
              fontWeight: 500,
              fontStyle: 'italic',
            }}>
              +{plannedOverflow} planned
            </div>
          )}
        </div>

        {/* Add plan button — only if plan overlay is on, not compact, and has room */}
        {!compact && hasPlanned && filtered.length + filteredPlanned.length < MAX_BADGES && (
          <button
            onClick={() => setShowAddPlanModal(true)}
            style={{
              width: '100%',
              padding: '2px 0',
              borderRadius: 'var(--radius-sm)',
              background: 'transparent',
              border: '1px dashed var(--color-border)',
              color: 'var(--color-text-tertiary)',
              fontSize: 9,
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
            + Plan
          </button>
        )}
      </div>

      {/* Edit planned activity modal */}
      {editingPlanned && (
        <ActivityPlanModal
          initial={editingPlanned}
          onSave={handleSavePlanned}
          onClose={() => setEditingPlanned(null)}
        />
      )}

      {/* Add planned activity modal */}
      {showAddPlanModal && (
        <ActivityPlanModal
          onSave={handleAddPlanned}
          onClose={() => setShowAddPlanModal(false)}
        />
      )}
    </>
  )
}
