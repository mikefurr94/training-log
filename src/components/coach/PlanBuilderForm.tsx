import { useState } from 'react'
import { RACE_DISTANCE_MILES, calcGoalTime, calcPaceFromGoalTime, paceStringToSeconds, parseGoalTimeToSeconds } from '../../utils/planningUtils'

const RACE_DISTANCE_PRESETS = ['5K', '10 Miler', 'Half Marathon', 'Marathon']
const PLAN_WEEK_OPTIONS = [8, 10, 12, 16, 20]

type PaceMode = 'pace' | 'time'

interface PlanBuilderFormData {
  raceName: string
  raceDate: string
  raceDistance: string
  goalTime: string
  targetPace: string
  planWeeks: number
  runDaysPerWeek: number
  liftDaysPerWeek: number
  currentWeeklyMileage: string
  experienceLevel: 'beginner' | 'intermediate' | 'advanced'
  notes: string
}

interface Props {
  onSubmit: (data: PlanBuilderFormData) => void
  onCancel: () => void
}

export default function PlanBuilderForm({ onSubmit, onCancel }: Props) {
  const [raceName, setRaceName] = useState('')
  const [raceDate, setRaceDate] = useState('')
  const [raceDistance, setRaceDistance] = useState('')
  const [goalTime, setGoalTime] = useState('')
  const [targetPace, setTargetPace] = useState('')
  const [paceMode, setPaceMode] = useState<PaceMode>('pace')
  const [planWeeks, setPlanWeeks] = useState(12)
  const [runDays, setRunDays] = useState(4)
  const [liftDays, setLiftDays] = useState(2)
  const [mileage, setMileage] = useState('')
  const [experience, setExperience] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const distanceMiles = RACE_DISTANCE_MILES[raceDistance] ?? 0
  const canAutoCalc = distanceMiles > 0

  const calculatedGoalTime = canAutoCalc && paceMode === 'pace' && paceStringToSeconds(targetPace) > 0
    ? calcGoalTime(targetPace, distanceMiles)
    : ''
  const calculatedPace = canAutoCalc && paceMode === 'time' && parseGoalTimeToSeconds(goalTime) > 0
    ? calcPaceFromGoalTime(goalTime, distanceMiles)
    : ''

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!raceName.trim()) e.raceName = 'Enter a race name'
    if (!raceDate) e.raceDate = 'Select a race date'
    if (!raceDistance) e.raceDistance = 'Select a distance'
    if (paceMode === 'pace' && targetPace && !/^\d+:\d{2}$/.test(targetPace)) {
      e.targetPace = 'Use MM:SS format (e.g. 8:00)'
    }
    if (paceMode === 'time' && goalTime && !/^\d{1,2}:\d{2}(:\d{2})?$/.test(goalTime)) {
      e.goalTime = 'Use H:MM:SS or M:SS format'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit() {
    if (!validate()) return
    const finalPace = canAutoCalc && paceMode === 'time' ? calculatedPace : targetPace
    const finalGoalTime = canAutoCalc && paceMode === 'pace' ? calculatedGoalTime : goalTime
    onSubmit({
      raceName: raceName.trim(),
      raceDate,
      raceDistance,
      goalTime: finalGoalTime,
      targetPace: finalPace,
      planWeeks,
      runDaysPerWeek: runDays,
      liftDaysPerWeek: liftDays,
      currentWeeklyMileage: mileage,
      experienceLevel: experience,
      notes: notes.trim(),
    })
  }

  return (
    <div style={{
      flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div style={{ width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Header */}
        <div>
          <h2 style={{
            margin: 0, fontSize: 'var(--font-size-lg)', fontWeight: 700,
            color: 'var(--color-text-primary)',
          }}>Build a Training Plan</h2>
          <p style={{
            margin: '4px 0 0', fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)',
          }}>
            Fill in your race details and preferences. Your AI coach will generate a personalized week-by-week plan.
          </p>
        </div>

        {/* Race name */}
        <Field label="Race name" error={errors.raceName}>
          <input
            type="text"
            value={raceName}
            onChange={(e) => { setRaceName(e.target.value); clearError('raceName') }}
            placeholder="e.g. Brooklyn Half Marathon"
            style={{ ...inputStyle, borderColor: errors.raceName ? '#ef4444' : undefined }}
          />
        </Field>

        {/* Race date */}
        <Field label="Race date" error={errors.raceDate}>
          <input
            type="date"
            value={raceDate}
            onChange={(e) => { setRaceDate(e.target.value); clearError('raceDate') }}
            style={{ ...inputStyle, borderColor: errors.raceDate ? '#ef4444' : undefined }}
          />
        </Field>

        {/* Distance */}
        <Field label="Race distance" error={errors.raceDistance}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {RACE_DISTANCE_PRESETS.map((d) => (
              <ChipButton
                key={d}
                label={d}
                active={raceDistance === d}
                onClick={() => { setRaceDistance(d); clearError('raceDistance') }}
              />
            ))}
          </div>
        </Field>

        {/* Pace ↔ Goal time toggle */}
        {canAutoCalc && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '3px 4px', background: 'var(--color-bg)',
            borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)',
            alignSelf: 'flex-start',
          }}>
            <ToggleBtn label="Enter pace" active={paceMode === 'pace'} onClick={() => setPaceMode('pace')} />
            <ToggleBtn label="Enter goal time" active={paceMode === 'time'} onClick={() => setPaceMode('time')} />
          </div>
        )}

        {/* Target pace */}
        <Field
          label={`Target pace (MM:SS /mi)${canAutoCalc && paceMode === 'time' ? ' — calculated' : ''}`}
          error={errors.targetPace}
        >
          {canAutoCalc && paceMode === 'time' ? (
            <div style={{ ...inputStyle, color: 'var(--color-text-tertiary)', background: 'var(--color-bg)', opacity: 0.7 }}>
              {calculatedPace ? `${calculatedPace} /mi` : '—'}
            </div>
          ) : (
            <input
              type="text"
              value={targetPace}
              onChange={(e) => { setTargetPace(e.target.value); clearError('targetPace') }}
              placeholder="e.g. 8:00"
              style={{ ...inputStyle, borderColor: errors.targetPace ? '#ef4444' : undefined }}
            />
          )}
        </Field>

        {/* Goal time */}
        <Field
          label={`Goal time${canAutoCalc && paceMode === 'pace' ? ' — calculated' : ''}`}
          error={errors.goalTime}
        >
          {canAutoCalc && paceMode === 'pace' ? (
            <div style={{ ...inputStyle, color: 'var(--color-text-tertiary)', background: 'var(--color-bg)', opacity: 0.7 }}>
              {calculatedGoalTime || '—'}
            </div>
          ) : (
            <input
              type="text"
              value={goalTime}
              onChange={(e) => { setGoalTime(e.target.value); clearError('goalTime') }}
              placeholder="e.g. 1:45:00"
              style={{ ...inputStyle, borderColor: errors.goalTime ? '#ef4444' : undefined }}
            />
          )}
        </Field>

        <div style={{ height: 1, background: 'var(--color-border)' }} />

        {/* Plan duration */}
        <Field label="Plan duration (weeks)">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {PLAN_WEEK_OPTIONS.map((w) => (
              <ChipButton key={w} label={`${w}`} active={planWeeks === w} onClick={() => setPlanWeeks(w)} />
            ))}
          </div>
        </Field>

        {/* Run days per week */}
        <Field label="Run days per week">
          <div style={{ display: 'flex', gap: 6 }}>
            {[3, 4, 5, 6].map((n) => (
              <ChipButton key={n} label={`${n}`} active={runDays === n} onClick={() => setRunDays(n)} />
            ))}
          </div>
        </Field>

        {/* Lift days per week */}
        <Field label="Lift days per week">
          <div style={{ display: 'flex', gap: 6 }}>
            {[0, 1, 2, 3].map((n) => (
              <ChipButton key={n} label={`${n}`} active={liftDays === n} onClick={() => setLiftDays(n)} />
            ))}
          </div>
        </Field>

        {/* Current weekly mileage */}
        <Field label="Current weekly mileage — optional">
          <input
            type="number"
            value={mileage}
            onChange={(e) => setMileage(e.target.value)}
            placeholder="e.g. 15"
            style={inputStyle}
          />
        </Field>

        {/* Experience level */}
        <Field label="Experience level">
          <div style={{ display: 'flex', gap: 6 }}>
            {(['beginner', 'intermediate', 'advanced'] as const).map((lvl) => (
              <ChipButton
                key={lvl}
                label={lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                active={experience === lvl}
                onClick={() => setExperience(lvl)}
              />
            ))}
          </div>
        </Field>

        {/* Notes */}
        <Field label="Notes or constraints — optional">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. I can only run mornings, bad knee, prefer long runs on weekends..."
            rows={3}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
          />
        </Field>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingBottom: 24 }}>
          <button onClick={onCancel} style={secondaryBtnStyle}>Cancel</button>
          <button onClick={handleSubmit} style={primaryBtnStyle}>
            Generate Plan
          </button>
        </div>
      </div>
    </div>
  )

  function clearError(key: string) {
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }))
  }
}

