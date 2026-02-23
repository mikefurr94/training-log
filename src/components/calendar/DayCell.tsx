import { format, isToday, isSameMonth } from 'date-fns'
import ActivityBadge from './ActivityBadge'
import { mapStravaType } from '../../utils/activityColors'
import { useAppStore } from '../../store/useAppStore'
import type { StravaActivity } from '../../store/types'
import type { ActivityType } from '../../utils/activityColors'

interface Props {
  date: Date
  activities: StravaActivity[]
  monthRef?: Date // to detect out-of-month days
  compact?: boolean // for quarter/6month views
  isYearView?: boolean
  size?: number // cell size in px for year view (default 14)
}

export default function DayCell({ date, activities, monthRef, compact = false, isYearView = false, size = 14 }: Props) {
  const enabledTypes = useAppStore((s) => s.enabledTypes)
  const selectActivity = useAppStore((s) => s.selectActivity)

  const today = isToday(date)
  const outsideMonth = monthRef ? !isSameMonth(date, monthRef) : false

  // Filter to enabled types
  const filtered = activities.filter((a) =>
    enabledTypes.includes(mapStravaType(a.sport_type || a.type) as ActivityType)
  )

  const MAX_BADGES = compact ? 2 : 3
  const visible = filtered.slice(0, MAX_BADGES)
  const overflow = filtered.length - MAX_BADGES

  if (isYearView) {
    // Compact square for year heatmap
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

      {/* Activity badges */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
        {visible.map((activity) => (
          <ActivityBadge
            key={activity.id}
            activity={activity}
            compact={compact}
          />
        ))}
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
      </div>
    </div>
  )
}
