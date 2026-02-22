import { format, isToday } from 'date-fns'
import ActivityBadge from './ActivityBadge'
import { buildWeekGrid } from '../../utils/dateUtils'
import { mapStravaType } from '../../utils/activityColors'
import { useAppStore } from '../../store/useAppStore'
import type { StravaActivity } from '../../store/types'
import type { ActivityType } from '../../utils/activityColors'

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface Props {
  anchor: Date
  activitiesByDate: Record<string, StravaActivity[]>
}

export default function WeekView({ anchor, activitiesByDate }: Props) {
  const enabledTypes = useAppStore((s) => s.enabledTypes)
  const days = buildWeekGrid(anchor)

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
            {/* Day header */}
            <div style={{ flexShrink: 0 }}>
              <div style={{
                fontSize: 'var(--font-size-xs)',
                fontWeight: 'var(--font-weight-semibold)',
                color: today ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 2,
              }}>
                {DAY_HEADERS[i]}
              </div>
              <div style={{
                fontSize: 'var(--font-size-2xl)',
                fontWeight: 'var(--font-weight-bold)',
                color: today ? 'var(--color-accent)' : 'var(--color-text-primary)',
                lineHeight: 1,
                letterSpacing: '-1px',
              }}>
                {format(date, 'd')}
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: today ? 'var(--color-today-border)' : 'var(--color-border-light)', flexShrink: 0 }} />

            {/* Activities */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, overflow: 'auto' }}>
              {activities.length === 0 ? (
                <div style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-text-tertiary)',
                  fontSize: 'var(--font-size-xs)',
                }}>
                  Rest day
                </div>
              ) : (
                activities.map((activity) => (
                  <div key={activity.id}>
                    <ActivityBadge activity={activity} />
                    <div style={{
                      fontSize: 10,
                      color: 'var(--color-text-tertiary)',
                      marginTop: 2,
                      paddingLeft: 4,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
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
