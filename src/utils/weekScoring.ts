import type { WeekScore } from '../store/types'

export function scoreWeek(completed: number, total: number): WeekScore {
  if (total === 0) return 'green'
  const pct = completed / total
  if (pct >= 0.85) return 'green'
  if (pct >= 0.50) return 'yellow'
  return 'red'
}

export const WEEK_SCORE_COLORS: Record<WeekScore, { bg: string; text: string; border: string; dot: string }> = {
  green:  { bg: 'var(--color-status-completed-bg)', text: 'var(--color-status-completed-text)', border: 'var(--color-status-completed-border)', dot: '#22c55e' },
  yellow: { bg: 'var(--color-status-partial-bg)', text: 'var(--color-status-partial-text)', border: 'var(--color-status-partial-border)', dot: '#eab308' },
  red:    { bg: 'var(--color-status-missed-bg)', text: 'var(--color-status-missed-text)', border: 'var(--color-status-missed-border)', dot: '#ef4444' },
}
