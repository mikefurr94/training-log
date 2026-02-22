import { useState, useMemo } from 'react'
import { startOfWeek, addWeeks, subWeeks, addDays, format, isToday } from 'date-fns'
import { useAppStore } from '../../store/useAppStore'
import HabitCheckbox from './HabitCheckbox'

const ACCENT_COLORS = ['#6366f1', '#10b981', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899', '#ef4444', '#f97316']

export default function HabitWeekView() {
  const habits = useAppStore((s) => s.habits)
  const habitCompletions = useAppStore((s) => s.habitCompletions)
  const toggleHabitCompletion = useAppStore((s) => s.toggleHabitCompletion)
  const [anchor, setAnchor] = useState(() => new Date())

  const weekStart = startOfWeek(anchor, { weekStartsOn: 1 })
  const days = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  )

  const isCurrentWeek =
    format(weekStart, 'yyyy-MM-dd') === format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')

  const weekLabel = `${format(weekStart, 'MMM d')} – ${format(addWeeks(weekStart, 1), 'MMM d, yyyy')}`

  const sortedHabits = useMemo(
    () => [...habits].sort((a, b) => a.order - b.order),
    [habits]
  )

  // Calculate daily totals
  const dailyTotals = useMemo(() =>
    days.map((day) => {
      const dateStr = format(day, 'yyyy-MM-dd')
      const completed = (habitCompletions[dateStr] ?? []).filter(
        (id) => habits.some((h) => h.id === id)
      ).length
      return completed
    }),
    [days, habitCompletions, habits]
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <NavBtn onClick={() => setAnchor((a) => subWeeks(a, 1))}>‹</NavBtn>
        {!isCurrentWeek && (
          <button onClick={() => setAnchor(new Date())} style={ghostBtnStyle}>This week</button>
        )}
        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-primary)', minWidth: 160, textAlign: 'center' }}>
          {weekLabel}
        </span>
        <NavBtn onClick={() => setAnchor((a) => addWeeks(a, 1))}>›</NavBtn>
      </div>

      {/* Grid */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}>
        {/* Header row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '180px repeat(7, 1fr)',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-bg)',
        }}>
          <div style={{ padding: '10px 16px' }} />
          {days.map((day) => {
            const today = isToday(day)
            return (
              <div key={format(day, 'yyyy-MM-dd')} style={{
                padding: '10px 8px',
                textAlign: 'center',
                borderLeft: '1px solid var(--color-border)',
              }}>
                <div style={{
                  fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: today ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
                }}>
                  {format(day, 'EEE')}
                </div>
                <div style={{
                  fontSize: 'var(--font-size-sm)', fontWeight: today ? 700 : 500,
                  color: today ? 'var(--color-accent)' : 'var(--color-text-primary)',
                  marginTop: 2,
                }}>
                  {format(day, 'd')}
                </div>
              </div>
            )
          })}
        </div>

        {/* Habit rows */}
        {sortedHabits.map((habit, hi) => (
          <div
            key={habit.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '180px repeat(7, 1fr)',
              borderBottom: hi < sortedHabits.length - 1 ? '1px solid var(--color-border)' : 'none',
            }}
          >
            {/* Habit label */}
            <div style={{
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <span style={{ fontSize: 18 }}>{habit.emoji}</span>
              <span style={{
                fontSize: 'var(--font-size-sm)',
                fontWeight: 500,
                color: 'var(--color-text-primary)',
              }}>
                {habit.name}
              </span>
            </div>

            {/* Day cells */}
            {days.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const completed = (habitCompletions[dateStr] ?? []).includes(habit.id)
              const today = isToday(day)
              return (
                <div
                  key={dateStr}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderLeft: '1px solid var(--color-border)',
                    background: today ? 'var(--color-today-bg)' : 'transparent',
                    padding: '8px 0',
                  }}
                >
                  <HabitCheckbox
                    checked={completed}
                    onToggle={() => toggleHabitCompletion(dateStr, habit.id)}
                    color={ACCENT_COLORS[hi % ACCENT_COLORS.length]}
                  />
                </div>
              )
            })}
          </div>
        ))}

        {/* Daily totals row */}
      </div>
    </div>
  )
}

function NavBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      width: 28, height: 28, borderRadius: 'var(--radius-sm)',
      background: 'transparent', border: '1px solid var(--color-border)',
      color: 'var(--color-text-secondary)', fontSize: 20, lineHeight: 1,
      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 300,
    }}>
      {children}
    </button>
  )
}

const ghostBtnStyle: React.CSSProperties = {
  padding: '4px 10px', borderRadius: 'var(--radius-sm)',
  fontSize: 'var(--font-size-sm)', fontWeight: 500,
  color: 'var(--color-text-secondary)', background: 'transparent',
  border: '1px solid var(--color-border)', cursor: 'pointer',
}
