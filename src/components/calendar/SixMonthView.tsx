import { addMonths, startOfMonth } from 'date-fns'
import MonthView from './MonthView'
import { useIsMobile } from '../../hooks/useIsMobile'
import type { StravaActivity, PlannedActivity } from '../../store/types'

interface Props {
  anchor: Date
  activitiesByDate: Record<string, StravaActivity[]>
  plannedByDate?: Record<string, PlannedActivity[]>
}

export default function SixMonthView({ anchor, activitiesByDate, plannedByDate }: Props) {
  const isMobile = useIsMobile()
  const start = startOfMonth(anchor)
  const months = Array.from({ length: 6 }, (_, i) => addMonths(start, i))

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
      gridTemplateRows: isMobile ? undefined : 'repeat(2, 1fr)',
      gap: isMobile ? 6 : 12,
      height: isMobile ? 'auto' : '100%',
      overflow: isMobile ? 'auto' : undefined,
    }}>
      {months.map((month) => (
        <div
          key={month.toISOString()}
          style={{
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            padding: isMobile ? 6 : 10,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <MonthView
            anchor={month}
            activitiesByDate={activitiesByDate}
            plannedByDate={plannedByDate}
            compact
            showMonthLabel
          />
        </div>
      ))}
    </div>
  )
}
