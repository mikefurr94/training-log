import { useState, useEffect, useRef, useCallback } from 'react'
import { AnimatePresence, motion, Reorder } from 'framer-motion'
import type { CoachPlan, CoachPlanWeek, WeekDayIndex, PlannedActivity, PlannedExercise } from '../../store/types'
import { getPlannedActivityEmoji } from '../../utils/planningUtils'
import { parseISO, format, isWithinInterval, addDays } from 'date-fns'
import { useIsMobile } from '../../hooks/useIsMobile'
import { useAppStore } from '../../store/useAppStore'

const MONDAY_FIRST_ORDER: WeekDayIndex[] = [1, 2, 3, 4, 5, 6, 0]
const DAY_ABBR = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

// ── Phase colors ─────────────────────────────────────────────────────────────

type PhaseTheme = { hue: number; emoji: string }

const PHASE_KEYWORDS: [RegExp, PhaseTheme][] = [
  [/base/i,                { hue: 210, emoji: '🧱' }],
  [/build/i,               { hue: 250, emoji: '📈' }],
  [/speed|tempo|interval/i,{ hue: 15,  emoji: '⚡' }],
  [/threshold|lactate/i,   { hue: 340, emoji: '🔥' }],
  [/peak/i,                { hue: 280, emoji: '🏔️' }],
  [/taper/i,               { hue: 160, emoji: '🍃' }],
  [/recover/i,             { hue: 140, emoji: '💚' }],
  [/race|event/i,          { hue: 45,  emoji: '🏁' }],
  [/endurance|long/i,      { hue: 195, emoji: '🌊' }],
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

// ── Types & helpers ──────────────────────────────────────────────────────────

type SelectedWorkout = {
  weekNumber: number
  dayIndex: number // display index into MONDAY_FIRST_ORDER (0=Mon..6=Sun)
  activityId: string
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10)
}

