import { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useIsMobile } from '../../hooks/useIsMobile'
import type { CoachPlan, CoachPlanWeek, WeekDayIndex, PlannedActivity } from '../../store/types'
import { getPlannedActivityEmoji } from '../../utils/planningUtils'
import { parseISO, startOfWeek, format, isWithinInterval, addDays } from 'date-fns'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface Props {
  plan: CoachPlan
  onEditActivity?: (week: CoachPlanWeek, dayIndex: WeekDayIndex, activity: PlannedActivity) => void
}

export default function CoachPlanGrid({ plan }: Props) {
  const isMobile = useIsMobile()
  const setDayOverride = useAppStore((s) => s.setDayOverride)
  const clearWeekOverride = useAppStore((s) => s.clearWeekOverride)
  const weekOverrides = useAppStore((s) => s.weekOverrides)
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null)

  // Determine current week
  const today = new Date()

  function isCurrentWeek(week: CoachPlanWeek): boolean {
    try {
      const ws = parseISO(week.weekStart)
      const we = addDays(ws, 6)
      return isWithinInterval(today, { start: ws, end: we })
    } catch { return false }
  }

  function isWeekOnCalendar(week: CoachPlanWeek): boolean {
    return weekOverrides.some((o) => o.weekStart === week.weekStart)
  }

  function addWeekToCalendar(week: CoachPlanWeek) {
    const ws = startOfWeek(parseISO(week.weekStart), { weekStartsOn: 0 })
    for (let d = 0; d <= 6; d++) {
      const dayActivities = week.days[d as WeekDayIndex] ?? []
      if (dayActivities.length > 0) {
        setDayOverride(ws, d as WeekDayIndex, dayActivities)
      }
    }
  }

  function removeWeekFromCalendar(week: CoachPlanWeek) {
    const ws = startOfWeek(parseISO(week.weekStart), { weekStartsOn: 0 })
    clearWeekOverride(ws)
  }

  function addDayToCalendar(week: CoachPlanWeek, dayIndex: WeekDayIndex) {
    const ws = startOfWeek(parseISO(week.weekStart), { weekStartsOn: 0 })
    const dayActivities = week.days[dayIndex] ?? []
    setDayOverride(ws, dayIndex, dayActivities)
  }

  if (isMobile) {
    return (
      <MobileGrid
        plan={plan}
        expandedWeek={expandedWeek}
        setExpandedWeek={setExpandedWeek}
        isCurrentWeek={isCurrentWeek}
        isWeekOnCalendar={isWeekOnCalendar}
        addWeekToCalendar={addWeekToCalendar}
        removeWeekFromCalendar={removeWeekFromCalendar}
        addDayToCalendar={addDayToCalendar}
      />
    )
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
      {/* Plan header */}
      <PlanHeader plan={plan} />

      {/* Desktop grid table */}
      <div style={{
        border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
        overflow: 'hidden', background: 'var(--color-surface)',
      }}>
        {/* Header row */}
        <div style={{
          display: 'grid', gridTemplateColumns: '80px repeat(7, 1fr) 130px',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-bg)',
        }}>
          <div style={thStyle}>Week</div>
          {DAY_LABELS.map((d) => (
            <div key={d} style={thStyle}>{d}</div>
          ))}
          <div style={thStyle}>Actions</div>
        </div>

        {/* Week rows */}
        {plan.weeks.map((week) => {
          const current = isCurrentWeek(week)
          const onCal = isWeekOnCalendar(week)

          return (
            <div
              key={week.weekNumber}
              style={{
                display: 'grid', gridTemplateColumns: '80px repeat(7, 1fr) 130px',
                borderBottom: '1px solid var(--color-border)',
                background: current ? 'var(--color-accent-light)' : undefined,
              }}
            >
              {/* Week label */}
              <div style={{
                padding: '8px 10px', display: 'flex', flexDirection: 'column',
                justifyContent: 'center', borderRight: '1px solid var(--color-border)',
              }}>
                <div style={{
                  fontSize: 11, fontWeight: 700,
                  color: current ? 'var(--color-accent)' : 'var(--color-text-primary)',
                }}>Wk {week.weekNumber}</div>
                <div style={{
                  fontSize: 9, color: 'var(--color-text-tertiary)',
                  marginTop: 2,
                }}>{week.label}</div>
                <div style={{
                  fontSize: 9, color: 'var(--color-text-tertiary)',
                  marginTop: 1,
                }}>{formatWeekDate(week.weekStart)}</div>
              </div>

              {/* Day cells */}
              {[0, 1, 2, 3, 4, 5, 6].map((d) => {
                const activities = week.days[d as WeekDayIndex] ?? []
                return (
                  <DayCell
                    key={d}
                    activities={activities}
                    onAddDay={() => addDayToCalendar(week, d as WeekDayIndex)}
                  />
                )
              })}

              {/* Actions */}
              <div style={{
                padding: '6px 8px', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 4,
                borderLeft: '1px solid var(--color-border)',
              }}>
                {onCal ? (
                  <>
                    <span style={{
                      fontSize: 10, fontWeight: 600, color: 'var(--color-status-completed-text)',
                      display: 'flex', alignItems: 'center', gap: 3,
                    }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      On calendar
                    </span>
                    <button
                      onClick={() => removeWeekFromCalendar(week)}
                      style={smallBtnStyle}
                    >Remove</button>
                  </>
                ) : (
                  <button
                    onClick={() => addWeekToCalendar(week)}
                    style={{
                      ...smallBtnStyle,
                      background: 'var(--color-accent)',
                      color: 'var(--color-text-inverse)',
                      border: 'none',
                    }}
                  >Add to calendar</button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Plan Header ─────────────────────────────────────────────────────────────

function PlanHeader({ plan }: { plan: CoachPlan }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h2 style={{
        margin: 0, fontSize: 'var(--font-size-lg)', fontWeight: 700,
        color: 'var(--color-text-primary)',
      }}>{plan.name}</h2>
      <div style={{
        display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 6,
      }}>
        {plan.raceDate && (
          <InfoChip label="Race" value={format(parseISO(plan.raceDate), 'MMM d, yyyy')} />
        )}
        {plan.raceDistance && <InfoChip label="Distance" value={plan.raceDistance} />}
        {plan.goalTime && <InfoChip label="Goal" value={plan.goalTime} />}
        <InfoChip label="Weeks" value={String(plan.weeks.length)} />
        {plan.preferences?.runDaysPerWeek && (
          <InfoChip label="Runs/wk" value={String(plan.preferences.runDaysPerWeek)} />
        )}
        {plan.preferences?.liftDaysPerWeek !== undefined && plan.preferences.liftDaysPerWeek > 0 && (
          <InfoChip label="Lifts/wk" value={String(plan.preferences.liftDaysPerWeek)} />
        )}
      </div>
    </div>
  )
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <span style={{
      fontSize: 11, color: 'var(--color-text-secondary)',
      background: 'var(--color-bg)', padding: '3px 8px',
      borderRadius: 'var(--radius-full)', border: '1px solid var(--color-border)',
    }}>
      <strong>{label}:</strong> {value}
    </span>
  )
}

// ── Day Cell ────────────────────────────────────────────────────────────────

function DayCell({
  activities,
  onAddDay,
}: {
  activities: PlannedActivity[]
  onAddDay: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '6px 4px', minHeight: 56,
        borderRight: '1px solid var(--color-border)',
        position: 'relative',
        display: 'flex', flexDirection: 'column', gap: 2,
      }}
    >
      {activities.length === 0 ? (
        <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', textAlign: 'center', marginTop: 8 }}>—</span>
      ) : (
        activities.map((a) => (
          <ActivityPill key={a.id} activity={a} />
        ))
      )}
      {hovered && activities.length > 0 && (
        <button
          onClick={onAddDay}
          title="Add this day to calendar"
          style={{
            position: 'absolute', top: 2, right: 2,
            width: 16, height: 16, borderRadius: 4,
            background: 'var(--color-accent)', color: 'white',
            border: 'none', cursor: 'pointer', fontSize: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            lineHeight: 1,
          }}
        >+</button>
      )}
    </div>
  )
}

function ActivityPill({ activity }: { activity: PlannedActivity }) {
  const emoji = getPlannedActivityEmoji(activity)
  let label: string = activity.type
  let detail = ''

  if (activity.type === 'Run') {
    label = `${activity.targetDistance}mi`
    if (activity.targetPace && activity.targetPace !== '0:00') detail = activity.targetPace
  } else if (activity.type === 'WeightTraining') {
    label = activity.workoutType
  } else if (activity.type === 'Race') {
    label = activity.name || 'Race'
  }

  const isRest = activity.type === 'Rest'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 3,
      padding: '2px 5px', borderRadius: 4,
      background: isRest ? 'transparent' : 'var(--color-bg)',
      fontSize: 10,
    }}>
      <span style={{ fontSize: 10 }}>{emoji}</span>
      <span style={{
        fontWeight: 600,
        color: isRest ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{label}</span>
      {detail && (
        <span style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }}>{detail}</span>
      )}
    </div>
  )
}

