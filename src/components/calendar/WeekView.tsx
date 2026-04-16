import { createPortal } from 'react-dom'
import { format, isToday } from 'date-fns'
import ActivityBadge from './ActivityBadge'
import PlannedBadge from './PlannedBadge'
import WeatherInfo from './WeatherInfo'
import { buildWeekGrid } from '../../utils/dateUtils'
import { mapStravaType, getActivityColor } from '../../utils/activityColors'
import { getPlannedActivityLabel } from '../../utils/planningUtils'
import { useAppStore } from '../../store/useAppStore'
import { useIsMobile } from '../../hooks/useIsMobile'
import { useMobilePlanDrag } from '../../hooks/useMobilePlanDrag'
import type { MobileDragState, DragGhostInfo } from '../../hooks/useMobilePlanDrag'
import type { StravaActivity, PlannedActivity, KeyDate } from '../../store/types'
import type { ActivityType } from '../../utils/activityColors'
import type { DailyWeather } from '../../api/weather'

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface Props {
  anchor: Date
  activitiesByDate: Record<string, StravaActivity[]>
  plannedByDate?: Record<string, PlannedActivity[]>
  weatherByDate?: Record<string, DailyWeather>
  keyDates?: KeyDate[]
}

export default function WeekView({ anchor, activitiesByDate, plannedByDate, weatherByDate, keyDates }: Props) {
  const enabledTypes = useAppStore((s) => s.enabledTypes)
  const isMobile = useIsMobile()
  const days = buildWeekGrid(anchor)

  if (isMobile) {
    return <MobileWeekView days={days} activitiesByDate={activitiesByDate} plannedByDate={plannedByDate} weatherByDate={weatherByDate} enabledTypes={enabledTypes} keyDates={keyDates} />
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
          weatherByDate={weatherByDate}
          enabledTypes={enabledTypes}
          keyDates={keyDates}
        />
      ))}
    </div>
  )
}

// ── Desktop day column ───────────────────────────────────────────────────────

