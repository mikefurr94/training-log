import { format, addWeeks } from 'date-fns'
import { scoreWeek, WEEK_SCORE_COLORS } from '../../utils/weekScoring'
import KeyDateBadge from './KeyDateBadge'
import type { KeyDate } from '../../store/types'

interface Props {
  weekStart: Date
  completed: number
  partial: number
  missed: number
  total: number
  keyDates: KeyDate[]
  onClick?: () => void
  isCurrent?: boolean
}

export default function WeekScoreCard({ weekStart, completed, partial, missed, total, keyDates, onClick, isCurrent }: Props) {
  const score = scoreWeek(completed, total)
  const colors = WEEK_SCORE_COLORS[score]
  const pct = total > 0 ? Math.round((completed / total) * 100) : null
  const dateLabel = `${format(weekStart, 'MMM d')} – ${format(addWeeks(weekStart, 1), 'MMM d')}`

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '14px 16px',
        background: isCurrent ? 'var(--color-accent-light)' : 'var(--color-surface)',
        border: `1px solid ${isCurrent ? 'var(--color-accent-border)' : 'var(--color-border)'}`,
        borderRadius: 'var(--radius-md)',
        cursor: onClick ? 'pointer' : 'default',
        textAlign: 'left',
        width: '100%',
        transition: 'all 120ms ease',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Score dot */}
        <div style={{
          width: 14, height: 14, borderRadius: '50%',
          background: colors.dot,
          flexShrink: 0,
        }} />
        <span style={{
          fontSize: 'var(--font-size-sm)',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          flex: 1,
        }}>
          {dateLabel}
        </span>
        {isCurrent && (
          <span style={{
            fontSize: 10, background: 'var(--color-accent)', color: '#fff',
            padding: '1px 6px', borderRadius: 99, fontWeight: 600,
          }}>Now</span>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {total > 0 ? (
          <>
            <span style={{ fontSize: 11, color: colors.text, fontWeight: 700 }}>
              {completed}/{total}
            </span>
            {pct !== null && (
              <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                {pct}%
              </span>
            )}
            {partial > 0 && (
              <span style={{ fontSize: 11, color: 'var(--color-status-partial-text)' }}>
                {partial} partial
              </span>
            )}
            {missed > 0 && (
              <span style={{ fontSize: 11, color: 'var(--color-status-missed-text)' }}>
                {missed} missed
              </span>
            )}
          </>
        ) : (
          <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
            No plan
          </span>
        )}
      </div>

      {/* Key dates */}
      {keyDates.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {keyDates.map((kd) => (
            <KeyDateBadge key={kd.id} keyDate={kd} />
          ))}
        </div>
      )}
    </button>
  )
}
