import { useMemo, useState } from 'react'
import { subDays, format, getMonth } from 'date-fns'
import { useAppStore } from '../../store/useAppStore'
import { useIsMobile } from '../../hooks/useIsMobile'

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const DAYS_OPTIONS = [
  { days: 90, label: '3 mo' },
  { days: 180, label: '6 mo' },
  { days: 365, label: '1 yr' },
]

export default function HabitGridView() {
  const habits = useAppStore((s) => s.habits)
  const habitCompletions = useAppStore((s) => s.habitCompletions)
  const isMobile = useIsMobile()
  const [daysToShow, setDaysToShow] = useState(isMobile ? 90 : 90)

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

  const cellSize = isMobile ? 8 : 12
  const gap = isMobile ? 1 : 2
  const labelWidth = isMobile ? 80 : 140

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 10 : 16 }}>
      {/* Range selector + legend */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        flexWrap: isMobile ? 'wrap' : undefined,
      }}>
        <div style={{
          display: 'flex', background: 'var(--color-bg)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)', padding: 2, gap: 1,
        }}>
          {DAYS_OPTIONS.map(({ days: d, label }) => (
            <button
              key={d}
              onClick={() => setDaysToShow(d)}
              style={{
                padding: isMobile ? '4px 8px' : '4px 10px', borderRadius: 'var(--radius-sm)',
                fontSize: isMobile ? 11 : 'var(--font-size-sm)', fontWeight: daysToShow === d ? 600 : 500,
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
        <div style={{ display: 'flex', gap: isMobile ? 6 : 10, alignItems: 'center', marginLeft: isMobile ? 0 : 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <div style={{ width: cellSize, height: cellSize, borderRadius: 2, background: 'var(--color-habit-done)' }} />
            <span style={{ fontSize: isMobile ? 9 : 11, color: 'var(--color-text-tertiary)' }}>Done</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <div style={{ width: cellSize, height: cellSize, borderRadius: 2, background: 'var(--color-habit-none)' }} />
            <span style={{ fontSize: isMobile ? 9 : 11, color: 'var(--color-text-tertiary)' }}>Not done</span>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: isMobile ? '10px 8px' : '16px',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch' as any,
      }}>
        {/* Month headers */}
        <div style={{ display: 'flex', marginLeft: labelWidth, marginBottom: isMobile ? 2 : 4 }}>
          {monthMarkers.map(({ index, label }, i) => {
            const nextIndex = i < monthMarkers.length - 1 ? monthMarkers[i + 1].index : daysToShow
            const width = (nextIndex - index) * (cellSize + gap)
            return (
              <div key={`${label}-${index}`} style={{
                width,
                fontSize: isMobile ? 7 : 10,
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
            marginBottom: gap + (isMobile ? 1 : 2),
          }}>
            {/* Habit label */}
            <div style={{
              width: labelWidth,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? 3 : 6,
              fontSize: isMobile ? 10 : 'var(--font-size-sm)',
              fontWeight: 500,
              color: 'var(--color-text-primary)',
              overflow: 'hidden',
            }}>
              <span style={{ fontSize: isMobile ? 11 : 14, flexShrink: 0 }}>{habit.emoji}</span>
              <span style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>{habit.name}</span>
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
                      borderRadius: isMobile ? 1 : 2,
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