function WeekDayColumn({
  date,
  dayLabel,
  activitiesByDate,
  plannedByDate,
  weatherByDate,
  enabledTypes,
  keyDates,
}: {
  date: Date
  dayLabel: string
  activitiesByDate: Record<string, StravaActivity[]>
  plannedByDate?: Record<string, PlannedActivity[]>
  weatherByDate?: Record<string, DailyWeather>
  enabledTypes: ActivityType[]
  keyDates?: KeyDate[]
}) {
  const openPlannedPanel = useAppStore((s) => s.openPlannedPanel)
  const openKeyDateModal = useAppStore((s) => s.openKeyDateModal)
  const showPlan = useAppStore((s) => s.showPlan)

  const key = format(date, 'yyyy-MM-dd')
  const allActivities = activitiesByDate[key] ?? []
  const activities = allActivities.filter((a) =>
    enabledTypes.includes(mapStravaType(a.sport_type || a.type) as ActivityType)
  )
  // Extract race from raw planned list before enabledTypes filter (Race is not in enabledTypes)
  const plannedRace = showPlan
    ? (plannedByDate?.[key] ?? []).find(p => p.type === 'Race')
    : undefined
  const planned = (plannedByDate?.[key] ?? []).filter(
    (p) => p.type !== 'Rest' && p.type !== 'Race' && enabledTypes.includes(p.type as ActivityType)
  )
  const dayKeyDates = keyDates?.filter((kd) => kd.date === key) ?? []
  const today = isToday(date)
  const hasPlanned = planned.length > 0 || !!plannedRace

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        background: today ? 'var(--color-today-bg)' : 'var(--color-surface)',
        borderRadius: 'var(--radius-md)',
        border: today ? '1.5px solid var(--color-today-border)' : '1px solid var(--color-border)',
        padding: '12px 12px',
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
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{
            fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)',
            color: today ? 'var(--color-accent)' : 'var(--color-text-primary)',
            lineHeight: 1, letterSpacing: '-1px',
          }}>{format(date, 'd')}</div>
          {weatherByDate?.[key] && hasPlanned && (
            <WeatherInfo weather={weatherByDate[key]} />
          )}
        </div>
      </div>

      {/* Planned race card */}
      {plannedRace && (
        <button
          onClick={() => openPlannedPanel(plannedRace, key)}
          style={{
            display: 'flex', flexDirection: 'column', gap: 3,
            padding: '6px 8px', borderRadius: 7,
            background: 'var(--color-race-gradient-start)',
            border: 'none', cursor: 'pointer', textAlign: 'left',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, lineHeight: 1 }}>
            <span style={{ fontSize: 12, flexShrink: 0 }}>🏁</span>
            <span style={{
              fontSize: 12, fontWeight: 700, color: '#fff',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {plannedRace.type === 'Race' && plannedRace.name ? plannedRace.name : 'Race Day'}
            </span>
          </div>
          {plannedRace.type === 'Race' && (plannedRace.distance || plannedRace.goalTime || plannedRace.targetPace) && (
            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              {plannedRace.distance && (
                <span style={{ padding: '1px 6px', borderRadius: 99, background: 'rgba(0,0,0,0.15)', color: '#fff', fontSize: 10, fontWeight: 600, lineHeight: 1.5 }}>
                  {plannedRace.distance}
                </span>
              )}
              {(plannedRace.goalTime || plannedRace.targetPace) && (
                <span style={{ padding: '1px 6px', borderRadius: 99, background: 'rgba(0,0,0,0.15)', color: '#fff', fontSize: 10, fontWeight: 600, lineHeight: 1.5 }}>
                  {plannedRace.goalTime ?? `${plannedRace.targetPace}/mi`}
                </span>
              )}
            </div>
          )}
        </button>
      )}

      {/* Key date / event badges */}
      {dayKeyDates.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {dayKeyDates.map((kd) => (
            <button
              key={kd.id}
              onClick={() => openKeyDateModal(kd)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '4px 8px', borderRadius: 'var(--radius-sm)',
                fontSize: 11, fontWeight: 600, cursor: 'pointer',
                background: kd.type === 'race' ? 'var(--color-tennis-light)' : 'var(--color-accent-light)',
                color: kd.type === 'race' ? 'var(--color-tennis)' : 'var(--color-accent)',
                border: `1px solid ${kd.type === 'race' ? 'var(--color-tennis-border)' : 'var(--color-accent-border)'}`,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}
            >
              <span style={{ fontSize: 10 }}>{kd.type === 'race' ? '🏁' : '📌'}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{kd.name}</span>
              {kd.goalTime && <span style={{ opacity: 0.7 }}>· {kd.goalTime}</span>}
            </button>
          ))}
        </div>
      )}

      <div style={{ height: 1, background: today ? 'var(--color-today-border)' : 'var(--color-border-light)', flexShrink: 0 }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, overflow: 'auto' }}>
        {/* Actual activities */}
        {activities.map((activity) => (
          <div key={activity.id}>
            <ActivityBadge activity={activity} />
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
              onClick={(e) => { e.stopPropagation(); openPlannedPanel(p, key) }}
            />
          </div>
        ))}

        {/* Rest day placeholder (only if no actual and no planned) */}
        {activities.length === 0 && !hasPlanned && !plannedRace && dayKeyDates.length === 0 && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)' }}>
            Rest day
          </div>
        )}
      </div>
    </div>
  )
}

// ── Mobile: vertical list layout ─────────────────────────────────────────────

