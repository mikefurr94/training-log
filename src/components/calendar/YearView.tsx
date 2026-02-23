import { format, startOfYear, endOfYear, eachWeekOfInterval, addDays, startOfWeek } from 'date-fns'
import DayCell from './DayCell'
import { useIsMobile } from '../../hooks/useIsMobile'
import type { StravaActivity } from '../../store/types'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun']

interface Props {
  anchor: Date
  activitiesByDate: Record<string, StravaActivity[]>
}

export default function YearView({ anchor, activitiesByDate }: Props) {
  const isMobile = useIsMobile()
  const yearStart = startOfYear(anchor)
  const yearEnd = endOfYear(anchor)

  // Build weeks array: each week starts on Monday
  const weekStarts = eachWeekOfInterval(
    { start: yearStart, end: yearEnd },
    { weekStartsOn: 1 }
  )

  // Compute month label positions (column index where each month starts)
  const monthPositions: { month: number; col: number }[] = []
  weekStarts.forEach((ws, col) => {
    const monthOfMonday = ws.getMonth()
    if (col === 0 || monthOfMonday !== weekStarts[col - 1]?.getMonth()) {
      monthPositions.push({ month: monthOfMonday, col })
    }
  })

  const cellSize = isMobile ? 10 : 14
  const cellGap = isMobile ? 1 : 2
  const labelColWidth = isMobile ? 20 : 28

  return (
    <div style={{
      overflow: 'auto',
      height: '100%',
      display: 'flex',
      alignItems: isMobile ? 'flex-start' : 'flex-start',
      justifyContent: isMobile ? 'flex-start' : 'center',
      padding: isMobile ? '8px 4px' : '16px 8px',
      WebkitOverflowScrolling: 'touch' as any,
    }}>
      <div>
        {/* Month labels */}
        <div style={{
          display: 'flex',
          marginLeft: labelColWidth,
          marginBottom: isMobile ? 2 : 4,
          position: 'relative',
          height: isMobile ? 12 : 16,
        }}>
          {monthPositions.map(({ month, col }) => (
            <div
              key={month}
              style={{
                position: 'absolute',
                left: col * (cellSize + cellGap),
                fontSize: isMobile ? 8 : 'var(--font-size-xs)',
                color: 'var(--color-text-secondary)',
                fontWeight: 'var(--font-weight-medium)',
                whiteSpace: 'nowrap',
              }}
            >
              {MONTH_LABELS[month]}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 0 }}>
          {/* Day-of-week labels */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: cellGap,
            marginRight: isMobile ? 2 : 4,
            paddingTop: 0,
          }}>
            {DAY_LABELS.map((label, i) => (
              <div key={i} style={{
                height: cellSize,
                fontSize: isMobile ? 7 : 9,
                color: 'var(--color-text-tertiary)',
                fontWeight: 500,
                lineHeight: `${cellSize}px`,
                textAlign: 'right',
                width: labelColWidth - (isMobile ? 2 : 4),
              }}>
                {label}
              </div>
            ))}
          </div>

          {/* Contribution grid */}
          <div style={{ display: 'flex', gap: cellGap }}>
            {weekStarts.map((weekStart, wi) => (
              <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: cellGap }}>
                {Array.from({ length: 7 }, (_, di) => {
                  const date = addDays(weekStart, di)
                  const key = format(date, 'yyyy-MM-dd')
                  const activities = activitiesByDate[key] ?? []
                  // Only render days within the year
                  const inYear = date >= yearStart && date <= yearEnd
                  if (!inYear) {
                    return <div key={di} style={{ width: cellSize, height: cellSize }} />
                  }
                  return (
                    <DayCell
                      key={key}
                      date={date}
                      activities={activities}
                      isYearView
                      size={cellSize}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? 4 : 6,
          marginTop: isMobile ? 6 : 12,
          justifyContent: 'flex-end',
          marginRight: 4,
        }}>
          <span style={{ fontSize: isMobile ? 8 : 10, color: 'var(--color-text-tertiary)' }}>Less</span>
          {['var(--color-border-light)', 'var(--color-run-light)', '#c7d2fe', '#818cf8', 'var(--color-accent)'].map((bg, i) => (
            <div key={i} style={{ width: isMobile ? 8 : 12, height: isMobile ? 8 : 12, background: bg, borderRadius: isMobile ? 2 : 3 }} />
          ))}
          <span style={{ fontSize: isMobile ? 8 : 10, color: 'var(--color-text-tertiary)' }}>More</span>
        </div>
      </div>
    </div>
  )
}
