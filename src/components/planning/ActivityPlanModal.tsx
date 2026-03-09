import { useState, useRef } from 'react'
import type { PlannedActivity, WorkoutType } from '../../store/types'
import {
  RACE_DISTANCE_MILES,
  calcGoalTime,
  calcPaceFromGoalTime,
  paceStringToSeconds,
  parseGoalTimeToSeconds,
} from '../../utils/planningUtils'

const WORKOUT_TYPES: WorkoutType[] = [
  'Upper Body', 'Lower Body', 'Full Body', 'Core', 'Push', 'Pull', 'Legs',
]

const RACE_DISTANCE_PRESETS = ['5K', '10 Miler', 'Half Marathon', 'Marathon']

type ActivityTypeChoice = PlannedActivity['type']
type PaceMode = 'pace' | 'time'

const ACTIVITY_TYPE_OPTIONS: { type: ActivityTypeChoice; emoji: string; label: string }[] = [
  { type: 'Run',            emoji: '🏃', label: 'Run' },
  { type: 'Race',           emoji: '🏁', label: 'Race' },
  { type: 'WeightTraining', emoji: '🏋️', label: 'Weights' },
  { type: 'Yoga',           emoji: '🧘', label: 'Yoga' },
  { type: 'Tennis',         emoji: '🎾', label: 'Tennis' },
  { type: 'Rest',           emoji: '😴', label: 'Rest' },
]

interface Props {
  initial?: PlannedActivity
  onSave: (activity: PlannedActivity) => void
  onClose: () => void
}

function generateId() {
  return Math.random().toString(36).slice(2, 10)
}

