import { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useIsMobile } from '../../hooks/useIsMobile'
import type { CoachPlan, CoachPlanWeek, WeekDayIndex, PlannedActivity } from '../../store/types'
import { getPlannedActivityEmoji } from '../../utils/planningUtils'
import { parseISO, startOfWeek, format, isWithinInterval, addDays } from 'date-fns'

// Monday-first display order: Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6, Sun=0
const MONDAY_FIRST_ORDER: WeekDayIndex[] = [1, 2, 3, 4, 5, 6, 0]
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

type SelectedActivity = {
  week: CoachPlanWeek
  dayIndex: WeekDayIndex
  activity: PlannedActivity
}

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
  const [selectedActivity, setSelectedActivity] = useState<SelectedActivity | null>(null)

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
      <>
        <MobileGrid
          plan={plan}
          expandedWeek={expandedWeek}
          setExpandedWeek={setExpandedWeek}
          isCurrentWeek={isCurrentWeek}
          isWeekOnCalendar={isWeekOnCalendar}
          addWeekToCalendar={addWeekToCalendar}
          removeWeekFromCalendar={removeWeekFromCalendar}
          addDayToCalendar={addDayToCalendar}
          onActivityClick={setSelectedActivity}
        />
        <WorkoutDetailPanel
          data={selectedActivity}
          onClose={() => setSelectedActivity(null)}
          isMobile={true}
        />
      </>
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

              {/* Day cells - Monday first */}
              {MONDAY_FIRST_ORDER.map((dayIdx, i) => {
                const activities = week.days[dayIdx] ?? []
                return (
                  <DayCell
                    key={dayIdx}
                    activities={activities}
                    onAddDay={() => addDayToCalendar(week, dayIdx)}
                    onActivityClick={(activity) => setSelectedActivity({ week, dayIndex: dayIdx, activity })}
                    isLast={i === 6}
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

      {/* Workout detail panel */}
      <WorkoutDetailPanel
        data={selectedActivity}
        onClose={() => setSelectedActivity(null)}
        isMobile={false}
      />
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
  onActivityClick,
  isLast,
}: {
  activities: PlannedActivity[]
  onAddDay: () => void
  onActivityClick: (activity: PlannedActivity) => void
  isLast?: boolean
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '6px 4px', minHeight: 56,
        borderRight: isLast ? undefined : '1px solid var(--color-border)',
        position: 'relative',
        display: 'flex', flexDirection: 'column', gap: 2,
      }}
    >
      {activities.length === 0 ? (
        <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', textAlign: 'center', marginTop: 8 }}>—</span>
      ) : (
        activities.map((a) => (
          <ActivityPill key={a.id} activity={a} onClick={() => onActivityClick(a)} />
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

function ActivityPill({ activity, onClick }: { activity: PlannedActivity; onClick?: () => void }) {
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
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 3,
        padding: '2px 5px', borderRadius: 4,
        background: isRest ? 'transparent' : 'var(--color-bg)',
        fontSize: 10,
        cursor: onClick && !isRest ? 'pointer' : 'default',
        transition: 'opacity 120ms',
      }}
      onMouseEnter={(e) => { if (onClick && !isRest) (e.currentTarget as HTMLElement).style.opacity = '0.75' }}
      onMouseLeave={(e) => { if (onClick && !isRest) (e.currentTarget as HTMLElement).style.opacity = '1' }}
    >
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

// ── Workout Detail Panel ─────────────────────────────────────────────────────

function WorkoutDetailPanel({
  data,
  onClose,
  isMobile,
}: {
  data: SelectedActivity | null
  onClose: () => void
  isMobile: boolean
}) {
  if (!data) return null

  const { week, dayIndex, activity } = data
  const emoji = getPlannedActivityEmoji(activity)
  const dayName = DAY_LABELS[MONDAY_FIRST_ORDER.indexOf(dayIndex)]

  const panelStyle: React.CSSProperties = isMobile ? {
    position: 'fixed', left: 0, right: 0, bottom: 0,
    background: 'var(--color-surface)',
    borderTop: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
    boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
    zIndex: 200,
    padding: '20px 16px 32px',
    maxHeight: '70vh',
    overflowY: 'auto',
  } : {
    position: 'fixed', top: 0, right: 0, bottom: 0,
    width: 320,
    background: 'var(--color-surface)',
    borderLeft: '1px solid var(--color-border)',
    boxShadow: '-4px 0 24px rgba(0,0,0,0.10)',
    zIndex: 200,
    padding: '20px 20px 32px',
    overflowY: 'auto',
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 199,
          background: 'rgba(0,0,0,0.15)',
        }}
      />
      <div style={panelStyle}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 24 }}>{emoji}</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {getActivityTitle(activity)}
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
              {dayName} · Week {week.weekNumber} — {week.label}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: '50%',
              border: '1px solid var(--color-border)',
              background: 'transparent', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--color-text-secondary)', flexShrink: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {activity.type === 'Run' && (
            <>
              <DetailRow label="Distance" value={`${activity.targetDistance} miles`} />
              {activity.targetPace && activity.targetPace !== '0:00' && (
                <DetailRow label="Target Pace" value={`${activity.targetPace} /mi`} />
              )}
            </>
          )}

          {activity.type === 'WeightTraining' && (
            <DetailRow label="Workout Type" value={activity.workoutType} />
          )}

          {activity.type === 'Race' && (
            <>
              {activity.name && <DetailRow label="Race Name" value={activity.name} />}
              {(activity as { type: 'Race'; name?: string; distance?: string; goalTime?: string; notes?: string }).distance && (
                <DetailRow label="Distance" value={(activity as { type: 'Race'; name?: string; distance?: string; goalTime?: string; notes?: string }).distance!} />
              )}
              {(activity as { type: 'Race'; name?: string; distance?: string; goalTime?: string; notes?: string }).goalTime && (
                <DetailRow label="Goal Time" value={(activity as { type: 'Race'; name?: string; distance?: string; goalTime?: string; notes?: string }).goalTime!} />
              )}
            </>
          )}

          {activity.notes && (
            <div style={{
              padding: '10px 12px',
              background: 'var(--color-bg)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                Notes
              </div>
              <div style={{ fontSize: 13, color: 'var(--color-text-primary)', lineHeight: 1.5 }}>
                {activity.notes}
              </div>
            </div>
          )}

          {activity.type === 'Rest' && (
            <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', textAlign: 'center', padding: '16px 0' }}>
              Recovery day — no structured workout planned.
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '8px 0', borderBottom: '1px solid var(--color-border-light, rgba(0,0,0,0.06))',
    }}>
      <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 13, color: 'var(--color-text-primary)', fontWeight: 500 }}>{value}</span>
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
    default: return (activity as PlannedActivity).type
  }
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
  onActivityClick,
}: {
  plan: CoachPlan
  expandedWeek: number | null
  setExpandedWeek: (n: number | null) => void
  isCurrentWeek: (w: CoachPlanWeek) => boolean
  isWeekOnCalendar: (w: CoachPlanWeek) => boolean
  addWeekToCalendar: (w: CoachPlanWeek) => void
  removeWeekFromCalendar: (w: CoachPlanWeek) => void
  addDayToCalendar: (w: CoachPlanWeek, d: WeekDayIndex) => void
  onActivityClick: (data: SelectedActivity) => void
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
                  {MONDAY_FIRST_ORDER.map((dayIdx, i) => {
                    const activities = week.days[dayIdx] ?? []
                    return (
                      <div key={dayIdx} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '6px 0',
                        borderBottom: i < 6 ? '1px solid var(--color-border-light, rgba(0,0,0,0.06))' : undefined,
                      }}>
                        <span style={{
                          width: 28, fontSize: 10, fontWeight: 600,
                          color: 'var(--color-text-tertiary)', flexShrink: 0,
                        }}>{DAY_LABELS[i]}</span>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {activities.length === 0 ? (
                            <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>—</span>
                          ) : (
                            activities.map((a) => (
                              <ActivityPill
                                key={a.id}
                                activity={a}
                                onClick={a.type !== 'Rest' ? () => onActivityClick({ week, dayIndex: dayIdx, activity: a }) : undefined}
                              />
                            ))
                          )}
                        </div>
                        {activities.length > 0 && (
                          <button
                            onClick={() => addDayToCalendar(week, dayIdx)}
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
      {MONDAY_FIRST_ORDER.map((dayIdx) => {
        const activities = week.days[dayIdx] ?? []
        const hasActivity = activities.length > 0 && activities[0].type !== 'Rest'
        return (
          <div key={dayIdx} style={{
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