let patchTimer: ReturnType<typeof setTimeout> | undefined
function debouncedPersist(athleteId: number, planId: string, weeks: CoachPlanWeek[]) {
  clearTimeout(patchTimer)
  patchTimer = setTimeout(() => {
    fetch(`/api/coach-plan?athlete_id=${athleteId}&plan_id=${planId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weeks }),
    })
  }, 500)
}

function getUpdatedWeeks(
  plan: CoachPlan, weekNumber: number, dayIdx: WeekDayIndex, activities: PlannedActivity[]
): CoachPlanWeek[] {
  return plan.weeks.map(w =>
    w.weekNumber === weekNumber
      ? { ...w, days: { ...w.days, [dayIdx]: activities } }
      : w
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

interface Props { plan: CoachPlan }

export default function CoachPlanGrid({ plan }: Props) {
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set())
  const [selected, setSelected] = useState<SelectedWorkout | null>(null)
  const [addedWeeks, setAddedWeeks] = useState<Set<number>>(new Set())

  // Name editing
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(plan.name)
  const [savingName, setSavingName] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  const isMobile = useIsMobile()
  const today = new Date()
  const athleteId = useAppStore((s) => s.athlete?.id)
  const setCoachPlan = useAppStore((s) => s.setCoachPlan)
  const updateCoachPlanWeek = useAppStore((s) => s.updateCoachPlanWeek)
  const setDayOverride = useAppStore((s) => s.setDayOverride)
  const getWeekPlan = useAppStore((s) => s.getWeekPlan)

  useEffect(() => { setNameValue(plan.name) }, [plan.name])

  async function saveName() {
    const trimmed = nameValue.trim()
    if (!trimmed || trimmed === plan.name) {
      setNameValue(plan.name)
      setEditingName(false)
      return
    }
    setSavingName(true)
    try {
      const res = await fetch(`/api/coach-plan?athlete_id=${athleteId}&plan_id=${plan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })
      if (res.ok) setCoachPlan({ ...plan, name: trimmed })
      else setNameValue(plan.name)
    } catch { setNameValue(plan.name) }
    finally { setSavingName(false); setEditingName(false) }
  }

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

  // ── Save activity field (called from detail panel) ──

  const saveActivity = useCallback((updatedActivity: PlannedActivity) => {
    if (!selected || !athleteId) return
    const weekDayIdx = MONDAY_FIRST_ORDER[selected.dayIndex]
    const week = plan.weeks.find(w => w.weekNumber === selected.weekNumber)
    if (!week) return
    const dayActivities = (week.days[weekDayIdx] ?? []).map(a =>
      a.id === updatedActivity.id ? updatedActivity : a
    )
    updateCoachPlanWeek(week.weekNumber, { [weekDayIdx]: dayActivities })
    debouncedPersist(athleteId, plan.id, getUpdatedWeeks(plan, week.weekNumber, weekDayIdx, dayActivities))
  }, [selected, athleteId, plan, updateCoachPlanWeek])

  // ── Add individual activity to training ──

  const addActivityToTraining = useCallback((week: CoachPlanWeek, dayDisplayIndex: number, activity: PlannedActivity) => {
    const dayIdx = MONDAY_FIRST_ORDER[dayDisplayIndex]
    const date = addDays(parseISO(week.weekStart), dayDisplayIndex)
    const existing = getWeekPlan(date)[dayIdx] ?? []
    const cloned = { ...activity, id: generateId() }
    setDayOverride(date, dayIdx, [...existing, cloned])
  }, [getWeekPlan, setDayOverride])

  // ── Add entire week to training ──

  function handleAddWeekToTraining(week: CoachPlanWeek) {
    for (let i = 0; i < MONDAY_FIRST_ORDER.length; i++) {
      const dayIdx = MONDAY_FIRST_ORDER[i]
      const activities = week.days[dayIdx] ?? []
      const nonRest = activities.filter(a => a.type !== 'Rest')
      if (nonRest.length === 0) continue
      const date = addDays(parseISO(week.weekStart), i)
      const existing = getWeekPlan(date)[dayIdx] ?? []
      const cloned = nonRest.map(a => ({ ...a, id: generateId() }))
      setDayOverride(date, dayIdx, [...existing, ...cloned])
    }
    setAddedWeeks(prev => new Set(prev).add(week.weekNumber))
    setTimeout(() => {
      setAddedWeeks(prev => { const n = new Set(prev); n.delete(week.weekNumber); return n })
    }, 2500)
  }

  const maxMileage = Math.max(...plan.weeks.map(weekMileage), 1)

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px', position: 'relative' }}>
      {/* Plan title */}
      <div style={{ marginBottom: 20 }}>
        {editingName ? (
          <input
            ref={nameInputRef}
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); nameInputRef.current?.blur() }
              if (e.key === 'Escape') { setNameValue(plan.name); setEditingName(false) }
            }}
            disabled={savingName}
            autoFocus
            style={{
              margin: 0, fontSize: 20, fontWeight: 700,
              color: 'var(--color-text-primary)',
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: 6, padding: '2px 8px',
              outline: 'none', width: '100%', maxWidth: 400,
            }}
          />
        ) : (
          <h2
            onClick={() => setEditingName(true)}
            title="Click to rename"
            style={{
              margin: 0, fontSize: 20, fontWeight: 700,
              color: 'var(--color-text-primary)',
              cursor: 'text', display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
          >
            {plan.name}
            <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--color-text-secondary)', opacity: 0.6 }}>✎</span>
          </h2>
        )}
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
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: solid, color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, flexShrink: 0,
                }}>{week.weekNumber}</div>

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

                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    height: 6, borderRadius: 3, background: solid,
                    width: `${barWidth}%`, transition: 'width 300ms ease',
                    opacity: current ? 1 : 0.5,
                  }} />
                  <span style={{
                    fontSize: 11, fontWeight: 600,
                    color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap',
                  }}>{miles} mi</span>
                </div>

                <svg
                  width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="var(--color-text-tertiary)" strokeWidth="2"
                  style={{ transform: expanded ? 'rotate(180deg)' : undefined, transition: 'transform 150ms', flexShrink: 0 }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {/* Expanded: day cards + "Add Week" button */}
              {expanded && (
                <div style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderTop: 'none',
                  borderRadius: '0 0 8px 8px',
                  padding: '8px 12px 10px',
                }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {MONDAY_FIRST_ORDER.map((dayIdx, i) => {
                      const activities = week.days[dayIdx] ?? []
                      const isRest = activities.length === 0 || (activities.length === 1 && activities[0].type === 'Rest')

                      return (
                        <div
                          key={dayIdx}
                          onClick={() => {
                            if (!isRest && activities[0]) {
                              setSelected({ weekNumber: week.weekNumber, dayIndex: i, activityId: activities[0].id })
                            }
                          }}
                          style={{
                            flex: 1, borderRadius: 6,
                            border: '1px solid var(--color-border)',
                            padding: '6px 4px',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                            opacity: isRest ? 0.4 : 1,
                            minWidth: 0,
                            cursor: isRest ? 'default' : 'pointer',
                            transition: 'border-color 120ms',
                          }}
                          onMouseEnter={(e) => { if (!isRest) e.currentTarget.style.borderColor = 'var(--color-accent)' }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
                        >
                          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-tertiary)' }}>{DAY_ABBR[i]}</span>
                          {isRest ? (
                            <span style={{ fontSize: 12 }}>😴</span>
                          ) : (
                            activities.map((a) => <ActivityBubble key={a.id} activity={a} />)
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Add Week to Training */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                    <AddToTrainingButton
                      label="Add Week to Training"
                      added={addedWeeks.has(week.weekNumber)}
                      onClick={() => handleAddWeekToTraining(week)}
                      small
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Workout detail panel */}
      <WorkoutDetailPanel
        plan={plan}
        selected={selected}
        onClose={() => setSelected(null)}
        onSaveActivity={saveActivity}
        onAddToTraining={addActivityToTraining}
        isMobile={isMobile}
      />
    </div>
  )
}

// ── Activity Bubble ──────────────────────────────────────────────────────────

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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
      <span style={{ fontSize: 14 }}>{emoji}</span>
      <span style={{
        fontSize: 10, fontWeight: 600, color: 'var(--color-text-primary)',
        textAlign: 'center', lineHeight: 1.2,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%',
      }}>{label}</span>
      {detail && <span style={{ fontSize: 9, color: 'var(--color-text-tertiary)' }}>{detail}</span>}
    </div>
  )
}

// ── Workout Detail Panel ─────────────────────────────────────────────────────

function WorkoutDetailPanel({ plan, selected, onClose, onSaveActivity, onAddToTraining, isMobile }: {
  plan: CoachPlan
  selected: SelectedWorkout | null
  onClose: () => void
  onSaveActivity: (activity: PlannedActivity) => void
  onAddToTraining: (week: CoachPlanWeek, dayIndex: number, activity: PlannedActivity) => void
  isMobile: boolean
}) {
  const [addedToTraining, setAddedToTraining] = useState(false)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Reset confirmation when selection changes
  useEffect(() => { setAddedToTraining(false) }, [selected?.activityId])

  // Derive data from plan + selected IDs
  const week = selected ? plan.weeks.find(w => w.weekNumber === selected.weekNumber) : null
  const dayIdx = selected ? MONDAY_FIRST_ORDER[selected.dayIndex] : (0 as WeekDayIndex)
  const activity = week?.days[dayIdx]?.find(a => a.id === selected?.activityId) ?? null
  const dayName = selected ? DAY_NAMES[selected.dayIndex] : ''
  const emoji = activity ? getPlannedActivityEmoji(activity) : ''
  const isOpen = !!(selected && activity && week)

  function handleFieldSave(field: string, value: unknown) {
    if (!activity) return
    onSaveActivity({ ...activity, [field]: value } as PlannedActivity)
  }

  function handleExercisesSave(exercises: PlannedExercise[]) {
    if (!activity || activity.type !== 'WeightTraining') return
    onSaveActivity({ ...activity, exercises })
  }

  function handleAddToTraining() {
    if (!week || !activity || !selected) return
    onAddToTraining(week, selected.dayIndex, activity)
    setAddedToTraining(true)
    setTimeout(() => setAddedToTraining(false), 2000)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(17, 24, 39, 0.2)',
              backdropFilter: 'blur(1px)', zIndex: 40,
            }}
          />

          <motion.div
            initial={{ x: isMobile ? 0 : '100%', y: isMobile ? '100%' : 0 }}
            animate={{ x: 0, y: 0 }}
            exit={{ x: isMobile ? 0 : '100%', y: isMobile ? '100%' : 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            style={{
              position: 'fixed',
              top: isMobile ? 'auto' : 0, right: 0, bottom: 0,
              left: isMobile ? 0 : undefined,
              width: isMobile ? '100%' : 400,
              maxWidth: isMobile ? '100%' : '92vw',
              maxHeight: isMobile ? '80vh' : undefined,
              background: 'var(--color-surface)',
              boxShadow: 'var(--shadow-panel)', zIndex: 50,
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
              borderRadius: isMobile ? '12px 12px 0 0' : undefined,
            }}
          >
            {/* Header */}
            <div style={{
              padding: isMobile ? '16px' : '16px 20px',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex', alignItems: 'flex-start', gap: 12, flexShrink: 0,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 'var(--radius-md)',
                background: 'var(--color-accent-light)',
                border: '1px solid var(--color-accent-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, flexShrink: 0,
              }}>{emoji}</div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{
                  fontSize: 'var(--font-size-md)', fontWeight: 600,
                  color: 'var(--color-text-primary)', margin: 0, marginBottom: 3,
                }}>{getActivityTitle(activity!)}</h2>
                <div style={{
                  fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)',
                  display: 'flex', gap: 8, alignItems: 'center',
                }}>
                  <span>{dayName}</span>
                  <span>·</span>
                  <span>Week {week!.weekNumber} — {week!.label}</span>
                </div>
              </div>

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
              {/* Run fields */}
              {activity!.type === 'Run' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <EditableStatCard
                    key={`${activity!.id}-dist`}
                    label="Distance"
                    initialValue={String((activity as Extract<PlannedActivity, { type: 'Run' }>).targetDistance)}
                    onSave={(val) => handleFieldSave('targetDistance', parseFloat(val) || 0)}
                    suffix="mi"
                    inputType="number"
                  />
                  <EditableStatCard
                    key={`${activity!.id}-pace`}
                    label="Target Pace"
                    initialValue={(activity as Extract<PlannedActivity, { type: 'Run' }>).targetPace || ''}
                    onSave={(val) => handleFieldSave('targetPace', val)}
                    suffix="/mi"
                  />
                </div>
              )}

              {/* WeightTraining fields */}
              {activity!.type === 'WeightTraining' && (
                <>
                  <StatCard label="Workout" value={(activity as Extract<PlannedActivity, { type: 'WeightTraining' }>).workoutType} />
                  <EditableExerciseTable
                    key={activity!.id}
                    exercises={(activity as Extract<PlannedActivity, { type: 'WeightTraining' }>).exercises ?? []}
                    onSave={handleExercisesSave}
                    isMobile={isMobile}
                  />
                </>
              )}

              {/* Race fields */}
              {activity!.type === 'Race' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {(activity as Extract<PlannedActivity, { type: 'Race' }>).name && (
                    <EditableStatCard
                      key={`${activity!.id}-rname`}
                      label="Race"
                      initialValue={(activity as Extract<PlannedActivity, { type: 'Race' }>).name || ''}
                      onSave={(val) => handleFieldSave('name', val)}
                    />
                  )}
                  {(activity as Extract<PlannedActivity, { type: 'Race' }>).distance && (
                    <EditableStatCard
                      key={`${activity!.id}-rdist`}
                      label="Distance"
                      initialValue={(activity as Extract<PlannedActivity, { type: 'Race' }>).distance || ''}
                      onSave={(val) => handleFieldSave('distance', val)}
                    />
                  )}
                  {(activity as Extract<PlannedActivity, { type: 'Race' }>).goalTime && (
                    <EditableStatCard
                      key={`${activity!.id}-rgoal`}
                      label="Goal Time"
                      initialValue={(activity as Extract<PlannedActivity, { type: 'Race' }>).goalTime || ''}
                      onSave={(val) => handleFieldSave('goalTime', val)}
                    />
                  )}
                  {(activity as Extract<PlannedActivity, { type: 'Race' }>).targetPace && (
                    <EditableStatCard
                      key={`${activity!.id}-rpace`}
                      label="Target Pace"
                      initialValue={(activity as Extract<PlannedActivity, { type: 'Race' }>).targetPace || ''}
                      onSave={(val) => handleFieldSave('targetPace', val)}
                      suffix="/mi"
                    />
                  )}
                </div>
              )}

              {/* Notes (editable textarea) */}
              {(activity!.type === 'Run' || activity!.type === 'WeightTraining' || activity!.type === 'Race') && (
                <EditableNotes
                  key={`${activity!.id}-notes`}
                  initialValue={activity!.notes ?? ''}
                  onSave={(val) => handleFieldSave('notes', val || undefined)}
                />
              )}

              {/* Rest day message */}
              {activity!.type === 'Rest' && (
                <div style={{
                  fontSize: 13, color: 'var(--color-text-tertiary)',
                  textAlign: 'center', padding: '24px 0',
                }}>
                  Recovery day — no structured workout planned.
                </div>
              )}

              {/* Add to Training */}
              {activity!.type !== 'Rest' && (
                <AddToTrainingButton
                  label="Add to Training"
                  added={addedToTraining}
                  onClick={handleAddToTraining}
                />
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ── EditableStatCard ─────────────────────────────────────────────────────────

function EditableStatCard({ label, initialValue, onSave, suffix, inputType = 'text' }: {
  label: string
  initialValue: string
  onSave: (value: string) => void
  suffix?: string
  inputType?: string
}) {
  const [value, setValue] = useState(initialValue)
  const [focused, setFocused] = useState(false)

  return (
    <div style={{
      background: 'var(--color-bg)', borderRadius: 'var(--radius-md)',
      padding: '12px 14px',
      border: focused ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
      transition: 'border-color 150ms',
    }}>
      <div style={{
        fontSize: 10, fontWeight: 600, color: 'var(--color-text-tertiary)',
        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4,
      }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <input
          type={inputType}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); if (value !== initialValue) onSave(value) }}
          style={{
            fontSize: 'var(--font-size-lg)', fontWeight: 700,
            color: 'var(--color-text-primary)', letterSpacing: '-0.5px',
            background: 'transparent', border: 'none', outline: 'none',
            width: '100%', padding: 0, margin: 0,
            MozAppearance: 'textfield',
          }}
        />
        {suffix && (
          <span style={{
            fontSize: 12, color: 'var(--color-text-tertiary)',
            fontWeight: 500, flexShrink: 0,
          }}>{suffix}</span>
        )}
      </div>
    </div>
  )
}

// ── EditableNotes ────────────────────────────────────────────────────────────

function EditableNotes({ initialValue, onSave }: {
  initialValue: string
  onSave: (value: string) => void
}) {
  const [value, setValue] = useState(initialValue)
  const [focused, setFocused] = useState(false)

  return (
    <div style={{
      padding: '12px 14px',
      background: 'var(--color-bg)',
      borderRadius: 'var(--radius-md)',
      border: focused ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
      transition: 'border-color 150ms',
    }}>
      <div style={{
        fontSize: 10, fontWeight: 700, color: 'var(--color-text-tertiary)',
        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6,
      }}>Notes</div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); if (value !== initialValue) onSave(value) }}
        placeholder="Add notes..."
        rows={value ? Math.min(value.split('\n').length + 1, 6) : 2}
        style={{
          fontSize: 13, color: 'var(--color-text-primary)', lineHeight: 1.5,
          background: 'transparent', border: 'none', outline: 'none',
          width: '100%', padding: 0, margin: 0, resize: 'vertical',
          fontFamily: 'inherit',
        }}
      />
    </div>
  )
}

