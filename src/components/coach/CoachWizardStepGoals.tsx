import { useState } from 'react'
import type { CoachWizardData, RaceGoal } from '../../store/types'
import { RACE_GOAL_LABELS, parseGoalTime, formatGoalTime } from '../../utils/coachUtils'

const GOALS: RaceGoal[] = ['time_target', 'just_finish', 'bq', 'pr']

interface Props {
  data: CoachWizardData
  onChange: (partial: Partial<CoachWizardData>) => void
}

export default function CoachWizardStepGoals({ data, onChange }: Props) {
  const [timeInput, setTimeInput] = useState(
    data.goalTimeSeconds ? formatGoalTime(data.goalTimeSeconds) : ''
  )

  function handleTimeChange(val: string) {
    setTimeInput(val)
    const seconds = parseGoalTime(val)
    onChange({ goalTimeSeconds: seconds })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label style={labelStyle}>Race Goal</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
          {GOALS.map((g) => (
            <button
              key={g}
              onClick={() => onChange({ raceGoal: g })}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: data.raceGoal === g ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
                border: `1.5px solid ${data.raceGoal === g ? 'var(--color-accent)' : 'var(--color-border)'}`,
                background: data.raceGoal === g ? 'var(--color-accent-light)' : 'transparent',
                color: data.raceGoal === g ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                cursor: 'pointer',
              }}
            >
              {RACE_GOAL_LABELS[g]}
            </button>
          ))}
        </div>
      </div>

      {data.raceGoal === 'time_target' && (
        <div>
          <label style={labelStyle}>Target Time (H:MM:SS or M:SS)</label>
          <input
            type="text"
            value={timeInput}
            onChange={(e) => handleTimeChange(e.target.value)}
            placeholder="e.g. 3:30:00"
            style={inputStyle}
          />
          <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 3 }}>
            Enter your goal finish time
          </div>
        </div>
      )}

      {data.raceGoal === 'bq' && (
        <div style={{
          padding: '10px 14px', borderRadius: 'var(--radius-md)',
          background: 'var(--color-accent-light)',
          fontSize: 'var(--font-size-sm)', color: 'var(--color-accent)',
        }}>
          The plan will be designed to help you hit a Boston qualifying time based on your age and gender from Strava.
        </div>
      )}
    </div>
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