export default function ActivityPlanModal({ initial, onSave, onClose }: Props) {
  const [type, setType] = useState<ActivityTypeChoice>(initial?.type ?? 'Run')
  const [targetDistance, setTargetDistance] = useState(
    initial?.type === 'Run' ? String(initial.targetDistance) : ''
  )
  const [targetPace, setTargetPace] = useState(
    initial?.type === 'Run' ? initial.targetPace : ''
  )
  const [workoutType, setWorkoutType] = useState<WorkoutType>(
    initial?.type === 'WeightTraining' ? initial.workoutType : 'Upper Body'
  )
  // Race-specific state
  const [raceName, setRaceName] = useState(initial?.type === 'Race' ? (initial.name ?? '') : '')
  const [raceDistance, setRaceDistance] = useState(initial?.type === 'Race' ? (initial.distance ?? '') : '')
  const [raceGoalTime, setRaceGoalTime] = useState(initial?.type === 'Race' ? (initial.goalTime ?? '') : '')
  const [raceTargetPace, setRaceTargetPace] = useState(initial?.type === 'Race' ? (initial.targetPace ?? '') : '')
  // Pace/time toggle — 'pace': user enters pace, goal time is calculated; 'time': vice versa
  const [paceMode, setPaceMode] = useState<PaceMode>('pace')

  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Track previous type to only reset fields on actual type change, not on mount
  const prevTypeRef = useRef<ActivityTypeChoice>(type)

  // Distance in miles for the selected preset (enables auto-calculation)
  const distanceMiles = RACE_DISTANCE_MILES[raceDistance] ?? 0
  const canAutoCalc = distanceMiles > 0

  // Derived auto-calculated values (shown read-only)
  const calculatedGoalTime = canAutoCalc && paceMode === 'pace' && paceStringToSeconds(raceTargetPace) > 0
    ? calcGoalTime(raceTargetPace, distanceMiles)
    : ''
  const calculatedPace = canAutoCalc && paceMode === 'time' && parseGoalTimeToSeconds(raceGoalTime) > 0
    ? calcPaceFromGoalTime(raceGoalTime, distanceMiles)
    : ''

  function handleTypeChange(newType: ActivityTypeChoice) {
    if (newType === prevTypeRef.current) return
    prevTypeRef.current = newType
    setType(newType)
    setErrors({})
    if (newType !== 'Run') {
      setTargetDistance('')
      setTargetPace('')
    }
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {}
    if (type === 'Run') {
      const dist = parseFloat(targetDistance)
      if (!targetDistance || isNaN(dist) || dist <= 0) {
        newErrors.distance = 'Enter a distance greater than 0'
      }
      if (targetPace && !/^\d+:\d{2}$/.test(targetPace)) {
        newErrors.pace = 'Use MM:SS format (e.g. 8:30)'
      }
    }
    if (type === 'Race') {
      // Only validate the user-editable field (not the auto-calculated one)
      if (paceMode === 'pace' || !canAutoCalc) {
        if (raceTargetPace && !/^\d+:\d{2}$/.test(raceTargetPace)) {
          newErrors.raceTargetPace = 'Use MM:SS format (e.g. 7:30)'
        }
      }
      if (paceMode === 'time' || !canAutoCalc) {
        if (raceGoalTime && !/^\d{1,2}:\d{2}(:\d{2})?$/.test(raceGoalTime)) {
          newErrors.raceGoalTime = 'Use H:MM:SS or M:SS format'
        }
      }
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleSave() {
    if (!validate()) return

    const id = initial?.id ?? generateId()
    let activity: PlannedActivity

    // Resolve final pace + goal time (use calculated value when in auto-calc mode)
    const finalPace = canAutoCalc && paceMode === 'time' ? calculatedPace : raceTargetPace
    const finalGoalTime = canAutoCalc && paceMode === 'pace' ? calculatedGoalTime : raceGoalTime

    if (type === 'Run') {
      activity = {
        id,
        type: 'Run',
        targetDistance: parseFloat(targetDistance),
        targetPace: targetPace || '0:00',
        ...(notes ? { notes } : {}),
      }
    } else if (type === 'Race') {
      activity = {
        id,
        type: 'Race',
        ...(raceName ? { name: raceName } : {}),
        ...(raceDistance ? { distance: raceDistance } : {}),
        ...(finalGoalTime ? { goalTime: finalGoalTime } : {}),
        ...(finalPace ? { targetPace: finalPace } : {}),
        ...(notes ? { notes } : {}),
      }
    } else if (type === 'WeightTraining') {
      activity = {
        id,
        type: 'WeightTraining',
        workoutType,
        ...(notes ? { notes } : {}),
      }
    } else if (type === 'Yoga') {
      activity = { id, type: 'Yoga', ...(notes ? { notes } : {}) }
    } else if (type === 'Tennis') {
      activity = { id, type: 'Tennis', ...(notes ? { notes } : {}) }
    } else {
      activity = { id, type: 'Rest', ...(notes ? { notes } : {}) }
    }

    onSave(activity)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.35)',
          zIndex: 200,
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 24,
          width: 380,
          maxHeight: '85vh',
          overflowY: 'auto',
          zIndex: 201,
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{
            margin: 0,
            fontSize: 'var(--font-size-base)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-text-primary)',
          }}>
            {initial ? 'Edit planned activity' : 'Add planned activity'}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-text-tertiary)', fontSize: 18, lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Activity type selector */}
        <div>
          <label style={labelStyle}>Activity type</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
            {ACTIVITY_TYPE_OPTIONS.map(({ type: t, emoji, label }) => (
              <button
                key={t}
                onClick={() => handleTypeChange(t)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '5px 11px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: type === t ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
                  border: `1.5px solid ${type === t ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  background: type === t ? 'var(--color-accent-light)' : 'transparent',
                  color: type === t ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                }}
              >
                <span>{emoji}</span>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Run-specific fields */}
        {type === 'Run' && (
          <>
            <div>
              <label style={labelStyle}>Target distance (miles)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={targetDistance}
                onChange={(e) => {
                  setTargetDistance(e.target.value)
                  if (errors.distance) setErrors((prev) => ({ ...prev, distance: '' }))
                }}
                placeholder="e.g. 5.0"
                style={{
                  ...inputStyle,
                  borderColor: errors.distance ? '#ef4444' : undefined,
                }}
              />
              {errors.distance && <div style={errorStyle}>{errors.distance}</div>}
            </div>
            <div>
              <label style={labelStyle}>Target pace (MM:SS /mi) — optional</label>
              <input
                type="text"
                value={targetPace}
                onChange={(e) => {
                  setTargetPace(e.target.value)
                  if (errors.pace) setErrors((prev) => ({ ...prev, pace: '' }))
                }}
                placeholder="e.g. 8:30"
                style={{
                  ...inputStyle,
                  borderColor: errors.pace ? '#ef4444' : undefined,
                }}
              />
              {errors.pace
                ? <div style={errorStyle}>{errors.pace}</div>
                : <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 3 }}>
                    Leave blank to skip pace matching
                  </div>
              }
            </div>
          </>
        )}

        {/* Race-specific fields */}
        {type === 'Race' && (
          <>
            <div>
              <label style={labelStyle}>Race name</label>
              <input
                type="text"
                value={raceName}
                onChange={(e) => setRaceName(e.target.value)}
                placeholder="e.g. Brooklyn Half Marathon"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Distance</label>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 4 }}>
                {RACE_DISTANCE_PRESETS.map((d) => {
                  const isActive = raceDistance === d
                  return (
                    <button
                      key={d}
                      onClick={() => setRaceDistance(d)}
                      style={{
                        padding: '4px 10px', borderRadius: 'var(--radius-full)',
                        fontSize: 'var(--font-size-xs)', fontWeight: isActive ? 600 : 500,
                        border: `1.5px solid ${isActive ? 'var(--color-accent)' : 'var(--color-border)'}`,
                        background: isActive ? 'var(--color-accent-light)' : 'transparent',
                        color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                        cursor: 'pointer',
                      }}
                    >{d}</button>
                  )
                })}
              </div>
            </div>

            {/* Pace ↔ Goal time toggle (only when a preset distance is selected) */}
            {canAutoCalc && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 4px',
                background: 'var(--color-bg)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                alignSelf: 'flex-start',
              }}>
                <button
                  onClick={() => setPaceMode('pace')}
                  style={{
                    padding: '4px 10px', borderRadius: 'var(--radius-xs, 4px)',
                    fontSize: 'var(--font-size-xs)', fontWeight: 500,
                    border: 'none', cursor: 'pointer',
                    background: paceMode === 'pace' ? 'var(--color-surface)' : 'transparent',
                    color: paceMode === 'pace' ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                    boxShadow: paceMode === 'pace' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  Enter pace
                </button>
                <button
                  onClick={() => setPaceMode('time')}
                  style={{
                    padding: '4px 10px', borderRadius: 'var(--radius-xs, 4px)',
                    fontSize: 'var(--font-size-xs)', fontWeight: 500,
                    border: 'none', cursor: 'pointer',
                    background: paceMode === 'time' ? 'var(--color-surface)' : 'transparent',
                    color: paceMode === 'time' ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                    boxShadow: paceMode === 'time' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  Enter goal time
                </button>
              </div>
            )}

            {/* Target pace field */}
            <div>
              <label style={labelStyle}>
                Target pace (MM:SS /mi){canAutoCalc && paceMode === 'time' ? ' — calculated' : ' — optional'}
              </label>
              {canAutoCalc && paceMode === 'time' ? (
                <div style={{
                  ...inputStyle,
                  color: 'var(--color-text-tertiary)',
                  background: 'var(--color-bg)',
                  opacity: 0.7,
                  display: 'flex', alignItems: 'center',
                }}>
                  {calculatedPace ? `${calculatedPace} /mi` : '—'}
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={raceTargetPace}
                    onChange={(e) => { setRaceTargetPace(e.target.value); if (errors.raceTargetPace) setErrors((p) => ({ ...p, raceTargetPace: '' })) }}
                    placeholder="e.g. 7:30"
                    style={{ ...inputStyle, borderColor: errors.raceTargetPace ? '#ef4444' : undefined }}
                  />
                  {errors.raceTargetPace && <div style={errorStyle}>{errors.raceTargetPace}</div>}
                </>
              )}
            </div>

            {/* Goal time field */}
            <div>
              <label style={labelStyle}>
                Goal time{canAutoCalc && paceMode === 'pace' ? ' — calculated' : ' — optional'}
              </label>
              {canAutoCalc && paceMode === 'pace' ? (
                <div style={{
                  ...inputStyle,
                  color: 'var(--color-text-tertiary)',
                  background: 'var(--color-bg)',
                  opacity: 0.7,
                  display: 'flex', alignItems: 'center',
                }}>
                  {calculatedGoalTime || '—'}
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={raceGoalTime}
                    onChange={(e) => { setRaceGoalTime(e.target.value); if (errors.raceGoalTime) setErrors((p) => ({ ...p, raceGoalTime: '' })) }}
                    placeholder="e.g. 1:45:00"
                    style={{ ...inputStyle, borderColor: errors.raceGoalTime ? '#ef4444' : undefined }}
                  />
                  {errors.raceGoalTime
                    ? <div style={errorStyle}>{errors.raceGoalTime}</div>
                    : <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 3 }}>H:MM:SS format</div>
                  }
                </>
              )}
            </div>
          </>
        )}

        {/* WeightTraining-specific fields */}
        {type === 'WeightTraining' && (
          <div>
            <label style={labelStyle}>Workout type</label>
            <select
              value={workoutType}
              onChange={(e) => setWorkoutType(e.target.value as WorkoutType)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              {WORKOUT_TYPES.map((wt) => (
                <option key={wt} value={wt}>{wt}</option>
              ))}
            </select>
          </div>
        )}

        {/* Notes (all types) */}
        <div>
          <label style={labelStyle}>Notes — optional</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. easy effort, fasted, etc."
            style={inputStyle}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <button onClick={onClose} style={secondaryBtnStyle}>Cancel</button>
          <button onClick={handleSave} style={primaryBtnStyle}>
            {initial ? 'Save changes' : 'Add activity'}
          </button>
        </div>
      </div>
    </>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--color-text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: 4,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '7px 10px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg)',
  color: 'var(--color-text-primary)',
  fontSize: 'var(--font-size-sm)',
  outline: 'none',
  boxSizing: 'border-box',
}

const errorStyle: React.CSSProperties = {
  fontSize: 11,
  color: '#ef4444',
  marginTop: 3,
}

const primaryBtnStyle: React.CSSProperties = {
  padding: '7px 16px',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--color-accent)',
  color: 'var(--color-text-inverse)',
  border: 'none',
  fontSize: 'var(--font-size-sm)',
  fontWeight: 'var(--font-weight-semibold)',
  cursor: 'pointer',
}

const secondaryBtnStyle: React.CSSProperties = {
  padding: '7px 16px',
  borderRadius: 'var(--radius-sm)',
  background: 'transparent',
  color: 'var(--color-text-secondary)',
  border: '1px solid var(--color-border)',
  fontSize: 'var(--font-size-sm)',
  fontWeight: 'var(--font-weight-medium)',
  cursor: 'pointer',
}
