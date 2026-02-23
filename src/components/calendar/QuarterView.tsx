import { addMonths, startOfQuarter } from 'date-fns'
import MonthView from './MonthView'
import { useIsMobile } from '../../hooks/useIsMobile'
import type { StravaActivity } from '../../store/types'

interface Props {
  anchor: Date
  activitiesByDate: Record<string, StravaActivity[]>
}

export default function QuarterView({ anchor, activitiesByDate }: Props) {
  const isMobile = useIsMobile()
  const quarterStart = startOfQuarter(anchor)
  const months = [
    quarterStart,
    addMonths(quarterStart, 1),
    addMonths(quarterStart, 2),
  ]

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
      gap: isMobile ? 8 : 16,
      height: isMobile ? 'auto' : '100%',
      overflow: isMobile ? 'auto' : undefined,
    }}>
      {months.map((month) => (
        <div
          key={month.toISOString()}
          style={{
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            padding: isMobile ? 10 : 14,
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
