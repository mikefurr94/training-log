import type { FitnessSummary } from '../../store/types'

interface Props {
  summary: FitnessSummary
  onUpdate: (summary: FitnessSummary) => void
}

const STAT_ITEMS: { key: keyof FitnessSummary; label: string; format: (v: unknown) => string }[] = [
  { key: 'avgWeeklyMiles', label: 'Avg Weekly Miles', format: (v) => `${v} mi` },
  { key: 'avgRunsPerWeek', label: 'Avg Runs/Week', format: (v) => String(v) },
  { key: 'longestRecentRun', label: 'Longest Recent Run', format: (v) => `${v} mi` },
  { key: 'avgPace', label: 'Avg Pace', format: (v) => String(v) },
  { key: 'avgWeeklyStrengthSessions', label: 'Avg Strength/Week', format: (v) => String(v) },
  { key: 'avgWeeklyYogaSessions', label: 'Avg Yoga/Week', format: (v) => String(v) },
]

export default function CoachWizardStepFitness({ summary, onUpdate: _onUpdate }: Props) {
  const trendEmoji = summary.recentTrend === 'increasing' ? '📈' :
    summary.recentTrend === 'decreasing' ? '📉' : '➡️'
  const trendLabel = summary.recentTrend === 'increasing' ? 'Volume increasing' :
    summary.recentTrend === 'decreasing' ? 'Volume decreasing' : 'Volume steady'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{
        margin: 0, fontSize: 'var(--font-size-sm)',
        color: 'var(--color-text-secondary)', lineHeight: 1.5,
      }}>
        Based on your last {summary.recentWeeks} weeks of Strava activity:
      </p>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8,
      }}>
        {STAT_ITEMS.map(({ key, label, format }) => (
          <div key={key} style={{
            padding: '10px 12px', borderRadius: 'var(--radius-md)',
            background: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
          }}>
            <div style={{
              fontSize: 10, fontWeight: 600,
              color: 'var(--color-text-tertiary)',
              textTransform: 'uppercase', letterSpacing: '0.06em',
              marginBottom: 4,
            }}>
              {label}
            </div>
            <div style={{
              fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)',
              color: 'var(--color-text-primary)',
            }}>
              {format(summary[key])}
            </div>
          </div>
        ))}
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px', borderRadius: 'var(--radius-md)',
        background: 'var(--color-accent-light)',
      }}>
        <span style={{ fontSize: 16 }}>{trendEmoji}</span>
        <span style={{
          fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)',
          color: 'var(--color-accent)',
        }}>
          {trendLabel}
        </span>
      </div>
    </div>
  )
}