// ── Editable Exercise Table ──────────────────────────────────────────────────

type KeyedExercise = PlannedExercise & { _key: string }

function EditableExerciseTable({ exercises, onSave, isMobile }: {
  exercises: PlannedExercise[]
  onSave: (exercises: PlannedExercise[]) => void
  isMobile: boolean
}) {
  const [items, setItems] = useState<KeyedExercise[]>(() =>
    exercises.map(ex => ({ ...ex, _key: generateId() }))
  )
  const lastSavedRef = useRef(exercises)
  const newRowRef = useRef<HTMLInputElement>(null!)

  function stripKeys(list: KeyedExercise[]): PlannedExercise[] {
    return list.map(({ _key, ...ex }) => ex)
  }

  function persist(updated: KeyedExercise[]) {
    setItems(updated)
    const plain = stripKeys(updated)
    lastSavedRef.current = plain
    onSave(plain)
  }

  function handleReorder(newOrder: KeyedExercise[]) {
    persist(newOrder)
  }

  function updateField(key: string, field: keyof PlannedExercise, value: string | number) {
    setItems(prev => prev.map(ex => ex._key === key ? { ...ex, [field]: value } : ex))
  }

  function handleBlur() {
    persist(items)
  }

  function handleAdd() {
    const newItem: KeyedExercise = { _key: generateId(), name: '', sets: 3, reps: '10' }
    setItems(prev => [...prev, newItem])
    // Focus the new row's name input after render
    setTimeout(() => newRowRef.current?.focus(), 50)
  }

  function handleRemove(key: string) {
    persist(items.filter(ex => ex._key !== key))
  }

  const gridCols = isMobile ? '1fr 44px 50px 28px' : '24px 1fr 48px 56px 28px'

  return (
    <div style={{
      background: 'var(--color-bg)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--color-border)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'grid', gridTemplateColumns: gridCols,
        padding: '8px 14px',
        borderBottom: '1px solid var(--color-border)',
      }}>
        {!isMobile && <span />}
        <span style={tableHeaderStyle}>Exercise</span>
        <span style={{ ...tableHeaderStyle, textAlign: 'center' }}>Sets</span>
        <span style={{ ...tableHeaderStyle, textAlign: 'center' }}>Reps</span>
        <span />
      </div>

      {/* Rows with drag reorder */}
      <Reorder.Group axis="y" values={items} onReorder={handleReorder} as="div" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {items.map((ex, i) => (
          <ExerciseRow
            key={ex._key}
            ex={ex}
            isLast={i === items.length - 1}
            isMobile={isMobile}
            gridCols={gridCols}
            newRowRef={i === items.length - 1 ? newRowRef : undefined}
            onFieldChange={(field, val) => updateField(ex._key, field, val)}
            onBlur={handleBlur}
            onRemove={() => handleRemove(ex._key)}
          />
        ))}
      </Reorder.Group>

      {/* Add row */}
      <button
        onClick={handleAdd}
        style={{
          width: '100%', padding: '10px 14px',
          border: 'none', background: 'transparent',
          color: 'var(--color-text-tertiary)',
          fontSize: 12, fontWeight: 600,
          cursor: 'pointer',
          borderTop: items.length > 0 ? '1px dashed var(--color-border)' : undefined,
          display: 'flex', alignItems: 'center', gap: 6,
          transition: 'color 120ms',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-accent)' }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-tertiary)' }}
      >
        <span style={{ fontSize: 14 }}>+</span> Add exercise
      </button>
    </div>
  )
}

