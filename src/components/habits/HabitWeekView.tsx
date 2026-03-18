import { useState, useMemo, useRef, useEffect } from 'react'
import { startOfWeek, addWeeks, subWeeks, addDays, format, isToday } from 'date-fns'
import { useAppStore } from '../../store/useAppStore'
import { useIsMobile } from '../../hooks/useIsMobile'
import HabitCheckbox from './HabitCheckbox'
import EmojiPickerPopover from './EmojiPickerPopover'
import type { HabitDefinition } from '../../store/types'

const ACCENT_COLORS = ['#6366f1', '#10b981', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899', '#ef4444', '#f97316']

export default function HabitWeekView() {
  const habits = useAppStore((s) => s.habits)
  const habitCompletions = useAppStore((s) => s.habitCompletions)
  const toggleHabitCompletion = useAppStore((s) => s.toggleHabitCompletion)
  const setSelectedHabitId = useAppStore((s) => s.setSelectedHabitId)
  const addHabit = useAppStore((s) => s.addHabit)
  const isMobile = useIsMobile()
  const [anchor, setAnchor] = useState(() => new Date())
  const [showArchived, setShowArchived] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)

  const weekStart = startOfWeek(anchor, { weekStartsOn: 1 })
  const days = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  )

  const isCurrentWeek =
    format(weekStart, 'yyyy-MM-dd') === format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')

  const weekLabel = `${format(weekStart, 'MMM d')} – ${format(addWeeks(weekStart, 1), 'MMM d, yyyy')}`

  const weekStartStr = format(weekStart, 'yyyy-MM-dd')

  // Split habits into active daily, active weekly, and archived
  const allSorted = useMemo(
    () => [...habits].sort((a, b) => a.order - b.order),
    [habits]
  )
  const dailyHabits = useMemo(
    () => allSorted.filter((h) => !h.archived && (h.frequency ?? 'daily') === 'daily'),
    [allSorted]
  )
  const weeklyHabits = useMemo(
    () => allSorted.filter((h) => !h.archived && h.frequency === 'weekly'),
    [allSorted]
  )
  const archivedHabits = useMemo(
    () => allSorted.filter((h) => h.archived),
    [allSorted]
  )

  // Compute weekly completion counts for goal highlighting
  const weeklyCompletions = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const habit of [...dailyHabits, ...weeklyHabits]) {
      if (habit.frequency === 'weekly') {
        // Weekly habits: check if the week-start date has this habit
        counts[habit.id] = (habitCompletions[weekStartStr] ?? []).includes(habit.id) ? 1 : 0
      } else {
        // Daily habits: count completions across the 7 days
        let count = 0
        for (const day of days) {
          const dateStr = format(day, 'yyyy-MM-dd')
          if ((habitCompletions[dateStr] ?? []).includes(habit.id)) count++
        }
        counts[habit.id] = count
      }
    }
    return counts
  }, [dailyHabits, weeklyHabits, habitCompletions, days, weekStartStr])

  const isGoalMet = (habit: HabitDefinition) => {
    const goal = habit.frequency === 'weekly' ? 1 : habit.weeklyGoal
    if (!goal) return false
    return (weeklyCompletions[habit.id] ?? 0) >= goal
  }

  const handleAddHabit = (name: string, emoji: string, frequency: 'daily' | 'weekly') => {
    const maxOrder = habits.reduce((max, h) => Math.max(max, h.order), -1)
    addHabit({
      id: `habit-${Date.now()}`,
      name,
      emoji,
      order: maxOrder + 1,
      frequency,
    })
    setShowAddForm(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Navigation */}
      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{
            display: 'flex', alignItems: 'center',
            border: '1px solid var(--color-border)', borderRadius: 10, overflow: 'hidden',
          }}>
            <button onClick={() => setAnchor((a) => subWeeks(a, 1))} aria-label="Previous week" style={{
              width: 44, height: 40, flexShrink: 0, background: 'transparent', border: 'none',
              borderRight: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)', fontSize: 22, lineHeight: 1,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 300,
            }}>‹</button>
            <span style={{
              flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 700,
              color: 'var(--color-text-primary)', letterSpacing: '-0.3px',
            }}>
              {weekLabel}
            </span>
            <button onClick={() => setAnchor((a) => addWeeks(a, 1))} aria-label="Next week" style={{
              width: 44, height: 40, flexShrink: 0, background: 'transparent', border: 'none',
              borderLeft: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)', fontSize: 22, lineHeight: 1,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 300,
            }}>›</button>
          </div>
          {!isCurrentWeek && (
            <button onClick={() => setAnchor(new Date())} style={{
              padding: '5px 12px', borderRadius: 7, fontSize: 'var(--font-size-sm)',
              fontWeight: 600, color: 'var(--color-text-secondary)', background: 'transparent',
              border: '1px solid var(--color-border)', cursor: 'pointer', alignSelf: 'flex-start',
            }}>This week</button>
          )}
        </div>
      ) : (
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
      )}

      {/* Weekly habits — shown FIRST on mobile so they're always visible */}
      {weeklyHabits.length > 0 && (
        <WeeklyHabitsSection
          weeklyHabits={weeklyHabits}
          dailyHabitsLength={dailyHabits.length}
          habitCompletions={habitCompletions}
          weekStartStr={weekStartStr}
          toggleHabitCompletion={toggleHabitCompletion}
          setSelectedHabitId={setSelectedHabitId}
          isGoalMet={isGoalMet}
          isMobile={isMobile}
        />
      )}

      {/* Daily habits grid */}
      {dailyHabits.length > 0 && (
        isMobile ? (
          <MobileHabitGrid
            days={days}
            habits={dailyHabits}
            habitCompletions={habitCompletions}
            toggleHabitCompletion={toggleHabitCompletion}
            onHabitClick={setSelectedHabitId}
            isGoalMet={isGoalMet}
          />
        ) : (
          <DesktopHabitGrid
            days={days}
            habits={dailyHabits}
            habitCompletions={habitCompletions}
            toggleHabitCompletion={toggleHabitCompletion}
            onHabitClick={setSelectedHabitId}
            isGoalMet={isGoalMet}
          />
        )
      )}

      {/* Add habit button + modal */}
      <button
        onClick={() => setShowAddForm(true)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          padding: '10px 16px', borderRadius: 'var(--radius-md)',
          border: '1px dashed var(--color-border)',
          background: 'transparent', color: 'var(--color-text-tertiary)',
          fontSize: 'var(--font-size-sm)', fontWeight: 600, cursor: 'pointer',
        }}
      >
        + Add habit
      </button>
      {showAddForm && (
        <AddHabitModal onAdd={handleAddHabit} onCancel={() => setShowAddForm(false)} />
      )}

      {/* Archived habits toggle */}
      {archivedHabits.length > 0 && (
        <div>
          <button
            onClick={() => setShowArchived(!showArchived)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 'var(--font-size-xs)', fontWeight: 600,
              color: 'var(--color-text-tertiary)', padding: '4px 0',
            }}
          >
            {showArchived ? 'Hide' : 'Show'} archived ({archivedHabits.length})
          </button>
          {showArchived && (
            <div style={{
              marginTop: 8, background: 'var(--color-surface)',
              border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)',
              overflow: 'hidden', opacity: 0.6,
            }}>
              {archivedHabits.map((habit, hi) => (
                <div key={habit.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 16px',
                  borderBottom: hi < archivedHabits.length - 1 ? '1px solid var(--color-border)' : 'none',
                }}>
                  <span style={{ fontSize: 18 }}>{habit.emoji}</span>
                  <button
                    onClick={() => setSelectedHabitId(habit.id)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 'var(--font-size-sm)', fontWeight: 500,
                      color: 'var(--color-text-secondary)', padding: 0,
                      textDecoration: 'line-through',
                    }}
                  >
                    {habit.name}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Weekly habits section (shared mobile + desktop) ──────────────────────────

function WeeklyHabitsSection({
  weeklyHabits, dailyHabitsLength, habitCompletions, weekStartStr,
  toggleHabitCompletion, setSelectedHabitId, isGoalMet, isMobile,
}: {
  weeklyHabits: HabitDefinition[]
  dailyHabitsLength: number
  habitCompletions: Record<string, string[]>
  weekStartStr: string
  toggleHabitCompletion: (date: string, habitId: string) => void
  setSelectedHabitId: (id: string) => void
  isGoalMet: (habit: HabitDefinition) => boolean
  isMobile: boolean
}) {
  return (
    <div>
      <div style={{
        fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.06em', color: 'var(--color-text-tertiary)',
        marginBottom: 8,
      }}>
        This week
      </div>
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}>
        {weeklyHabits.map((habit, hi) => {
          const completed = (habitCompletions[weekStartStr] ?? []).includes(habit.id)
          const goalMet = isGoalMet(habit)
          return (
            <div key={habit.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: isMobile ? '14px 16px' : '12px 16px',
              borderBottom: hi < weeklyHabits.length - 1 ? '1px solid var(--color-border)' : 'none',
              background: goalMet ? 'rgba(16, 185, 129, 0.06)' : 'transparent',
            }}>
              <HabitCheckbox
                checked={completed}
                onToggle={() => toggleHabitCompletion(weekStartStr, habit.id)}
                color={ACCENT_COLORS[(dailyHabitsLength + hi) % ACCENT_COLORS.length]}
              />
              <button
                onClick={() => setSelectedHabitId(habit.id)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8, padding: 0, flex: 1,
                  minWidth: 0,
                }}
              >
                <span style={{ fontSize: 18, flexShrink: 0 }}>{habit.emoji}</span>
                <span style={{
                  fontSize: 'var(--font-size-sm)', fontWeight: 500,
                  color: 'var(--color-text-primary)',
                  textDecoration: completed ? 'line-through' : 'none',
                  opacity: completed ? 0.7 : 1,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {habit.name}
                </span>
                {goalMet && <GoalBadge />}
              </button>
              {/* Week-done pill */}
              <span style={{
                fontSize: 11, fontWeight: 600, flexShrink: 0,
                color: completed ? 'var(--color-habit-done)' : 'var(--color-text-tertiary)',
              }}>
                {completed ? 'Done ✓' : 'This week'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Desktop: original grid layout ────────────────────────────────────────────

function DesktopHabitGrid({ days, habits, habitCompletions, toggleHabitCompletion, onHabitClick, isGoalMet }: {
  days: Date[]
  habits: HabitDefinition[]
  habitCompletions: Record<string, string[]>
  toggleHabitCompletion: (date: string, habitId: string) => void
  onHabitClick: (id: string) => void
  isGoalMet: (habit: HabitDefinition) => boolean
}) {
  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
    }}>
      {/* Header row */}
      <div style={{
        display: 'grid', gridTemplateColumns: '180px repeat(7, 1fr)',
        borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)',
      }}>
        <div style={{ padding: '10px 16px' }} />
        {days.map((day) => {
          const today = isToday(day)
          return (
            <div key={format(day, 'yyyy-MM-dd')} style={{
              padding: '10px 8px', textAlign: 'center', borderLeft: '1px solid var(--color-border)',
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: today ? 'var(--color-accent)' : 'var(--color-text-tertiary)' }}>
                {format(day, 'EEE')}
              </div>
              <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: today ? 700 : 500, color: today ? 'var(--color-accent)' : 'var(--color-text-primary)', marginTop: 2 }}>
                {format(day, 'd')}
              </div>
            </div>
          )
        })}
      </div>

      {/* Habit rows */}
      {habits.map((habit, hi) => {
        const goalMet = isGoalMet(habit)
        return (
          <div key={habit.id} style={{
            display: 'grid', gridTemplateColumns: '180px repeat(7, 1fr)',
            borderBottom: hi < habits.length - 1 ? '1px solid var(--color-border)' : 'none',
            background: goalMet ? 'rgba(16, 185, 129, 0.06)' : 'transparent',
          }}>
            <button
              onClick={() => onHabitClick(habit.id)}
              style={{
                padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8,
                background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 18 }}>{habit.emoji}</span>
              <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--color-text-primary)' }}>{habit.name}</span>
              {goalMet && <GoalBadge />}
            </button>
            {days.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const completed = (habitCompletions[dateStr] ?? []).includes(habit.id)
              const today = isToday(day)
              return (
                <div key={dateStr} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderLeft: '1px solid var(--color-border)',
                  background: today ? 'var(--color-today-bg)' : 'transparent', padding: '8px 0',
                }}>
                  <HabitCheckbox
                    checked={completed}
                    onToggle={() => toggleHabitCompletion(dateStr, habit.id)}
                    color={ACCENT_COLORS[hi % ACCENT_COLORS.length]}
                  />
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

// ── Mobile: day-by-day stacked layout ────────────────────────────────────────

function MobileHabitGrid({ days, habits, habitCompletions, toggleHabitCompletion, onHabitClick, isGoalMet }: {
  days: Date[]
  habits: HabitDefinition[]
  habitCompletions: Record<string, string[]>
  toggleHabitCompletion: (date: string, habitId: string) => void
  onHabitClick: (id: string) => void
  isGoalMet: (habit: HabitDefinition) => boolean
}) {
  const todayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    todayRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' })
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {days.map((day) => {
        const dateStr = format(day, 'yyyy-MM-dd')
        const today = isToday(day)
        const completedCount = (habitCompletions[dateStr] ?? []).filter(
          (id) => habits.some((h) => h.id === id)
        ).length

        return (
          <div key={dateStr} ref={today ? todayRef : undefined} style={{
            background: today ? 'var(--color-today-bg)' : 'var(--color-surface)',
            border: today ? '1.5px solid var(--color-today-border)' : '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 12px',
          }}>
            {/* Day header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid var(--color-border-light)',
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{
                  fontSize: 18, fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1,
                  color: today ? 'var(--color-accent)' : 'var(--color-text-primary)',
                }}>
                  {format(day, 'd')}
                </span>
                <span style={{
                  fontSize: 12, fontWeight: 600,
                  color: today ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
                  textTransform: 'uppercase',
                }}>
                  {format(day, 'EEE')}
                </span>
              </div>
              <span style={{
                fontSize: 11, fontWeight: 600,
                color: completedCount === habits.length ? 'var(--color-habit-done)' : 'var(--color-text-tertiary)',
              }}>
                {completedCount}/{habits.length}
              </span>
            </div>

            {/* Habits list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {habits.map((habit, hi) => {
                const completed = (habitCompletions[dateStr] ?? []).includes(habit.id)
                const goalMet = isGoalMet(habit)
                return (
                  <div key={habit.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0',
                  }}>
                    <HabitCheckbox
                      checked={completed}
                      onToggle={() => toggleHabitCompletion(dateStr, habit.id)}
                      color={ACCENT_COLORS[hi % ACCENT_COLORS.length]}
                    />
                    <button
                      onClick={() => onHabitClick(habit.id)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 6, padding: 0,
                      }}
                    >
                      <span style={{ fontSize: 15 }}>{habit.emoji}</span>
                      <span style={{
                        fontSize: 'var(--font-size-sm)', fontWeight: completed ? 600 : 400,
                        color: completed ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                        textDecoration: completed ? 'line-through' : 'none',
                        opacity: completed ? 0.7 : 1,
                      }}>
                        {habit.name}
                      </span>
                      {goalMet && <GoalBadge />}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Goal met badge ──────────────────────────────────────────────────────────

function GoalBadge() {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 18, height: 18, borderRadius: '50%',
      background: '#10b981', color: '#fff', fontSize: 11, fontWeight: 700, lineHeight: 1,
      flexShrink: 0,
    }}>
      ✓
    </span>
  )
}

// ── Add habit modal ─────────────────────────────────────────────────────────

function AddHabitModal({ onAdd, onCancel }: {
  onAdd: (name: string, emoji: string, frequency: 'daily' | 'weekly') => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('✅')
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('daily')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onAdd(name.trim(), emoji, frequency)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onCancel}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.35)',
          zIndex: 200,
        }}
      />
      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 201,
        width: 340, maxWidth: 'calc(100vw - 32px)',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        padding: 20,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 16,
        }}>
          <span style={{
            fontSize: 'var(--font-size-base)', fontWeight: 700,
            color: 'var(--color-text-primary)',
          }}>
            New Habit
          </span>
          <button onClick={onCancel} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 18, color: 'var(--color-text-tertiary)', padding: 0, lineHeight: 1,
          }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <EmojiPickerPopover
              emoji={emoji}
              onChange={setEmoji}
              size={48}
              pickerSide="bottom"
            />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Habit name"
              autoFocus
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)', background: 'var(--color-bg)',
                fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)',
                fontFamily: 'inherit',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 0, borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
            {(['daily', 'weekly'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFrequency(f)}
                style={{
                  flex: 1, padding: '6px 8px',
                  fontSize: 'var(--font-size-xs)', fontWeight: 600,
                  border: 'none', cursor: 'pointer',
                  borderRight: f === 'daily' ? '1px solid var(--color-border)' : 'none',
                  background: frequency === f ? 'var(--color-accent)' : 'var(--color-bg)',
                  color: frequency === f ? '#fff' : 'var(--color-text-secondary)',
                }}
              >
                {f === 'daily' ? 'Daily' : 'Weekly'}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" onClick={onCancel} style={{
              padding: '6px 14px', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)', background: 'var(--color-bg)',
              fontSize: 'var(--font-size-sm)', fontWeight: 600,
              color: 'var(--color-text-secondary)', cursor: 'pointer',
            }}>Cancel</button>
            <button type="submit" disabled={!name.trim()} style={{
              padding: '6px 14px', borderRadius: 'var(--radius-sm)',
              border: 'none', background: 'var(--color-accent)',
              fontSize: 'var(--font-size-sm)', fontWeight: 600,
              color: '#fff', cursor: name.trim() ? 'pointer' : 'default',
              opacity: name.trim() ? 1 : 0.5,
            }}>Add</button>
          </div>
        </form>
      </div>
    </>
  )
}

// ── Shared UI ────────────────────────────────────────────────────────────────

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
