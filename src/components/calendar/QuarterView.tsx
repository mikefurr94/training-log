import { addMonths, startOfQuarter } from 'date-fns'
import MonthView from './MonthView'
import type { StravaActivity } from '../../store/types'

interface Props {
  anchor: Date
  activitiesByDate: Record<string, StravaActivity[]>
}

export default function QuarterView({ anchor, activitiesByDate }: Props) {
  const quarterStart = startOfQuarter(anchor)
  const months = [
    quarterStart,
    addMonths(quarterStart, 1),
    addMonths(quarterStart, 2),
  ]

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 16,
      height: '100%',
    }}>
      {months.map((month) => (
        <div
          key={month.toISOString()}
          style={{
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            padding: 14,
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
