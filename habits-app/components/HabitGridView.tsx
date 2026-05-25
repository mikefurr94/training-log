import React, { useMemo } from 'react'
import { format, eachWeekOfInterval, addDays, startOfWeek, startOfYear, endOfYear, getMonth } from 'date-fns'
import { useAppStore } from '../../store/useAppStore'
import { useIsMobile } from '../../hooks/useIsMobile'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const DAY_LABEL_WIDTH = 20
const QUARTER_START_MONTHS = new Set([3, 6, 9]) // April, July, October

const HABIT_COLOR_PALETTE = [
  '#6366f1', '#3b82f6', '#14b8a6', '#10b981',
  '#84cc16', '#f59e0b', '#f97316', '#ef4444',
  '#ec4899', '#8b5cf6',
]

function habitColor(habit: { color?: string }, index: number): string {
  return habit.color ?? HABIT_COLOR_PALETTE[index % HABIT_COLOR_PALETTE.length]
}

interface DayData {
  date: Date
  dateStr: string
  inYear: boolean
}

export default function HabitGridView() {
  const habits = useAppStore((s) => s.habits)
  const habitCounts = useAppStore((s) => s.habitCounts)
  const isMobile = useIsMobile()

  const today = useMemo(() => new Date(), [])

  // Build a grid: full current year Jan–Dec, same as activities GridView
  const { weekStarts, grid } = useMemo(() => {
    const yearStart = startOfYear(today)
    const yearEnd = endOfYear(today)

    const ws = eachWeekOfInterval(
      { start: yearStart, end: yearEnd },
      { weekStartsOn: 1 }
    ).filter((ws) => ws >= yearStart)

    const g: DayData[][] = ws.map((weekStart) =>
      Array.from({ length: 7 }, (_, di) => {
        const date = addDays(weekStart, di)
        return {
          date,
          dateStr: format(date, 'yyyy-MM-dd'),
          inYear: date >= yearStart && date <= yearEnd,
        }
      })
    )

    return { weekStarts: ws, grid: g }
  }, [today])

  const sortedHabits = useMemo(
    () => [...habits].filter((h) => !h.archived).sort((a, b) => a.order - b.order),
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

  // Quarter divider column indices — cols where Q2/Q3/Q4 begin
  const quarterCols = useMemo(
    () => monthPositions.filter(({ month }) => QUARTER_START_MONTHS.has(month)).map(({ col }) => col),
    [monthPositions]
  )

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
      {/* Legend */}
      <div style={{ display: 'flex', gap: isMobile ? 6 : 10, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--color-habit-done)' }} />
          <span style={{ fontSize: isMobile ? 10 : 11, color: 'var(--color-text-tertiary)' }}>Done</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--color-habit-none)' }} />
          <span style={{ fontSize: isMobile ? 10 : 11, color: 'var(--color-text-tertiary)' }}>Not done</span>
        </div>
      </div>

      {/* Per-habit grids */}
      {sortedHabits.map((habit, habitIndex) => {
        const isWeekly = habit.frequency === 'weekly'
        const color = habitColor(habit, habitIndex)
        const weeklyGoal = habit.weeklyGoal ?? (isWeekly ? 1 : 7)

        // Compute goal-met weeks
        const goalMetWeeks = new Set<number>()
        grid.forEach((week, wi) => {
          // Skip fully-future weeks
          if (!week.some((d) => d.inYear && d.date <= today)) return

          if (isWeekly) {
            const weekStartStr = format(week[0].date, 'yyyy-MM-dd')
            const target = habit.dailyTarget ?? 1
            if ((habitCounts[weekStartStr]?.[habit.id] ?? 0) >= target) {
              goalMetWeeks.add(wi)
            }
          } else {
            const target = habit.dailyTarget ?? 1
            const eligibleDays = week.filter((d) => d.inYear && d.date <= today)
            const completedDays = eligibleDays.filter((d) =>
              (habitCounts[d.dateStr]?.[habit.id] ?? 0) >= target
            )
            if (completedDays.length >= weeklyGoal) goalMetWeeks.add(wi)
          }
        })

        if (isWeekly) {
          let completedCount = 0
          for (const week of grid) {
            const weekStartStr = format(week[0].date, 'yyyy-MM-dd')
            if (week[0].inYear && week[0].date <= today && (habitCounts[weekStartStr]?.[habit.id] ?? 0) >= (habit.dailyTarget ?? 1)) completedCount++
          }

          return (
            <div key={habit.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, marginLeft: DAY_LABEL_WIDTH }}>
                <span style={{ fontSize: 16 }}>{habit.emoji}</span>
                <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  {habit.name}
                </span>
                <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginLeft: 2 }}>
                  {completedCount} weeks
                </span>
              </div>

              {/* Month labels */}
              <div style={{ marginLeft: DAY_LABEL_WIDTH, marginBottom: 4, position: 'relative', height: 14 }}>
                {monthPositions.map(({ month, col }) => (
                  <span key={`${month}-${col}`} style={{
                    position: 'absolute',
                    left: `calc(${(col / totalWeeks) * 100}%)`,
                    fontSize: 10,
                    color: QUARTER_START_MONTHS.has(month) ? 'var(--color-text-secondary)' : 'var(--color-text-tertiary)',
                    fontWeight: QUARTER_START_MONTHS.has(month) ? 700 : 600,
                    whiteSpace: 'nowrap',
                    letterSpacing: '0.04em',
                  }}>
                    {MONTH_LABELS[month]}
                  </span>
                ))}
              </div>

              {/* Single row of weekly squares */}
              <div style={{ display: 'flex', alignItems: 'stretch', width: '100%', marginLeft: DAY_LABEL_WIDTH }}>
                <div style={{ display: 'flex', flex: 1, gap: 3 }}>
                  {grid.map((week, wi) => {
                    const isQuarterStart = quarterCols.includes(wi)
                    const weekStartStr = format(week[0].date, 'yyyy-MM-dd')
                    const isPast = week[0].date <= today
                    const completed = week[0].inYear && isPast && (habitCounts[weekStartStr]?.[habit.id] ?? 0) >= (habit.dailyTarget ?? 1)
                    const isThisWeek = week[0].date.getTime() === currentWeekStart
                    return (
                      <React.Fragment key={wi}>
                        {isQuarterStart && (
                          <div aria-hidden style={{
                            width: 2, borderRadius: 1,
                            background: 'var(--color-text-tertiary, #9ca3af)',
                            opacity: 0.35, flexShrink: 0,
                            margin: '0 5px', alignSelf: 'stretch',
                          }} />
                        )}
                        <div title={`${habit.name} — Week of ${format(week[0].date, 'MMM d')}${completed ? ' (done)' : ''}`} style={{
                          flex: 1, aspectRatio: '1', borderRadius: 3,
                          background: !week[0].inYear ? 'transparent' : completed
                            ? color
                            : isThisWeek ? 'var(--color-today-bg, var(--color-border-light, #e5e7eb))' : 'var(--color-border-light, #e5e7eb)',
                          opacity: !week[0].inYear ? 0 : completed ? 1 : 0.4,
                          minWidth: 0,
                        }} />
                      </React.Fragment>
                    )
                  })}
                </div>
              </div>

              {/* Goal-met indicator strip */}
              <GoalStrip grid={grid} goalMetWeeks={goalMetWeeks} quarterCols={quarterCols} color={color} />
            </div>
          )
        }

        // Daily habits
        let completedCount = 0
        for (const week of grid) {
          for (const day of week) {
            if (!day.inYear || day.date > today) continue
            if ((habitCounts[day.dateStr]?.[habit.id] ?? 0) >= (habit.dailyTarget ?? 1)) completedCount++
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
                <span key={`${month}-${col}`} style={{
                  position: 'absolute',
                  left: `calc(${(col / totalWeeks) * 100}%)`,
                  fontSize: 10,
                  color: QUARTER_START_MONTHS.has(month) ? 'var(--color-text-secondary)' : 'var(--color-text-tertiary)',
                  fontWeight: QUARTER_START_MONTHS.has(month) ? 700 : 600,
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.04em',
                }}>
                  {MONTH_LABELS[month]}
                </span>
              ))}
            </div>

            {/* Day rows with quarter dividers */}
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
                      const isQuarterStart = quarterCols.includes(wi)
                      const day = week[di]
                      const isPast = day.date <= today
                      const completed = day.inYear && isPast && (habitCounts[day.dateStr]?.[habit.id] ?? 0) >= (habit.dailyTarget ?? 1)
                      const isCurrentWeek = week[0].date.getTime() === currentWeekStart

                      return (
                        <React.Fragment key={wi}>
                          {isQuarterStart && (
                            <div aria-hidden style={{
                              width: 2, borderRadius: 1,
                              background: 'var(--color-text-tertiary, #9ca3af)',
                              opacity: 0.35, flexShrink: 0,
                              margin: '0 5px', alignSelf: 'stretch',
                            }} />
                          )}
                          {!day.inYear ? (
                            <div style={{ flex: 1, aspectRatio: '1', borderRadius: 3, background: 'transparent' }} />
                          ) : (
                            <div
                              title={`${habit.name} — ${format(day.date, 'MMM d, yyyy')}${completed ? ' (done)' : ''}`}
                              style={{
                                flex: 1,
                                aspectRatio: '1',
                                borderRadius: 3,
                                background: completed
                                  ? color
                                  : isCurrentWeek
                                    ? 'var(--color-today-bg, var(--color-border-light, #e5e7eb))'
                                    : 'var(--color-border-light, #e5e7eb)',
                                opacity: completed ? 1 : 0.4,
                                cursor: 'default',
                                transition: 'opacity 80ms ease',
                                minWidth: 0,
                              }}
                            />
                          )}
                        </React.Fragment>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Goal-met indicator strip */}
            <GoalStrip grid={grid} goalMetWeeks={goalMetWeeks} quarterCols={quarterCols} color={color} />
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

// ── Goal-met indicator strip ──────────────────────────────────────────────────
// A thin row of bars below each habit grid, one per week column, that lights up
// when the weekly goal was met. Uses the identical flex + gap + quarter-divider
// structure as the day rows so it aligns pixel-perfectly.

function GoalStrip({ grid, goalMetWeeks, quarterCols, color }: {
  grid: DayData[][]
  goalMetWeeks: Set<number>
  quarterCols: number[]
  color: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginTop: 4 }}>
      <div style={{ width: DAY_LABEL_WIDTH, flexShrink: 0 }} />
      <div style={{ display: 'flex', flex: 1, gap: 3 }}>
        {grid.map((_, wi) => {
          const isQuarterStart = quarterCols.includes(wi)
          const goalMet = goalMetWeeks.has(wi)
          return (
            <React.Fragment key={wi}>
              {isQuarterStart && (
                <div style={{ width: 2, margin: '0 5px', flexShrink: 0 }} />
              )}
              <div style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                background: goalMet ? color : 'transparent',
              }} />
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}