function ExerciseRow({ ex, isLast, isMobile, gridCols, newRowRef, onFieldChange, onBlur, onRemove }: {
  ex: KeyedExercise
  isLast: boolean
  isMobile: boolean
  gridCols: string
  newRowRef?: React.RefObject<HTMLInputElement>
  onFieldChange: (field: keyof PlannedExercise, val: string | number) => void
  onBlur: () => void
  onRemove: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <Reorder.Item
      value={ex}
      as="div"
      style={{
        display: 'grid', gridTemplateColumns: gridCols,
        padding: '6px 14px',
        borderBottom: isLast ? undefined : '1px solid var(--color-border-light)',
        alignItems: 'center',
        background: 'var(--color-bg)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      whileDrag={{ boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 10, background: 'var(--color-surface)' }}
    >
      {/* Drag handle */}
      {!isMobile && (
        <div style={{
          cursor: 'grab', color: 'var(--color-text-tertiary)',
          fontSize: 12, opacity: hovered ? 0.8 : 0.3,
          transition: 'opacity 120ms', userSelect: 'none',
          display: 'flex', alignItems: 'center',
        }}>⠿</div>
      )}

      {/* Name */}
      <div>
        <input
          ref={newRowRef}
          value={ex.name}
          onChange={(e) => onFieldChange('name', e.target.value)}
          onBlur={onBlur}
          placeholder="Exercise name"
          style={{
            ...cellInputStyle,
            fontWeight: 500,
            width: '100%',
          }}
        />
        <input
          value={ex.notes ?? ''}
          onChange={(e) => onFieldChange('notes', e.target.value)}
          onBlur={onBlur}
          placeholder="Notes"
          style={{
            ...cellInputStyle,
            fontSize: 11,
            color: 'var(--color-text-tertiary)',
            marginTop: 1,
          }}
        />
      </div>

      {/* Sets */}
      <input
        type="number"
        value={ex.sets}
        onChange={(e) => onFieldChange('sets', parseInt(e.target.value) || 0)}
        onBlur={onBlur}
        style={{
          ...cellInputStyle,
          textAlign: 'center',
          fontWeight: 600,
          width: '100%',
          MozAppearance: 'textfield',
        }}
      />

      {/* Reps */}
      <input
        value={ex.reps}
        onChange={(e) => onFieldChange('reps', e.target.value)}
        onBlur={onBlur}
        style={{
          ...cellInputStyle,
          textAlign: 'center',
          fontWeight: 600,
          width: '100%',
        }}
      />

      {/* Delete */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove() }}
        style={{
          border: 'none', background: 'transparent',
          color: 'var(--color-text-tertiary)',
          cursor: 'pointer', padding: 2,
          opacity: isMobile || hovered ? 0.8 : 0,
          transition: 'opacity 120ms, color 120ms',
          fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444' }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-tertiary)' }}
        title="Remove exercise"
      >×</button>
    </Reorder.Item>
  )
}

const cellInputStyle: React.CSSProperties = {
  fontSize: 13,
  color: 'var(--color-text-primary)',
  background: 'transparent',
  border: 'none',
  outline: 'none',
  padding: '3px 0',
  margin: 0,
  fontFamily: 'inherit',
}

const tableHeaderStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: 'var(--color-text-tertiary)',
  textTransform: 'uppercase', letterSpacing: '0.08em',
}

