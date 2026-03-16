import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { CoachPlan, CoachPlanWeek, WeekDayIndex, PlannedActivity, PlannedExercise } from '../../store/types'
import { getPlannedActivityEmoji, getPlannedActivityLabel } from '../../utils/planningUtils'
import { parseISO, format, isWithinInterval, addDays } from 'date-fns'
import { useIsMobile } from '../../hooks/useIsMobile'

const MONDAY_FIRST_ORDER: WeekDayIndex[] = [1, 2, 3, 4, 5, 6, 0]
const DAY_ABBR = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

// ── Phase colors ─────────────────────────────────────────────────────────────
// Each phase gets a hue-based color. Works in light & dark via hsl with opacity.

type PhaseTheme = { hue: number; emoji: string }

const PHASE_KEYWORDS: [RegExp, PhaseTheme][] = [
  [/base/i,                { hue: 210, emoji: '🧱' }],   // blue
  [/build/i,               { hue: 250, emoji: '📈' }],   // indigo
  [/speed|tempo|interval/i,{ hue: 15,  emoji: '⚡' }],   // orange
  [/threshold|lactate/i,   { hue: 340, emoji: '🔥' }],   // rose
  [/peak/i,                { hue: 280, emoji: '🏔️' }],   // purple
  [/taper/i,               { hue: 160, emoji: '🍃' }],   // teal
  [/recover/i,             { hue: 140, emoji: '💚' }],   // green
  [/race|event/i,          { hue: 45,  emoji: '🏁' }],   // gold
  [/endurance|long/i,      { hue: 195, emoji: '🌊' }],   // cyan
]

const DEFAULT_PHASE: PhaseTheme = { hue: 220, emoji: '📅' }

function getPhaseTheme(label: string): PhaseTheme {
  for (const [re, theme] of PHASE_KEYWORDS) {
    if (re.test(label)) return theme
  }
  return DEFAULT_PHASE
}

function phaseColor(hue: number, type: 'solid' | 'light' | 'muted'): string {
  switch (type) {
    case 'solid': return `hsl(${hue}, 65%, 55%)`
    case 'light': return `hsla(${hue}, 60%, 55%, 0.12)`
    case 'muted': return `hsla(${hue}, 50%, 55%, 0.5)`
  }
}

type SelectedWorkout = {
  activity: PlannedActivity
  week: CoachPlanWeek
  dayIndex: number // index into MONDAY_FIRST_ORDER display order
}

interface Props {
  plan: CoachPlan
}

