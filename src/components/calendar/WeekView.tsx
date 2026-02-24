import { format, isToday } from 'date-fns'
import { secondsToPaceString, speedToSecondsPerMile } from '../../utils/planningUtils'
import ActivityBadge from './ActivityBadge'
import PlannedBadge from './PlannedBadge'
import WeatherInfo from './WeatherInfo'
import { buildWeekGrid } from '../../utils/dateUtils'
import { mapStravaType } from '../../utils/activityColors'
import { useAppStore } from '../../store/useAppStore'
import { useIsMobile } from '../../hooks/useIsMobile'
import type { StravaActivity, PlannedActivity } from '../../store/types'
import type { ActivityType } from '../../utils/activityColors'
import type { DailyWeather } from '../../api/weather'

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface Props {
  anchor: Date
  activitiesByDate: Record<string, StravaActivity[]>
  plannedByDate?: Record<string, PlannedActivity[]>
  weatherByDate?: Record<string, DailyWeather>
}

export default function WeekView({ anchor, activitiesByDate, plannedByDate, weatherByDate }: Props) {
  const enabledTypes = useAppStore((s) => s.enabledTypes)
  const isMobile = useIsMobile()
  const days = buildWeekGrid(anchor)

  if (isMobile) {
    return <MobileWeekView days={days} activitiesByDate={activitiesByDate} plannedByDate={plannedByDate} weatherByDate={weatherByDate} enabledTypes={enabledTypes} />
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
}: {
  date: Date
  dayLabel: string
  activitiesByDate: Record<string, StravaActivity[]>
  plannedByDate?: Record<string, PlannedActivity[]>
  weatherByDate?: Record<string, DailyWeather>
  enabledTypes: ActivityType[]
}) {
  const openPlannedPanel = useAppStore((s) => s.openPlannedPanel)

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

      <div style={{ height: 1, background: today ? 'var(--color-today-border)' : 'var(--color-border-light)', flexShrink: 0 }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, overflow: 'auto' }}>
        {/* Actual activities */}
        {activities.map((activity) => {
          const isRun = (activity.sport_type || activity.type) === 'Run'
          const pace = isRun && activity.average_speed > 0
            ? secondsToPaceString(speedToSecondsPerMile(activity.average_speed))
            : null
          return (
            <div key={activity.id}>
              <ActivityBadge activity={activity} />
              <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 2, paddingLeft: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {activity.name}
              </div>
              {pace && (
                <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 1, paddingLeft: 4, fontVariantNumeric: 'tabular-nums' }}>
                  {pace}/mi
                </div>
              )}
            </div>
          )
        })}

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
        {activities.length === 0 && !hasPlanned && (
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
  days, activitiesByDate, plannedByDate, weatherByDate, enabledTypes,
}: {
  days: Date[]
  activitiesByDate: Record<string, StravaActivity[]>
  plannedByDate?: Record<string, PlannedActivity[]>
  weatherByDate?: Record<string, DailyWeather>
  enabledTypes: ActivityType[]
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
        />
      ))}
    </div>
  )
}

// ── Mobile day row ───────────────────────────────────────────────────────────

function MobileDayRow({
  date, dayLabel, activitiesByDate, plannedByDate, weatherByDate, enabledTypes,
}: {
  date: Date
  dayLabel: string
  activitiesByDate: Record<string, StravaActivity[]>
  plannedByDate?: Record<string, PlannedActivity[]>
  weatherByDate?: Record<string, DailyWeather>
  enabledTypes: ActivityType[]
}) {
  const openPlannedPanel = useAppStore((s) => s.openPlannedPanel)

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
        {activities.length === 0 && planned.length === 0 ? (
          <div style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)', padding: '4px 0' }}>
            Rest day
          </div>
        ) : (
          <>
            {activities.map((activity) => {
              const isRun = (activity.sport_type || activity.type) === 'Run'
              const pace = isRun && activity.average_speed > 0
                ? secondsToPaceString(speedToSecondsPerMile(activity.average_speed))
                : null
              return (
                <div key={activity.id} style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <ActivityBadge activity={activity} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>
                      {activity.name}
                    </div>
                    {pace && (
                      <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
                        {pace}/mi
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
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
