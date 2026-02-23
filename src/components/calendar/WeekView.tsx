import { format, isToday } from 'date-fns'
import ActivityBadge from './ActivityBadge'
import { buildWeekGrid } from '../../utils/dateUtils'
import { mapStravaType } from '../../utils/activityColors'
import { useAppStore } from '../../store/useAppStore'
import { useIsMobile } from '../../hooks/useIsMobile'
import type { StravaActivity } from '../../store/types'
import type { ActivityType } from '../../utils/activityColors'

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface Props {
  anchor: Date
  activitiesByDate: Record<string, StravaActivity[]>
}

export default function WeekView({ anchor, activitiesByDate }: Props) {
  const enabledTypes = useAppStore((s) => s.enabledTypes)
  const isMobile = useIsMobile()
  const days = buildWeekGrid(anchor)

  if (isMobile) {
    return <MobileWeekView days={days} activitiesByDate={activitiesByDate} enabledTypes={enabledTypes} />
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(7, 1fr)',
      gap: 6,
      height: '100%',
      padding: '0 4px',
    }}>
      {days.map((date, i) => {
        const key = format(date, 'yyyy-MM-dd')
        const allActivities = activitiesByDate[key] ?? []
        const activities = allActivities.filter((a) =>
          enabledTypes.includes(mapStravaType(a.sport_type || a.type) as ActivityType)
        )
        const today = isToday(date)

        return (
          <div
            key={key}
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
              }}>{DAY_HEADERS[i]}</div>
              <div style={{
                fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)',
                color: today ? 'var(--color-accent)' : 'var(--color-text-primary)',
                lineHeight: 1, letterSpacing: '-1px',
              }}>{format(date, 'd')}</div>
            </div>

            <div style={{ height: 1, background: today ? 'var(--color-today-border)' : 'var(--color-border-light)', flexShrink: 0 }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, overflow: 'auto' }}>
              {activities.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)' }}>
                  Rest day
                </div>
              ) : (
                activities.map((activity) => (
                  <div key={activity.id}>
                    <ActivityBadge activity={activity} />
                    <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 2, paddingLeft: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {activity.name}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Mobile: vertical list layout ─────────────────────────────────────────────

function MobileWeekView({
  days, activitiesByDate, enabledTypes,
}: {
  days: Date[]
  activitiesByDate: Record<string, StravaActivity[]>
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
              {activities.length === 0 ? (
                <div style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)', padding: '4px 0' }}>
                  Rest day
                </div>
              ) : (
                activities.map((activity) => (
                  <div key={activity.id} style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <ActivityBadge activity={activity} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140, flexShrink: 1 }}>
                      {activity.name}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
