import { format, parseISO, isBefore, isToday } from 'date-fns'
import type { CoachDay } from '../../store/types'
import CoachActivityBadge from './CoachActivityBadge'
import { useIsMobile } from '../../hooks/useIsMobile'

interface Props {
  day: CoachDay
  onActivityClick?: (activityId: string) => void
}

export default function CoachDayCard({ day, onActivityClick }: Props) {
  const isMobile = useIsMobile()
  const date = parseISO(day.date)
  const isPast = isBefore(date, new Date()) && !isToday(date)
  const today = isToday(date)

  return (
    <div style={{
      flex: 1,
      minWidth: isMobile ? '100%' : 120,
      padding: '8px 6px',
      borderRight: isMobile ? 'none' : '1px solid var(--color-border)',
      borderBottom: isMobile ? '1px solid var(--color-border)' : 'none',
      opacity: isPast ? 0.6 : 1,
      background: today ? 'var(--color-accent-light)' : 'transparent',
      borderRadius: today ? 'var(--radius-sm)' : 0,
    }}>
      {/* Day header */}
      <div style={{
        fontSize: 10, fontWeight: 600,
        color: today ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
        textTransform: 'uppercase', letterSpacing: '0.06em',
        marginBottom: 6,
        display: 'flex', justifyContent: 'space-between',
      }}>
        <span>{format(date, 'EEE')}</span>
        <span>{format(date, 'MMM d')}</span>
      </div>

      {/* Activities */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {day.activities.length === 0 ? (
          <div style={{
            fontSize: 11, color: 'var(--color-text-tertiary)',
            fontStyle: 'italic', padding: '4px 0',
          }}>
            Rest day
          </div>
        ) : (
          day.activities.map((activity) => (
            <CoachActivityBadge
              key={activity.id}
              activity={activity}
              onClick={() => onActivityClick?.(activity.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}
