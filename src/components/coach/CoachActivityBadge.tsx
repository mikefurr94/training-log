import type { CoachPlannedActivity } from '../../store/types'
import { getActivityColor } from '../../utils/activityColors'

interface Props {
  activity: CoachPlannedActivity
  compact?: boolean
  onClick?: () => void
}

export default function CoachActivityBadge({ activity, compact, onClick }: Props) {
  const color = getActivityColor(activity.type)
  const isSkipped = activity.skipped

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: compact ? 4 : 6,
        padding: compact ? '2px 6px' : '4px 8px',
        borderRadius: 'var(--radius-full)',
        fontSize: compact ? 10 : 'var(--font-size-sm)',
        fontWeight: 'var(--font-weight-medium)',
        border: `1.5px ${isSkipped ? 'solid' : 'dashed'} ${isSkipped ? 'var(--color-border)' : color.border}`,
        background: isSkipped ? 'transparent' : color.light,
        color: isSkipped ? 'var(--color-text-tertiary)' : color.bg,
        cursor: onClick ? 'pointer' : 'default',
        textDecoration: isSkipped ? 'line-through' : 'none',
        opacity: isSkipped ? 0.5 : 1,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxWidth: '100%',
      }}
    >
      <span style={{ flexShrink: 0 }}>{color.emoji}</span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {activity.label}
        {!compact && activity.targetDistanceMiles ? ` ${activity.targetDistanceMiles}mi` : ''}
      </span>
      {!compact && activity.intensity && (
        <span style={{
          fontSize: 9, padding: '1px 4px',
          borderRadius: 3,
          background: activity.intensity === 'hard' ? '#fef2f2' :
            activity.intensity === 'moderate' ? '#fffbeb' : 'transparent',
          color: activity.intensity === 'hard' ? '#ef4444' :
            activity.intensity === 'moderate' ? '#f59e0b' : 'inherit',
          fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>
          {activity.intensity}
        </span>
      )}
    </button>
  )
}