function MobileWeekView({
  days, activitiesByDate, plannedByDate, weatherByDate, enabledTypes, keyDates,
}: {
  days: Date[]
  activitiesByDate: Record<string, StravaActivity[]>
  plannedByDate?: Record<string, PlannedActivity[]>
  weatherByDate?: Record<string, DailyWeather>
  enabledTypes: ActivityType[]
  keyDates?: KeyDate[]
}) {
  const movePlannedActivity = useAppStore((s) => s.movePlannedActivity)
  const { dragState, startLongPress, cancelIfMoved } = useMobilePlanDrag(movePlannedActivity)

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 6,
      height: '100%', overflow: 'auto', padding: '8px 8px',
    }}>
      {days.map((date, i) => (
        <MobileDayRow
          key={format(date, 'yyyy-MM-dd')}
          date={date}
          dayLabel={DAY_HEADERS[i]}
          activitiesByDate={activitiesByDate}
          plannedByDate={plannedByDate}
          weatherByDate={weatherByDate}
          enabledTypes={enabledTypes}
          keyDates={keyDates}
          dragState={dragState}
          startLongPress={startLongPress}
          cancelIfMoved={cancelIfMoved}
        />
      ))}

      {/* Floating drag ghost */}
      {dragState && createPortal(
        <div
          style={{
            position: 'fixed',
            left: dragState.x,
            top: dragState.y,
            transform: 'translate(-50%, -130%)',
            pointerEvents: 'none',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            borderRadius: 8,
            background: 'var(--color-surface)',
            border: `1.5px solid ${dragState.ghost.colorHex}`,
            boxShadow: '0 8px 28px rgba(0,0,0,0.22)',
            opacity: 0.93,
            fontSize: 13,
            fontWeight: 600,
            color: dragState.ghost.colorHex,
            whiteSpace: 'nowrap',
            userSelect: 'none',
          }}
        >
          <span style={{ fontSize: 15 }}>{dragState.ghost.emoji}</span>
          <span>{dragState.ghost.label}</span>
        </div>,
        document.body
      )}
    </div>
  )
}

// ── Mobile day row ───────────────────────────────────────────────────────────

