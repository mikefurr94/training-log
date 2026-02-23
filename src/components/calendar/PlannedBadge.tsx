import { getActivityColor } from '../../utils/activityColors'
import { getPlannedActivityLabel } from '../../utils/planningUtils'
import type { PlannedActivity } from '../../store/types'
import type { ActivityType } from '../../utils/activityColors'

interface Props {
  activity: PlannedActivity
  compact?: boolean
  onClick?: (e: React.MouseEvent) => void
}

export default function PlannedBadge({ activity, compact = false, onClick }: Props) {
  const type = activity.type as ActivityType
  const colors = getActivityColor(type)

  let label = colors.label
  if (activity.type === 'Run') {
    label = `${activity.targetDistance}mi`
  } else if (activity.type === 'WeightTraining') {
    label = activity.workoutType
  }

  return (
    <button
      onClick={onClick}
      title={getPlannedActivityLabel(activity)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: compact ? 3 : 4,
        width: '100%',
        background: colors.light,
        border: `1.5px dashed ${colors.border}`,
        borderRadius: 5,
        padding: compact ? '2px 5px' : '3px 7px',
        cursor: onClick ? 'pointer' : 'default',
        textAlign: 'left',
        transition: 'all var(--transition-fast)',
        overflow: 'hidden',
        minWidth: 0,
        opacity: 0.75,
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.opacity = '1'
          e.currentTarget.style.background = colors.bg
          const spans = e.currentTarget.querySelectorAll('span')
          spans.forEach((s: HTMLElement) => { s.style.color = colors.text })
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = '0.75'
        e.currentTarget.style.background = colors.light
        const spans = e.currentTarget.querySelectorAll('span')
        spans.forEach((s: HTMLElement, idx: number) => {
          s.style.color = idx === 0 ? '' : colors.bg
        })
      }}
    >
      <span style={{ fontSize: compact ? 10 : 11, flexShrink: 0 }}>{colors.emoji}</span>
      <span style={{
        fontSize: compact ? 10 : 'var(--font-size-xs)',
        fontWeight: 'var(--font-weight-medium)',
        color: colors.bg,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        minWidth: 0,
        lineHeight: 1.2,
        letterSpacing: '-0.1px',
      }}>
        {label}
      </span>
    </button>
  )
}
