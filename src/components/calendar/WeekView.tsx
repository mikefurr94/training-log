import { format, isToday } from 'date-fns'
import ActivityBadge from './ActivityBadge'
import PlannedBadge from './PlannedBadge'
import WeatherInfo from './WeatherInfo'
import { buildWeekGrid } from '../../utils/dateUtils'
import { mapStravaType } from '../../utils/activityColors'
import { useAppStore } from '../../store/useAppStore'
import { useIsMobile } from '../../hooks/useIsMobile'
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

  const key = format(date, 'yyyy-MM-dd')
  const allActivities = activitiesByDate[key] ?? []
  const activities = allActivities.filter((a) =>
    enabledTypes.includes(mapStravaType(a.sport_type || a.type) as ActivityType)
  )
  const planned = (plannedByDate?.[key] ?? []).filter(
    (p) => p.type !== 'Rest' && enabledTypes.includes(p.type as ActivityType)
  )
  const dayKeyDates = keyDates?.filter((kd) => kd.date === key) ?? []
  const today = isToday(date)
  const hasPlanned = planned.length > 0

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

      {/* Race / event badges */}
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
        {activities.length === 0 && !hasPlanned && dayKeyDates.length === 0 && (
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
        />
      ))}
    </div>
  )
}

// ── Mobile day row ───────────────────────────────────────────────────────────

function MobileDayRow({
  date, dayLabel, activitiesByDate, plannedByDate, weatherByDate, enabledTypes, keyDates,
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

  const key = format(date, 'yyyy-MM-dd')
  const allActivities = activitiesByDate[key] ?? []
  const activities = allActivities.filter((a) =>
    enabledTypes.includes(mapStravaType(a.sport_type || a.type) as ActivityType)
  )
  const planned = (plannedByDate?.[key] ?? []).filter(
    (p) => p.type !== 'Rest' && enabledTypes.includes(p.type as ActivityType)
  )
  const dayKeyDates = keyDates?.filter((kd) => kd.date === key) ?? []
  const today = isToday(date)

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      background: today ? 'var(--color-today-bg)' : 'var(--color-surface)',
      borderRadius: 'var(--radius-md)',
      border: today ? '1.5px solid var(--color-today-border)' : '1px solid var(--color-border)',
      padding: '10px 12px', minHeight: 56,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 40, flexShrink: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: today ? 'var(--color-accent)' : 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {dayLabel}
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: today ? 'var(--color-accent)' : 'var(--color-text-primary)', lineHeight: 1, letterSpacing: '-0.5px' }}>
          {format(date, 'd')}
        </div>
        {weatherByDate?.[key] && planned.length > 0 && (
          <div style={{ marginTop: 4 }}>
            <WeatherInfo weather={weatherByDate[key]} compact />
          </div>
        )}
      </div>

      <div style={{ width: 1, alignSelf: 'stretch', background: today ? 'var(--color-today-border)' : 'var(--color-border-light)', flexShrink: 0 }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
        {/* Race / event badges */}
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

        {activities.length === 0 && planned.length === 0 && dayKeyDates.length === 0 ? (
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
            {planned.map((p) => (
              <div key={p.id} style={{ flex: 1, minWidth: 0 }}>
                <PlannedBadge
                  activity={p}
                  onClick={(e) => { e.stopPropagation(); openPlannedPanel(p, key) }}
                />
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
