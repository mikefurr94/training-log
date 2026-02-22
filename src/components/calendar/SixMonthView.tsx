import { addMonths, startOfMonth } from 'date-fns'
import MonthView from './MonthView'
import type { StravaActivity } from '../../store/types'

interface Props {
  anchor: Date
  activitiesByDate: Record<string, StravaActivity[]>
}

export default function SixMonthView({ anchor, activitiesByDate }: Props) {
  const start = startOfMonth(anchor)
  const months = Array.from({ length: 6 }, (_, i) => addMonths(start, i))

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gridTemplateRows: 'repeat(2, 1fr)',
      gap: 12,
      height: '100%',
    }}>
      {months.map((month) => (
        <div
          key={month.toISOString()}
          style={{
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            padding: 10,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <MonthView
            anchor={month}
            activitiesByDate={activitiesByDate}
            compact
            showMonthLabel
          />
        </div>
      ))}
    </div>
  )
}
