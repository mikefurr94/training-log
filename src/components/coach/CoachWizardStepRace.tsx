import type { CoachWizardData, RaceDistance } from '../../store/types'
import { RACE_DISTANCE_LABELS } from '../../utils/coachUtils'

const DISTANCES: RaceDistance[] = ['marathon', 'half_marathon', '10k', '5k']

interface Props {
  data: CoachWizardData
  onChange: (partial: Partial<CoachWizardData>) => void
}

export default function CoachWizardStepRace({ data, onChange }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label style={labelStyle}>Race Date</label>
        <input
          type="date"
          value={data.raceDate}
          onChange={(e) => onChange({ raceDate: e.target.value })}
          min={new Date().toISOString().split('T')[0]}
          style={inputStyle}
        />
      </div>

      <div>
        <label style={labelStyle}>Race Distance</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
          {DISTANCES.map((d) => (
            <button
              key={d}
              onClick={() => onChange({ raceDistance: d })}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: data.raceDistance === d ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
                border: `1.5px solid ${data.raceDistance === d ? 'var(--color-accent)' : 'var(--color-border)'}`,
                background: data.raceDistance === d ? 'var(--color-accent-light)' : 'transparent',
                color: data.raceDistance === d ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                cursor: 'pointer',
              }}
            >
              {RACE_DISTANCE_LABELS[d]}
            </button>
          ))}
        </div>
      </div>
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
