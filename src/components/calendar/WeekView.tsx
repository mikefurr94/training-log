import { useState } from 'react'
import { format, isToday, startOfWeek } from 'date-fns'
import ActivityBadge from './ActivityBadge'
import PlannedBadge from './PlannedBadge'
import { buildWeekGrid } from '../../utils/dateUtils'
import { mapStravaType } from '../../utils/activityColors'
import { useAppStore } from '../../store/useAppStore'
import { useIsMobile } from '../../hooks/useIsMobile'
import ActivityPlanModal from '../planning/ActivityPlanModal'
import type { StravaActivity, PlannedActivity, WeekDayIndex } from '../../store/types'
import type { ActivityType } from '../../utils/activityColors'

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface Props {
  anchor: Date
  activitiesByDate: Record<string, StravaActivity[]>
  plannedByDate?: Record<string, PlannedActivity[]>
}

export default function WeekView({ anchor, activitiesByDate, plannedByDate }: Props) {
  const enabledTypes = useAppStore((s) => s.enabledTypes)
  const isMobile = useIsMobile()
  const days = buildWeekGrid(anchor)

  if (isMobile) {
    return <MobileWeekView days={days} activitiesByDate={activitiesByDate} plannedByDate={plannedByDate} enabledTypes={enabledTypes} />
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(7, 1fr)',
      gap: 6,
      height: '100%',
      padding: '0 4px',
    }}>
      {days.map((date, i) => (
        <WeekDayColumn
          key={format(date, 'yyyy-MM-dd')}
          date={date}
          dayLabel={DAY_HEADERS[i]}
          activitiesByDate={activitiesByDate}
          plannedByDate={plannedByDate}
          enabledTypes={enabledTypes}
        />
      ))}
    </div>
  )
}

// ── Desktop day column with plan editing support ────────────────────────────

function WeekDayColumn({
  date,
  dayLabel,
  activitiesByDate,
  plannedByDate,
  enabledTypes,
}: {
  date: Date
  dayLabel: string
  activitiesByDate: Record<string, StravaActivity[]>
  plannedByDate?: Record<string, PlannedActivity[]>
  enabledTypes: ActivityType[]
}) {
  const setDayOverride = useAppStore((s) => s.setDayOverride)
  const weekTemplate = useAppStore((s) => s.weekTemplate)
  const weekOverrides = useAppStore((s) => s.weekOverrides)

  const [editingPlanned, setEditingPlanned] = useState<PlannedActivity | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)

  const key = format(date, 'yyyy-MM-dd')
  const allActivities = activitiesByDate[key] ?? []
  const activities = allActivities.filter((a) =>
    enabledTypes.includes(mapStravaType(a.sport_type || a.type) as ActivityType)
  )
  const planned = (plannedByDate?.[key] ?? []).filter(
    (p) => p.type !== 'Rest' && enabledTypes.includes(p.type as ActivityType)
  )
  const today = isToday(date)
  const hasPlanned = planned.length > 0

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
    setShowAddModal(false)
  }

  return (
    <>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          background: today ? 'var(--color-today-bg)' : 'var(--color-surface)',
          borderRadius: 'var(--radius-md)',
          border: today ? '1.5px solid var(--color-today-border)' : '1px solid var(--color-border)',
          padding: '10px 10px',
          overflow: 'hidden',
        }}
      >
        <div style={{ flexShrink: 0 }}>
          <div style={{
            fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)',
            color: today ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
            textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2,
          }}>{dayLabel}</div>
          <div style={{
            fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)',
            color: today ? 'var(--color-accent)' : 'var(--color-text-primary)',
            lineHeight: 1, letterSpacing: '-1px',
          }}>{format(date, 'd')}</div>
        </div>

        <div style={{ height: 1, background: today ? 'var(--color-today-border)' : 'var(--color-border-light)', flexShrink: 0 }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, overflow: 'auto' }}>
          {/* Actual activities */}
          {activities.map((activity) => (
            <div key={activity.id}>
              <ActivityBadge activity={activity} />
              <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 2, paddingLeft: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {activity.name}
              </div>
            </div>
          ))}

          {/* Dashed divider if both actual and planned exist */}
          {activities.length > 0 && hasPlanned && (
            <div style={{ height: 0, borderTop: '1px dashed var(--color-border-light)', margin: '2px 0' }} />
          )}

          {/* Planned activities */}
          {planned.map((p) => (
            <div key={p.id}>
              <PlannedBadge
                activity={p}
                onClick={(e) => { e.stopPropagation(); setEditingPlanned(p) }}
              />
            </div>
          ))}

          {/* Rest day placeholder (only if no actual and no planned) */}
          {activities.length === 0 && !hasPlanned && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)' }}>
              Rest day
            </div>
          )}

          {/* Add plan button */}
          {hasPlanned && (
            <button
              onClick={() => setShowAddModal(true)}
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
              + Plan
            </button>
          )}
        </div>
      </div>

      {editingPlanned && (
        <ActivityPlanModal
          initial={editingPlanned}
          onSave={handleSavePlanned}
          onClose={() => setEditingPlanned(null)}
        />
      )}
      {showAddModal && (
        <ActivityPlanModal
          onSave={handleAddPlanned}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </>
  )
}

// ── Mobile: vertical list layout ─────────────────────────────────────────────

function MobileWeekView({
  days, activitiesByDate, plannedByDate, enabledTypes,
}: {
  days: Date[]
  activitiesByDate: Record<string, StravaActivity[]>
  plannedByDate?: Record<string, PlannedActivity[]>
  enabledTypes: ActivityType[]
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 6,
      height: '100%', overflow: 'auto', padding: '8px 8px',
    }}>
      {days.map((date, i) => {
        const key = format(date, 'yyyy-MM-dd')
        const allActivities = activitiesByDate[key] ?? []
        const activities = allActivities.filter((a) =>
          enabledTypes.includes(mapStravaType(a.sport_type || a.type) as ActivityType)
        )
        const planned = (plannedByDate?.[key] ?? []).filter(
          (p) => p.type !== 'Rest' && enabledTypes.includes(p.type as ActivityType)
        )
        const today = isToday(date)

        return (
          <div key={key} style={{
            display: 'flex', alignItems: 'flex-start', gap: 12,
            background: today ? 'var(--color-today-bg)' : 'var(--color-surface)',
            borderRadius: 'var(--radius-md)',
            border: today ? '1.5px solid var(--color-today-border)' : '1px solid var(--color-border)',
            padding: '10px 12px', minHeight: 56,
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 40, flexShrink: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: today ? 'var(--color-accent)' : 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {DAY_HEADERS[i]}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: today ? 'var(--color-accent)' : 'var(--color-text-primary)', lineHeight: 1, letterSpacing: '-0.5px' }}>
                {format(date, 'd')}
              </div>
            </div>

            <div style={{ width: 1, alignSelf: 'stretch', background: today ? 'var(--color-today-border)' : 'var(--color-border-light)', flexShrink: 0 }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
              {activities.length === 0 && planned.length === 0 ? (
                <div style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)', padding: '4px 0' }}>
                  Rest day
                </div>
              ) : (
                <>
                  {activities.map((activity) => (
                    <div key={activity.id} style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <ActivityBadge activity={activity} />
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140, flexShrink: 1 }}>
                        {activity.name}
                      </div>
                    </div>
                  ))}
                  {planned.map((p) => (
                    <div key={p.id} style={{ flex: 1, minWidth: 0 }}>
                      <PlannedBadge activity={p} />
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
