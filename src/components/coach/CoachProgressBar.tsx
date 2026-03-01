import type { CoachWeek } from '../../store/types'
import { PHASE_COLORS, PHASE_LABELS } from '../../utils/coachUtils'

interface Props {
  weeks: CoachWeek[]
  currentWeekIndex: number
}

export default function CoachProgressBar({ weeks, currentWeekIndex }: Props) {
  if (weeks.length === 0) return null

  // Group consecutive weeks by phase
  const phases: { phase: string; startIdx: number; count: number }[] = []
  for (const week of weeks) {
    const last = phases[phases.length - 1]
    if (last && last.phase === week.phase) {
      last.count++
    } else {
      phases.push({ phase: week.phase, startIdx: week.weekNumber - 1, count: 1 })
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* Phase labels */}
      <div style={{ display: 'flex', gap: 1 }}>
        {phases.map((p) => (
          <div
            key={p.startIdx}
            style={{
              flex: p.count,
              textAlign: 'center',
              fontSize: 10,
              fontWeight: 600,
              color: PHASE_COLORS[p.phase] ?? 'var(--color-text-tertiary)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            {PHASE_LABELS[p.phase] ?? p.phase}
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{
        display: 'flex', gap: 2, height: 6, borderRadius: 3, overflow: 'hidden',
      }}>
        {weeks.map((week, i) => (
          <div
            key={week.weekNumber}
            style={{
              flex: 1,
              background: i <= currentWeekIndex
                ? PHASE_COLORS[week.phase] ?? 'var(--color-border)'
                : 'var(--color-border)',
              opacity: i <= currentWeekIndex ? 1 : 0.3,
              position: 'relative',
              borderRadius: i === 0 ? '3px 0 0 3px' : i === weeks.length - 1 ? '0 3px 3px 0' : 0,
            }}
          >
            {i === currentWeekIndex && (
              <div style={{
                position: 'absolute', top: -3, right: -1,
                width: 4, height: 12, borderRadius: 2,
                background: PHASE_COLORS[week.phase] ?? 'var(--color-accent)',
                boxShadow: `0 0 4px ${PHASE_COLORS[week.phase] ?? 'var(--color-accent)'}`,
              }} />
            )}
          </div>
        ))}
      </div>

      {/* Week count label */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontSize: 10, color: 'var(--color-text-tertiary)',
      }}>
        <span>Week 1</span>
        <span>Week {weeks.length}</span>
      </div>
    </div>
  )
}