// ── Shared sub-components ───────────────────────────────────────────────────

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
      {error && <div style={errorStyle}>{error}</div>}
    </div>
  )
}

function ChipButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '5px 12px', borderRadius: 'var(--radius-full)',
        fontSize: 'var(--font-size-sm)', fontWeight: active ? 600 : 500,
        border: `1.5px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
        background: active ? 'var(--color-accent-light)' : 'transparent',
        color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
        cursor: 'pointer', transition: 'all 150ms ease',
      }}
    >{label}</button>
  )
}

function ToggleBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 10px', borderRadius: 'var(--radius-xs, 4px)',
        fontSize: 'var(--font-size-xs)', fontWeight: 500,
        border: 'none', cursor: 'pointer',
        background: active ? 'var(--color-surface)' : 'transparent',
        color: active ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
        boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
      }}
    >{label}</button>
  )
}

// ── Styles ──────────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600,
  color: 'var(--color-text-secondary)', textTransform: 'uppercase',
  letterSpacing: '0.06em', marginBottom: 6,
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)', background: 'var(--color-bg)',
  color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)',
  outline: 'none', boxSizing: 'border-box',
}

const errorStyle: React.CSSProperties = {
  fontSize: 11, color: '#ef4444', marginTop: 3,
}

const primaryBtnStyle: React.CSSProperties = {
  padding: '9px 20px', borderRadius: 'var(--radius-sm)',
  background: 'var(--color-accent)', color: 'var(--color-text-inverse)',
  border: 'none', fontSize: 'var(--font-size-sm)',
  fontWeight: 600, cursor: 'pointer',
}

const secondaryBtnStyle: React.CSSProperties = {
  padding: '9px 20px', borderRadius: 'var(--radius-sm)',
  background: 'transparent', color: 'var(--color-text-secondary)',
  border: '1px solid var(--color-border)', fontSize: 'var(--font-size-sm)',
  fontWeight: 500, cursor: 'pointer',
}
