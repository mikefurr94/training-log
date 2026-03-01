import type { CoachWizardData, WorkoutType } from '../../store/types'

const WORKOUT_TYPES: WorkoutType[] = [
  'Upper Body', 'Lower Body', 'Full Body', 'Core', 'Push', 'Pull', 'Legs',
]

interface Props {
  data: CoachWizardData
  onChange: (partial: Partial<CoachWizardData>) => void
}

export default function CoachWizardStepSchedule({ data, onChange }: Props) {
  function toggleStrengthType(wt: WorkoutType) {
    const current = data.strengthTypes
    if (current.includes(wt)) {
      onChange({ strengthTypes: current.filter((t) => t !== wt) })
    } else {
      onChange({ strengthTypes: [...current, wt] })
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Running days */}
      <div>
        <label style={labelStyle}>Running days per week</label>
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          {[3, 4, 5, 6].map((n) => (
            <button
              key={n}
              onClick={() => onChange({ daysPerWeekRun: n })}
              style={pillStyle(data.daysPerWeekRun === n)}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Strength days */}
      <div>
        <label style={labelStyle}>Strength training days per week</label>
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          {[0, 1, 2, 3].map((n) => (
            <button
              key={n}
              onClick={() => onChange({ daysPerWeekStrength: n })}
              style={pillStyle(data.daysPerWeekStrength === n)}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Strength types */}
      {data.daysPerWeekStrength > 0 && (
        <div>
          <label style={labelStyle}>Strength focus areas</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
            {WORKOUT_TYPES.map((wt) => {
              const active = data.strengthTypes.includes(wt)
              return (
                <button
                  key={wt}
                  onClick={() => toggleStrengthType(wt)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: active ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
                    border: `1.5px solid ${active ? 'var(--color-weight-border)' : 'var(--color-border)'}`,
                    background: active ? 'var(--color-weight-light)' : 'transparent',
                    color: active ? 'var(--color-weight)' : 'var(--color-text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  {wt}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Yoga toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          onClick={() => onChange({ includeYoga: !data.includeYoga })}
          style={{
            width: 40, height: 22, borderRadius: 11,
            background: data.includeYoga ? 'var(--color-accent)' : 'var(--color-border)',
            border: 'none', cursor: 'pointer', position: 'relative',
            transition: 'background 200ms',
          }}
        >
          <div style={{
            width: 16, height: 16, borderRadius: '50%', background: '#fff',
            position: 'absolute', top: 3,
            left: data.includeYoga ? 21 : 3,
            transition: 'left 200ms',
          }} />
        </button>
        <span style={{
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-primary)',
          fontWeight: 'var(--font-weight-medium)',
        }}>
          Include yoga/recovery sessions
        </span>
      </div>
    </div>
  )
}

function pillStyle(active: boolean): React.CSSProperties {
  return {
    width: 40, height: 34,
    borderRadius: 'var(--radius-sm)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: active ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
    border: `1.5px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
    background: active ? 'var(--color-accent-light)' : 'transparent',
    color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--color-text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: 0,
}
