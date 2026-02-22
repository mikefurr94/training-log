import { format, startOfYear, endOfYear, eachWeekOfInterval, addDays, startOfWeek } from 'date-fns'
import DayCell from './DayCell'
import type { StravaActivity } from '../../store/types'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun']

interface Props {
  anchor: Date
  activitiesByDate: Record<string, StravaActivity[]>
}

export default function YearView({ anchor, activitiesByDate }: Props) {
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
    const nextSunday = addDays(ws, 6)
    const monthOfSunday = nextSunday.getMonth()
    // Label the month on the week it begins
    if (col === 0 || monthOfMonday !== weekStarts[col - 1]?.getMonth()) {
      monthPositions.push({ month: monthOfMonday, col })
    }
  })

  return (
    <div style={{
      overflow: 'auto',
      height: '100%',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      padding: '16px 8px',
    }}>
      <div>
        {/* Month labels */}
        <div style={{
          display: 'flex',
          marginLeft: 28,
          marginBottom: 4,
          position: 'relative',
          height: 16,
        }}>
          {monthPositions.map(({ month, col }) => (
            <div
              key={month}
              style={{
                position: 'absolute',
                left: col * 16,
                fontSize: 'var(--font-size-xs)',
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
            gap: 2,
            marginRight: 4,
            paddingTop: 0,
          }}>
            {DAY_LABELS.map((label, i) => (
              <div key={i} style={{
                height: 14,
                fontSize: 9,
                color: 'var(--color-text-tertiary)',
                fontWeight: 500,
                lineHeight: '14px',
                textAlign: 'right',
                width: 24,
              }}>
                {label}
              </div>
            ))}
          </div>

          {/* Contribution grid */}
          <div style={{ display: 'flex', gap: 2 }}>
            {weekStarts.map((weekStart, wi) => (
              <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {Array.from({ length: 7 }, (_, di) => {
                  const date = addDays(weekStart, di)
                  const key = format(date, 'yyyy-MM-dd')
                  const activities = activitiesByDate[key] ?? []
                  // Only render days within the year
                  const inYear = date >= yearStart && date <= yearEnd
                  if (!inYear) {
                    return <div key={di} style={{ width: 14, height: 14 }} />
                  }
                  return (
                    <DayCell
                      key={key}
                      date={date}
                      activities={activities}
                      isYearView
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
          gap: 6,
          marginTop: 12,
          justifyContent: 'flex-end',
          marginRight: 4,
        }}>
          <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>Less</span>
          {['var(--color-border-light)', 'var(--color-run-light)', '#c7d2fe', '#818cf8', 'var(--color-accent)'].map((bg, i) => (
            <div key={i} style={{ width: 12, height: 12, background: bg, borderRadius: 3 }} />
          ))}
          <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>More</span>
        </div>
      </div>
    </div>
  )
}
