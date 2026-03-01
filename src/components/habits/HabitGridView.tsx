import { useMemo, useState } from 'react'
import { format, eachWeekOfInterval, addDays, startOfWeek, subWeeks, getMonth } from 'date-fns'
import { useAppStore } from '../../store/useAppStore'
import { useIsMobile } from '../../hooks/useIsMobile'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const DAY_LABEL_WIDTH = 20

const RANGE_OPTIONS = [
  { weeks: 13, label: '3 mo' },
  { weeks: 26, label: '6 mo' },
  { weeks: 52, label: '1 yr' },
]

interface DayData {
  date: Date
  dateStr: string
  inRange: boolean
}

export default function HabitGridView() {
  const habits = useAppStore((s) => s.habits)
  const habitCompletions = useAppStore((s) => s.habitCompletions)
  const isMobile = useIsMobile()
  const [weeksToShow, setWeeksToShow] = useState(isMobile ? 13 : 26)

  const today = useMemo(() => new Date(), [])

  // Build a grid: array of weeks, each week is 7 days (Mon–Sun)
  const { weekStarts, grid } = useMemo(() => {
    const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 })
    const rangeStart = subWeeks(currentWeekStart, weeksToShow - 1)

    const ws = eachWeekOfInterval(
      { start: rangeStart, end: currentWeekStart },
      { weekStartsOn: 1 }
    )

    const g: DayData[][] = ws.map((weekStart) =>
      Array.from({ length: 7 }, (_, di) => {
        const date = addDays(weekStart, di)
        return {
          date,
          dateStr: format(date, 'yyyy-MM-dd'),
          inRange: date <= today,
        }
      })
    )

    return { weekStarts: ws, grid: g }
  }, [today, weeksToShow])

  const sortedHabits = useMemo(
    () => [...habits].sort((a, b) => a.order - b.order),
    [habits]
  )

  // Month label positions
  const monthPositions = useMemo(() => {
    const positions: { month: number; col: number }[] = []
    weekStarts.forEach((ws, col) => {
      if (col === 0 || getMonth(ws) !== getMonth(weekStarts[col - 1])) {
        positions.push({ month: getMonth(ws), col })
      }
    })
    return positions
  }, [weekStarts])

  const totalWeeks = weekStarts.length
  const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 }).getTime()

  return (
    <div style={{
      height: '100%',
      overflow: 'auto',
      padding: isMobile ? '12px 12px 40px' : '20px 24px 40px',
      display: 'flex',
      flexDirection: 'column',
      gap: isMobile ? 20 : 32,
    }}>
      {/* Range selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div style={{
          display: 'flex', background: 'var(--color-bg)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)', padding: 2, gap: 1,
        }}>
          {RANGE_OPTIONS.map(({ weeks, label }) => (
            <button
              key={weeks}
              onClick={() => setWeeksToShow(weeks)}
              style={{
                padding: isMobile ? '4px 8px' : '4px 10px', borderRadius: 'var(--radius-sm)',
                fontSize: isMobile ? 11 : 'var(--font-size-sm)', fontWeight: weeksToShow === weeks ? 600 : 500,
                color: weeksToShow === weeks ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
                background: weeksToShow === weeks ? 'var(--color-accent)' : 'transparent',
                border: 'none', cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: isMobile ? 6 : 10, alignItems: 'center', marginLeft: isMobile ? 0 : 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--color-habit-done)' }} />
            <span style={{ fontSize: isMobile ? 10 : 11, color: 'var(--color-text-tertiary)' }}>Done</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--color-habit-none)' }} />
            <span style={{ fontSize: isMobile ? 10 : 11, color: 'var(--color-text-tertiary)' }}>Not done</span>
          </div>
        </div>
      </div>

      {/* Per-habit grids */}
      {sortedHabits.map((habit) => {
        // Count completions in range
        let completedCount = 0
        for (const week of grid) {
          for (const day of week) {
            if (!day.inRange) continue
            if ((habitCompletions[day.dateStr] ?? []).includes(habit.id)) completedCount++
          }
        }

        return (
          <div key={habit.id}>
            {/* Habit header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, marginLeft: DAY_LABEL_WIDTH }}>
              <span style={{ fontSize: 16 }}>{habit.emoji}</span>
              <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {habit.name}
              </span>
              <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginLeft: 2 }}>
                {completedCount} days
              </span>
            </div>

            {/* Month labels */}
            <div style={{ marginLeft: DAY_LABEL_WIDTH, marginBottom: 4, position: 'relative', height: 14 }}>
              {monthPositions.map(({ month, col }) => (
                <span
                  key={`${month}-${col}`}
                  style={{
                    position: 'absolute',
                    left: `calc(${(col / totalWeeks) * 100}%)`,
                    fontSize: 10,
                    color: 'var(--color-text-tertiary)',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    letterSpacing: '0.04em',
                  }}
                >
                  {MONTH_LABELS[month]}
                </span>
              ))}
            </div>

            {/* Day rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {DAY_LABELS.map((dayLabel, di) => (
                <div key={di} style={{ display: 'flex', alignItems: 'stretch', width: '100%', marginBottom: 3 }}>
                  <div style={{
                    width: DAY_LABEL_WIDTH,
                    fontSize: 9,
                    color: 'var(--color-text-tertiary)',
                    fontWeight: 600,
                    textAlign: 'right',
                    paddingRight: 6,
                    flexShrink: 0,
                    letterSpacing: '0.04em',
                    display: 'flex',
                    alignItems: 'center',
                  }}>
                    {dayLabel}
                  </div>
                  <div style={{ display: 'flex', flex: 1, gap: 3 }}>
                    {grid.map((week, wi) => {
                      const day = week[di]
                      const completed = day.inRange && (habitCompletions[day.dateStr] ?? []).includes(habit.id)
                      const isCurrentWeek = week[0].date.getTime() === currentWeekStart

                      return !day.inRange ? (
                        <div key={wi} style={{ flex: 1, aspectRatio: '1', borderRadius: 3, background: 'transparent' }} />
                      ) : (
                        <div
                          key={wi}
                          title={`${habit.name} — ${format(day.date, 'MMM d, yyyy')}${completed ? ' (done)' : ''}`}
                          style={{
                            flex: 1,
                            aspectRatio: '1',
                            borderRadius: 3,
                            background: completed
                              ? 'var(--color-habit-done)'
                              : isCurrentWeek
                                ? 'var(--color-today-bg, var(--color-border-light, #e5e7eb))'
                                : 'var(--color-border-light, #e5e7eb)',
                            opacity: completed ? 1 : 0.4,
                            cursor: 'default',
                            transition: 'opacity 80ms ease',
                            minWidth: 0,
                          }}
                        />
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {sortedHabits.length === 0 && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
          No habits yet. Add some habits to see them here.
        </div>
      )}
    </div>
  )
}