function MobileDayRow({
  date, dayLabel, activitiesByDate, plannedByDate, weatherByDate, enabledTypes, keyDates,
  dragState, startLongPress, cancelIfMoved,
}: {
  date: Date
  dayLabel: string
  activitiesByDate: Record<string, StravaActivity[]>
  plannedByDate?: Record<string, PlannedActivity[]>
  weatherByDate?: Record<string, DailyWeather>
  enabledTypes: ActivityType[]
  keyDates?: KeyDate[]
  dragState: MobileDragState | null
  startLongPress: (e: React.PointerEvent, activityId: string, fromDate: string, ghost: DragGhostInfo) => void
  cancelIfMoved: (e: React.PointerEvent) => void
}) {
  const openPlannedPanel = useAppStore((s) => s.openPlannedPanel)
  const openKeyDateModal = useAppStore((s) => s.openKeyDateModal)
  const showPlan = useAppStore((s) => s.showPlan)

  const key = format(date, 'yyyy-MM-dd')
  const allActivities = activitiesByDate[key] ?? []
  const activities = allActivities.filter((a) =>
    enabledTypes.includes(mapStravaType(a.sport_type || a.type) as ActivityType)
  )
  // Extract race from raw planned list before enabledTypes filter (Race is not in enabledTypes)
  const plannedRace = showPlan
    ? (plannedByDate?.[key] ?? []).find(p => p.type === 'Race')
    : undefined
  const planned = (plannedByDate?.[key] ?? []).filter(
    (p) => p.type !== 'Rest' && p.type !== 'Race' && enabledTypes.includes(p.type as ActivityType)
  )
  const dayKeyDates = keyDates?.filter((kd) => kd.date === key) ?? []
  const today = isToday(date)

  const isDragTarget = dragState?.overDate === key && dragState.overDate !== dragState.fromDate

  return (
    <div
      data-date-key={key}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        background: isDragTarget
          ? 'var(--color-accent-light)'
          : today ? 'var(--color-today-bg)' : 'var(--color-surface)',
        borderRadius: 'var(--radius-md)',
        border: isDragTarget
          ? '2px solid var(--color-accent)'
          : today ? '1.5px solid var(--color-today-border)' : '1px solid var(--color-border)',
        padding: isDragTarget ? '9px 11px' : '10px 12px',
        minHeight: 56,
        transition: 'background 0.15s, border-color 0.15s',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 40, flexShrink: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: today ? 'var(--color-accent)' : 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {dayLabel}
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: today ? 'var(--color-accent)' : 'var(--color-text-primary)', lineHeight: 1, letterSpacing: '-0.5px' }}>
          {format(date, 'd')}
        </div>
        {weatherByDate?.[key] && (planned.length > 0 || !!plannedRace) && (
          <div style={{ marginTop: 4 }}>
            <WeatherInfo weather={weatherByDate[key]} compact />
          </div>
        )}
      </div>

      <div style={{ width: 1, alignSelf: 'stretch', background: today ? 'var(--color-today-border)' : 'var(--color-border-light)', flexShrink: 0 }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
        {/* Planned race card */}
        {plannedRace && (
          <div
            onPointerDown={(e) => startLongPress(e, plannedRace.id, key, {
              label: plannedRace.type === 'Race' && plannedRace.name ? plannedRace.name : 'Race Day',
              emoji: '🏁',
              colorHex: '#e11d48',
            })}
            onPointerMove={cancelIfMoved}
            style={{
              touchAction: 'none',
              opacity: dragState?.activityId === plannedRace.id ? 0.35 : 1,
            }}
          >
            <button
              onClick={() => openPlannedPanel(plannedRace, key)}
              style={{
                display: 'flex', flexDirection: 'column', gap: 3,
                padding: '5px 8px', borderRadius: 7,
                background: 'var(--color-race-gradient-start)',
                border: 'none', cursor: 'pointer', textAlign: 'left',
                flexShrink: 0, width: '100%',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, lineHeight: 1 }}>
                <span style={{ fontSize: 12, flexShrink: 0 }}>🏁</span>
                <span style={{
                  fontSize: 12, fontWeight: 700, color: '#fff',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {plannedRace.type === 'Race' && plannedRace.name ? plannedRace.name : 'Race Day'}
                </span>
              </div>
              {plannedRace.type === 'Race' && (plannedRace.distance || plannedRace.goalTime || plannedRace.targetPace) && (
                <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  {plannedRace.distance && (
                    <span style={{ padding: '1px 6px', borderRadius: 99, background: 'rgba(0,0,0,0.15)', color: '#fff', fontSize: 10, fontWeight: 600, lineHeight: 1.5 }}>
                      {plannedRace.distance}
                    </span>
                  )}
                  {(plannedRace.goalTime || plannedRace.targetPace) && (
                    <span style={{ padding: '1px 6px', borderRadius: 99, background: 'rgba(0,0,0,0.15)', color: '#fff', fontSize: 10, fontWeight: 600, lineHeight: 1.5 }}>
                      {plannedRace.goalTime ?? `${plannedRace.targetPace}/mi`}
                    </span>
                  )}
                </div>
              )}
            </button>
          </div>
        )}

        {/* Key date / event badges */}
        {dayKeyDates.map((kd) => (
          <button
            key={kd.id}
            onClick={() => openKeyDateModal(kd)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '3px 10px', borderRadius: 'var(--radius-full)',
              fontSize: 11, fontWeight: 600, cursor: 'pointer',
              background: kd.type === 'race' ? 'var(--color-tennis-light)' : 'var(--color-accent-light)',
              color: kd.type === 'race' ? 'var(--color-tennis)' : 'var(--color-accent)',
              border: `1px solid ${kd.type === 'race' ? 'var(--color-tennis-border)' : 'var(--color-accent-border)'}`,
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ fontSize: 10 }}>{kd.type === 'race' ? '🏁' : '📌'}</span>
            {kd.name}
            {kd.goalTime && <span style={{ opacity: 0.7 }}>· {kd.goalTime}</span>}
          </button>
        ))}

        {activities.length === 0 && planned.length === 0 && !plannedRace && dayKeyDates.length === 0 ? (
          <div style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)', padding: '4px 0' }}>
            Rest day
          </div>
        ) : (
          <>
            {activities.map((activity) => (
              <div key={activity.id} style={{ minWidth: 0 }}>
                <ActivityBadge activity={activity} />
              </div>
            ))}
            {planned.map((p) => {
              const colors = getActivityColor(p.type as ActivityType)
              const label = getPlannedActivityLabel(p)
              return (
                <div
                  key={p.id}
                  onPointerDown={(e) => startLongPress(e, p.id, key, {
                    label,
                    emoji: colors.emoji,
                    colorHex: colors.hex,
                  })}
                  onPointerMove={cancelIfMoved}
                  style={{
                    flex: 1, minWidth: 0,
                    touchAction: 'none',
                    opacity: dragState?.activityId === p.id ? 0.35 : 1,
                  }}
                >
                  <PlannedBadge
                    activity={p}
                    onClick={(e) => { e.stopPropagation(); openPlannedPanel(p, key) }}
                  />
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
