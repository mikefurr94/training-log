import { useMemo, useState } from 'react'
import { subDays, format, getMonth } from 'date-fns'
import { useAppStore } from '../../store/useAppStore'

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const DAYS_OPTIONS = [
  { days: 90, label: '3 months' },
  { days: 180, label: '6 months' },
  { days: 365, label: '1 year' },
]

export default function HabitGridView() {
  const habits = useAppStore((s) => s.habits)
  const habitCompletions = useAppStore((s) => s.habitCompletions)
  const [daysToShow, setDaysToShow] = useState(90)

  const today = useMemo(() => new Date(), [])
  const days = useMemo(() =>
    Array.from({ length: daysToShow }, (_, i) => subDays(today, daysToShow - 1 - i)),
    [today, daysToShow]
  )

  const sortedHabits = useMemo(
    () => [...habits].sort((a, b) => a.order - b.order),
    [habits]
  )

  // Month markers
  const monthMarkers = useMemo(() => {
    const markers: { index: number; label: string }[] = []
    let lastMonth = -1
    days.forEach((day, i) => {
      const m = getMonth(day)
      if (m !== lastMonth) {
        lastMonth = m
        markers.push({ index: i, label: MONTH_NAMES[m] })
      }
    })
    return markers
  }, [days])

  const cellSize = 12
  const gap = 2
  const labelWidth = 140

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Range selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
          Showing:
        </span>
        <div style={{
          display: 'flex', background: 'var(--color-bg)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)', padding: 2, gap: 1,
        }}>
          {DAYS_OPTIONS.map(({ days: d, label }) => (
            <button
              key={d}
              onClick={() => setDaysToShow(d)}
              style={{
                padding: '4px 10px', borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--font-size-sm)', fontWeight: daysToShow === d ? 600 : 500,
                color: daysToShow === d ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
                background: daysToShow === d ? 'var(--color-accent)' : 'transparent',
                border: 'none', cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: cellSize, height: cellSize, borderRadius: 2, background: 'var(--color-habit-done)' }} />
            <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>Done</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: cellSize, height: cellSize, borderRadius: 2, background: 'var(--color-habit-none)' }} />
            <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>Not done</span>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px',
        overflowX: 'auto',
      }}>
        {/* Month headers */}
        <div style={{ display: 'flex', marginLeft: labelWidth, marginBottom: 4 }}>
          {monthMarkers.map(({ index, label }, i) => {
            const nextIndex = i < monthMarkers.length - 1 ? monthMarkers[i + 1].index : daysToShow
            const width = (nextIndex - index) * (cellSize + gap)
            return (
              <div key={`${label}-${index}`} style={{
                width,
                fontSize: 10,
                fontWeight: 600,
                color: 'var(--color-text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                flexShrink: 0,
              }}>
                {label}
              </div>
            )
          })}
        </div>

        {/* Habit rows */}
        {sortedHabits.map((habit) => (
          <div key={habit.id} style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: gap + 2,
          }}>
            {/* Habit label */}
            <div style={{
              width: labelWidth,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 'var(--font-size-sm)',
              fontWeight: 500,
              color: 'var(--color-text-primary)',
            }}>
              <span style={{ fontSize: 14 }}>{habit.emoji}</span>
              {habit.name}
            </div>

            {/* Cells */}
            <div style={{ display: 'flex', gap }}>
              {days.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd')
                const completed = (habitCompletions[dateStr] ?? []).includes(habit.id)
                return (
                  <div
                    key={dateStr}
                    title={`${habit.name} — ${format(day, 'MMM d, yyyy')}${completed ? ' (done)' : ''}`}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      borderRadius: 2,
                      background: completed ? 'var(--color-habit-done)' : 'var(--color-habit-none)',
                      opacity: completed ? 1 : 0.4,
                      flexShrink: 0,
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
}
