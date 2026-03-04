import type { KeyDate } from '../../store/types'

interface Props {
  keyDate: KeyDate
  onClick?: () => void
}

export default function KeyDateBadge({ keyDate, onClick }: Props) {
  const isRace = keyDate.type === 'race'

  const details: string[] = []
  if (isRace && keyDate.distance) details.push(keyDate.distance)
  if (isRace && keyDate.goalTime) details.push(keyDate.goalTime)
  const detailStr = details.length > 0 ? ` · ${details.join(' · ')}` : ''

  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 10px',
        borderRadius: 'var(--radius-full)',
        fontSize: 11,
        fontWeight: 600,
        background: isRace ? 'var(--color-tennis-light)' : 'var(--color-accent-light)',
        color: isRace ? 'var(--color-tennis)' : 'var(--color-accent)',
        border: `1px solid ${isRace ? 'var(--color-tennis-border)' : 'var(--color-accent-border)'}`,
        cursor: onClick ? 'pointer' : 'default',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ fontSize: 10 }}>{isRace ? '🏁' : '📌'}</span>
      {keyDate.name}{detailStr}
    </button>
  )
}