export default function CoachPlanGrid({ plan }: Props) {
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set())
  const [selected, setSelected] = useState<SelectedWorkout | null>(null)
  const isMobile = useIsMobile()
  const today = new Date()

  function isCurrentWeek(week: CoachPlanWeek): boolean {
    try {
      const ws = parseISO(week.weekStart)
      return isWithinInterval(today, { start: ws, end: addDays(ws, 6) })
    } catch { return false }
  }

  function weekMileage(week: CoachPlanWeek): number {
    let total = 0
    for (const dayIdx of MONDAY_FIRST_ORDER) {
      for (const a of week.days[dayIdx] ?? []) {
        if (a.type === 'Run') total += a.targetDistance
        if (a.type === 'Race' && a.distance) {
          const mi = parseFloat(a.distance)
          if (!isNaN(mi)) total += mi
        }
      }
    }
    return Math.round(total * 10) / 10
  }

  const maxMileage = Math.max(...plan.weeks.map(weekMileage), 1)

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px', position: 'relative' }}>
      {/* Plan title */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{
          margin: 0, fontSize: 20, fontWeight: 700,
          color: 'var(--color-text-primary)',
        }}>{plan.name}</h2>
        <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 13, color: 'var(--color-text-secondary)' }}>
          {plan.raceDate && <span>{format(parseISO(plan.raceDate), 'MMM d, yyyy')}</span>}
          {plan.raceDistance && <span>{plan.raceDistance}</span>}
          {plan.goalTime && <span>Goal: {plan.goalTime}</span>}
          <span>{plan.weeks.length} weeks</span>
        </div>
      </div>

      {/* Timeline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {plan.weeks.map((week) => {
          const current = isCurrentWeek(week)
          const expanded = expandedWeeks.has(week.weekNumber)
          const miles = weekMileage(week)
          const barWidth = Math.max((miles / maxMileage) * 100, 8)
          const phase = getPhaseTheme(week.label)
          const solid = phaseColor(phase.hue, 'solid')
          const light = phaseColor(phase.hue, 'light')

          return (
            <div key={week.weekNumber}>
              {/* Week row */}
              <button
                onClick={() => setExpandedWeeks((prev) => {
                  const next = new Set(prev)
                  if (next.has(week.weekNumber)) next.delete(week.weekNumber)
                  else next.add(week.weekNumber)
                  return next
                })}
                style={{
                  width: '100%', border: 'none', cursor: 'pointer',
                  background: current ? light : 'transparent',
                  borderRadius: expanded ? '8px 8px 0 0' : 8,
                  padding: '10px 12px',
                  display: 'flex', alignItems: 'center', gap: 12,
                  transition: 'background 120ms',
                }}
              >
                {/* Week number badge */}
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: solid,
                  color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, flexShrink: 0,
                }}>
                  {week.weekNumber}
                </div>

                {/* Label + date */}
                <div style={{ minWidth: 100, textAlign: 'left' }}>
                  <div style={{
                    fontSize: 13, fontWeight: 600,
                    color: current ? solid : 'var(--color-text-primary)',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <span>{phase.emoji}</span>
                    {week.label}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                    {formatWeekDate(week.weekStart)}
                  </div>
                </div>

                {/* Mileage bar */}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    height: 6, borderRadius: 3,
                    background: solid,
                    width: `${barWidth}%`,
                    transition: 'width 300ms ease',
                    opacity: current ? 1 : 0.5,
                  }} />
                  <span style={{
                    fontSize: 11, fontWeight: 600,
                    color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap',
                  }}>{miles} mi</span>
                </div>

                {/* Chevron */}
                <svg
                  width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="var(--color-text-tertiary)" strokeWidth="2"
                  style={{ transform: expanded ? 'rotate(180deg)' : undefined, transition: 'transform 150ms', flexShrink: 0 }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {/* Expanded: horizontal day cards */}
              {expanded && (
                <div style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderTop: 'none',
                  borderRadius: '0 0 8px 8px',
                  padding: '8px 12px 10px',
                  display: 'flex', gap: 6,
                }}>
                  {MONDAY_FIRST_ORDER.map((dayIdx, i) => {
                    const activities = week.days[dayIdx] ?? []
                    const isRest = activities.length === 0 || (activities.length === 1 && activities[0].type === 'Rest')

                    return (
                      <div
                        key={dayIdx}
                        onClick={() => {
                          if (!isRest && activities[0]) {
                            setSelected({ activity: activities[0], week, dayIndex: i })
                          }
                        }}
                        style={{
                          flex: 1,
                          borderRadius: 6,
                          border: '1px solid var(--color-border)',
                          padding: '6px 4px',
                          display: 'flex', flexDirection: 'column', alignItems: 'center',
                          gap: 2,
                          opacity: isRest ? 0.4 : 1,
                          minWidth: 0,
                          cursor: isRest ? 'default' : 'pointer',
                          transition: 'border-color 120ms',
                        }}
                        onMouseEnter={(e) => { if (!isRest) e.currentTarget.style.borderColor = 'var(--color-accent)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
                      >
                        <span style={{
                          fontSize: 10, fontWeight: 700,
                          color: 'var(--color-text-tertiary)',
                        }}>{DAY_ABBR[i]}</span>

                        {isRest ? (
                          <span style={{ fontSize: 12 }}>😴</span>
                        ) : (
                          activities.map((a) => (
                            <ActivityBubble key={a.id} activity={a} />
                          ))
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Workout detail panel */}
      <WorkoutDetailPanel
        data={selected}
        onClose={() => setSelected(null)}
        isMobile={isMobile}
      />
    </div>
  )
}

// ── Activity Bubble ───────────────────────────────────────────────────────────

function ActivityBubble({ activity }: { activity: PlannedActivity }) {
  const emoji = getPlannedActivityEmoji(activity)
  let label = ''
  let detail = ''

  if (activity.type === 'Run') {
    label = `${activity.targetDistance}mi`
    if (activity.targetPace && activity.targetPace !== '0:00') detail = activity.targetPace
  } else if (activity.type === 'WeightTraining') {
    label = activity.workoutType
  } else if (activity.type === 'Race') {
    label = activity.name || 'Race'
  } else {
    label = activity.type
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
    }}>
      <span style={{ fontSize: 14 }}>{emoji}</span>
      <span style={{
        fontSize: 10, fontWeight: 600, color: 'var(--color-text-primary)',
        textAlign: 'center', lineHeight: 1.2,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        maxWidth: '100%',
      }}>{label}</span>
      {detail && (
        <span style={{ fontSize: 9, color: 'var(--color-text-tertiary)' }}>{detail}</span>
      )}
    </div>
  )
}

// ── Workout Detail Panel ──────────────────────────────────────────────────────

function WorkoutDetailPanel({ data, onClose, isMobile }: {
  data: SelectedWorkout | null
  onClose: () => void
  isMobile: boolean
}) {
  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const activity = data?.activity ?? null
  const week = data?.week ?? null
  const dayName = data ? DAY_NAMES[data.dayIndex] : ''
  const emoji = activity ? getPlannedActivityEmoji(activity) : ''

  return (
    <AnimatePresence>
      {data && activity && week && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(17, 24, 39, 0.2)',
              backdropFilter: 'blur(1px)',
              zIndex: 40,
            }}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: isMobile ? 0 : '100%', y: isMobile ? '100%' : 0 }}
            animate={{ x: 0, y: 0 }}
            exit={{ x: isMobile ? 0 : '100%', y: isMobile ? '100%' : 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            style={{
              position: 'fixed',
              top: isMobile ? 'auto' : 0,
              right: 0,
              bottom: 0,
              left: isMobile ? 0 : undefined,
              width: isMobile ? '100%' : 380,
              maxWidth: isMobile ? '100%' : '92vw',
              maxHeight: isMobile ? '80vh' : undefined,
              background: 'var(--color-surface)',
              boxShadow: 'var(--shadow-panel)',
              zIndex: 50,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              borderRadius: isMobile ? '12px 12px 0 0' : undefined,
            }}
          >
            {/* Header */}
            <div style={{
              padding: isMobile ? '16px' : '16px 20px',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex', alignItems: 'flex-start', gap: 12, flexShrink: 0,
            }}>
              {/* Emoji badge */}
              <div style={{
                width: 40, height: 40, borderRadius: 'var(--radius-md)',
                background: 'var(--color-accent-light)',
                border: '1px solid var(--color-accent-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, flexShrink: 0,
              }}>
                {emoji}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{
                  fontSize: 'var(--font-size-md)', fontWeight: 600,
                  color: 'var(--color-text-primary)', margin: 0, marginBottom: 3,
                }}>
                  {getActivityTitle(activity)}
                </h2>
                <div style={{
                  fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)',
                  display: 'flex', gap: 8, alignItems: 'center',
                }}>
                  <span>{dayName}</span>
                  <span>·</span>
                  <span>Week {week.weekNumber} — {week.label}</span>
                </div>
              </div>

              {/* Close */}
              <button
                onClick={onClose}
                style={{
                  width: 32, height: 32, borderRadius: 'var(--radius-sm)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--color-text-tertiary)', fontSize: 22, flexShrink: 0,
                  border: '1px solid var(--color-border)', background: 'var(--color-bg)',
                  cursor: 'pointer',
                }}
              >×</button>
            </div>

            {/* Body */}
            <div style={{
              flex: 1, overflow: 'auto',
              padding: isMobile ? '16px' : '20px',
              display: 'flex', flexDirection: 'column', gap: 16,
            }}>
              {/* Stats grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {activity.type === 'Run' && (
                  <>
                    <StatCard label="Distance" value={`${activity.targetDistance} mi`} />
                    {activity.targetPace && activity.targetPace !== '0:00' && (
                      <StatCard label="Target Pace" value={`${activity.targetPace} /mi`} />
                    )}
                  </>
                )}

                {activity.type === 'WeightTraining' && (
                  <StatCard label="Workout" value={activity.workoutType} />
                )}
                {activity.type === 'WeightTraining' && activity.exercises && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <ExerciseTable exercises={activity.exercises} />
                  </div>
                )}

                {activity.type === 'Race' && (
                  <>
                    {activity.name && <StatCard label="Race" value={activity.name} />}
                    {activity.distance && <StatCard label="Distance" value={activity.distance} />}
                    {activity.goalTime && <StatCard label="Goal Time" value={activity.goalTime} />}
                    {activity.targetPace && <StatCard label="Target Pace" value={`${activity.targetPace} /mi`} />}
                  </>
                )}
              </div>

              {/* Workout structure / Notes */}
              {activity.notes && <WorkoutNotes notes={activity.notes} />}

              {/* Rest day message */}
              {activity.type === 'Rest' && (
                <div style={{
                  fontSize: 13, color: 'var(--color-text-tertiary)',
                  textAlign: 'center', padding: '24px 0',
                }}>
                  Recovery day — no structured workout planned.
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: 'var(--color-bg)', borderRadius: 'var(--radius-md)',
      padding: '12px 14px', border: '1px solid var(--color-border)',
    }}>
      <div style={{
        fontSize: 10, fontWeight: 600, color: 'var(--color-text-tertiary)',
        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4,
      }}>{label}</div>
      <div style={{
        fontSize: 'var(--font-size-lg)', fontWeight: 700,
        color: 'var(--color-text-primary)', letterSpacing: '-0.5px',
      }}>{value}</div>
    </div>
  )
}

function ExerciseTable({ exercises }: { exercises: PlannedExercise[] }) {
  return (
    <div style={{
      background: 'var(--color-bg)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--color-border)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 48px 56px',
        padding: '8px 14px',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <span style={tableHeaderStyle}>Exercise</span>
        <span style={{ ...tableHeaderStyle, textAlign: 'center' }}>Sets</span>
        <span style={{ ...tableHeaderStyle, textAlign: 'center' }}>Reps</span>
      </div>

      {/* Rows */}
      {exercises.map((ex, i) => (
        <div key={i} style={{
          display: 'grid', gridTemplateColumns: '1fr 48px 56px',
          padding: '9px 14px',
          borderBottom: i < exercises.length - 1 ? '1px solid var(--color-border-light)' : undefined,
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>
              {ex.name}
            </div>
            {ex.notes && (
              <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 1 }}>
                {ex.notes}
              </div>
            )}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', textAlign: 'center' }}>
            {ex.sets}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', textAlign: 'center' }}>
            {ex.reps}
          </div>
        </div>
      ))}
    </div>
  )
}

const tableHeaderStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: 'var(--color-text-tertiary)',
  textTransform: 'uppercase', letterSpacing: '0.08em',
}

function WorkoutNotes({ notes }: { notes: string }) {
  const segments = notes.includes('|') ? notes.split('|').map((s) => s.trim()).filter(Boolean) : null

  if (segments) {
    // Structured workout — render as step-by-step
    return (
      <div style={{
        background: 'var(--color-bg)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
        overflow: 'hidden',
      }}>
        <div style={{
          fontSize: 10, fontWeight: 700, color: 'var(--color-text-tertiary)',
          textTransform: 'uppercase', letterSpacing: '0.08em',
          padding: '10px 14px 6px',
        }}>Workout Structure</div>
        {segments.map((seg, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 14px',
            borderTop: i > 0 ? '1px solid var(--color-border-light)' : undefined,
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%',
              background: 'var(--color-border)',
              color: 'var(--color-text-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700, flexShrink: 0,
            }}>{i + 1}</div>
            <span style={{
              fontSize: 13, color: 'var(--color-text-primary)', lineHeight: 1.4,
            }}>{seg}</span>
          </div>
        ))}
      </div>
    )
  }

  // Plain notes
  return (
    <div style={{
      padding: '12px 14px',
      background: 'var(--color-bg)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--color-border)',
    }}>
      <div style={{
        fontSize: 10, fontWeight: 700, color: 'var(--color-text-tertiary)',
        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6,
      }}>Notes</div>
      <div style={{
        fontSize: 13, color: 'var(--color-text-primary)', lineHeight: 1.5,
      }}>{notes}</div>
    </div>
  )
}

function getActivityTitle(activity: PlannedActivity): string {
  switch (activity.type) {
    case 'Run': return 'Run'
    case 'WeightTraining': return 'Weight Training'
    case 'Yoga': return 'Yoga'
    case 'Tennis': return 'Tennis'
    case 'Race': return activity.name || 'Race'
    case 'Rest': return 'Rest Day'
    default: return (activity as any).type ?? 'Activity'
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatWeekDate(weekStart: string): string {
  try {
    return format(parseISO(weekStart), 'MMM d')
  } catch {
    return weekStart
  }
}