// ── Add to Training Button ───────────────────────────────────────────────────

function AddToTrainingButton({ label, added, onClick, small }: {
  label: string
  added: boolean
  onClick: () => void
  small?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={added}
      style={{
        width: small ? 'auto' : '100%',
        padding: small ? '6px 14px' : '10px 16px',
        borderRadius: 'var(--radius-sm)',
        border: added
          ? '1px solid hsla(142, 60%, 45%, 0.3)'
          : '1px solid var(--color-border)',
        background: added
          ? 'hsla(142, 60%, 45%, 0.08)'
          : 'transparent',
        color: added
          ? 'hsl(142, 60%, 40%)'
          : 'var(--color-text-secondary)',
        fontSize: small ? 12 : 13,
        fontWeight: 600,
        cursor: added ? 'default' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        transition: 'all 200ms ease',
      }}
      onMouseEnter={(e) => { if (!added) { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.color = 'var(--color-accent)' } }}
      onMouseLeave={(e) => { if (!added) { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-secondary)' } }}
    >
      {added ? (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Added!
        </>
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="12" y1="10" x2="12" y2="16" />
            <line x1="9" y1="13" x2="15" y2="13" />
          </svg>
          {label}
        </>
      )}
    </button>
  )
}

// ── Read-only StatCard (used for non-editable fields) ────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function formatWeekDate(weekStart: string): string {
  try { return format(parseISO(weekStart), 'MMM d') }
  catch { return weekStart }
}
