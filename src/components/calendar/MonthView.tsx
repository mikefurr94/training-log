import { format } from 'date-fns'
import DayCell from './DayCell'
import { buildMonthGrid } from '../../utils/dateUtils'
import type { StravaActivity } from '../../store/types'

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface Props {
  anchor: Date
  activitiesByDate: Record<string, StravaActivity[]>
  compact?: boolean
  showHeader?: boolean
  showMonthLabel?: boolean
}

export default function MonthView({
  anchor,
  activitiesByDate,
  compact = false,
  showHeader = true,
  showMonthLabel = false,
}: Props) {
  const weeks = buildMonthGrid(anchor)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {showMonthLabel && (
        <div style={{
          fontSize: 'var(--font-size-sm)',
          fontWeight: 'var(--font-weight-semibold)',
          color: 'var(--color-text-primary)',
          marginBottom: compact ? 4 : 6,
          letterSpacing: '-0.2px',
        }}>
          {format(anchor, 'MMMM')}
        </div>
      )}

      {/* Day-of-week headers */}
      {showHeader && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: compact ? 2 : 4,
          marginBottom: compact ? 2 : 4,
        }}>
          {DAY_HEADERS.map((d) => (
            <div key={d} style={{
              fontSize: compact ? 9 : 'var(--font-size-xs)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-text-tertiary)',
              textAlign: 'center',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              padding: compact ? '2px 0' : '4px 0',
            }}>
              {compact ? d[0] : d}
            </div>
          ))}
        </div>
      )}

      {/* Calendar weeks */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateRows: `repeat(${weeks.length}, 1fr)`,
        gap: compact ? 2 : 4,
      }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: compact ? 2 : 4,
          }}>
            {week.map((date) => {
              const key = format(date, 'yyyy-MM-dd')
              const activities = activitiesByDate[key] ?? []
              return (
                <DayCell
                  key={key}
                  date={date}
                  activities={activities}
                  monthRef={anchor}
                  compact={compact}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