// ── Mobile Grid ─────────────────────────────────────────────────────────────

function MobileGrid({
  plan,
  expandedWeek,
  setExpandedWeek,
  isCurrentWeek,
  isWeekOnCalendar,
  addWeekToCalendar,
  removeWeekFromCalendar,
  addDayToCalendar,
}: {
  plan: CoachPlan
  expandedWeek: number | null
  setExpandedWeek: (n: number | null) => void
  isCurrentWeek: (w: CoachPlanWeek) => boolean
  isWeekOnCalendar: (w: CoachPlanWeek) => boolean
  addWeekToCalendar: (w: CoachPlanWeek) => void
  removeWeekFromCalendar: (w: CoachPlanWeek) => void
  addDayToCalendar: (w: CoachPlanWeek, d: WeekDayIndex) => void
}) {
  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
      <PlanHeader plan={plan} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {plan.weeks.map((week) => {
          const current = isCurrentWeek(week)
          const onCal = isWeekOnCalendar(week)
          const expanded = expandedWeek === week.weekNumber

          return (
            <div key={week.weekNumber} style={{
              border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              background: current ? 'var(--color-accent-light)' : 'var(--color-surface)',
            }}>
              {/* Week header (tap to expand) */}
              <button
                onClick={() => setExpandedWeek(expanded ? null : week.weekNumber)}
                style={{
                  width: '100%', padding: '10px 12px',
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 700,
                    color: current ? 'var(--color-accent)' : 'var(--color-text-primary)',
                  }}>
                    Week {week.weekNumber} — {week.label}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                    {formatWeekDate(week.weekStart)}
                    {onCal && ' · On calendar'}
                  </div>
                </div>
                <MiniWeekPreview week={week} />
                <svg
                  width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="var(--color-text-tertiary)" strokeWidth="2"
                  style={{ transform: expanded ? 'rotate(180deg)' : undefined, transition: 'transform 150ms' }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {/* Expanded content */}
              {expanded && (
                <div style={{
                  borderTop: '1px solid var(--color-border)', padding: '8px 12px 12px',
                }}>
                  {[0, 1, 2, 3, 4, 5, 6].map((d) => {
                    const activities = week.days[d as WeekDayIndex] ?? []
                    return (
                      <div key={d} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '6px 0',
                        borderBottom: d < 6 ? '1px solid var(--color-border-light, rgba(0,0,0,0.06))' : undefined,
                      }}>
                        <span style={{
                          width: 28, fontSize: 10, fontWeight: 600,
                          color: 'var(--color-text-tertiary)', flexShrink: 0,
                        }}>{DAY_LABELS[d]}</span>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {activities.length === 0 ? (
                            <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>—</span>
                          ) : (
                            activities.map((a) => <ActivityPill key={a.id} activity={a} />)
                          )}
                        </div>
                        {activities.length > 0 && (
                          <button
                            onClick={() => addDayToCalendar(week, d as WeekDayIndex)}
                            style={{
                              padding: '3px 6px', borderRadius: 4,
                              fontSize: 9, fontWeight: 600,
                              border: '1px solid var(--color-border)',
                              background: 'transparent',
                              color: 'var(--color-text-secondary)',
                              cursor: 'pointer', flexShrink: 0,
                            }}
                          >+ Cal</button>
                        )}
                      </div>
                    )
                  })}

                  {/* Week action buttons */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    {onCal ? (
                      <>
                        <span style={{
                          fontSize: 11, fontWeight: 600, color: 'var(--color-status-completed-text)',
                          display: 'flex', alignItems: 'center', gap: 4, flex: 1,
                        }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          On calendar
                        </span>
                        <button
                          onClick={() => removeWeekFromCalendar(week)}
                          style={smallBtnStyle}
                        >Remove</button>
                      </>
                    ) : (
                      <button
                        onClick={() => addWeekToCalendar(week)}
                        style={{
                          ...smallBtnStyle,
                          background: 'var(--color-accent)',
                          color: 'var(--color-text-inverse)',
                          border: 'none',
                          flex: 1,
                        }}
                      >Add entire week to calendar</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Mini Week Preview (mobile collapsed) ────────────────────────────────────

function MiniWeekPreview({ week }: { week: CoachPlanWeek }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[0, 1, 2, 3, 4, 5, 6].map((d) => {
        const activities = week.days[d as WeekDayIndex] ?? []
        const hasActivity = activities.length > 0 && activities[0].type !== 'Rest'
        return (
          <div key={d} style={{
            width: 6, height: 6, borderRadius: '50%',
            background: hasActivity ? 'var(--color-accent)' : 'var(--color-border)',
          }} />
        )
      })}
    </div>
  )
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatWeekDate(weekStart: string): string {
  try {
    return format(parseISO(weekStart), 'MMM d')
  } catch {
    return weekStart
  }
}

const thStyle: React.CSSProperties = {
  padding: '8px 6px', fontSize: 10, fontWeight: 700,
  color: 'var(--color-text-tertiary)', textTransform: 'uppercase',
  letterSpacing: '0.06em', textAlign: 'center',
}

const smallBtnStyle: React.CSSProperties = {
  padding: '4px 8px', borderRadius: 4,
  fontSize: 10, fontWeight: 600,
  border: '1px solid var(--color-border)',
  background: 'transparent',
  color: 'var(--color-text-secondary)',
  cursor: 'pointer',
}
