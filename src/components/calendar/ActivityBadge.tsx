import { useAppStore } from '../../store/useAppStore'
import { mapStravaType, getActivityColor } from '../../utils/activityColors'
import { formatDistanceShort } from '../../utils/formatters'
import { secondsToPaceString, speedToSecondsPerMile } from '../../utils/planningUtils'
import type { StravaActivity } from '../../store/types'

interface Props {
  activity: StravaActivity
  compact?: boolean
  onClick?: (e: React.MouseEvent) => void
}

export default function ActivityBadge({ activity, compact = false, onClick }: Props) {
  const distanceUnit = useAppStore((s) => s.distanceUnit)
  const selectActivity = useAppStore((s) => s.selectActivity)

  const type = mapStravaType(activity.sport_type || activity.type)
  const colors = getActivityColor(type)
  const isRun = type === 'Run'

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onClick) onClick(e)
    else selectActivity(activity.id)
  }

  return (
    <button
      onClick={handleClick}
      title={activity.name}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: compact ? 3 : 4,
        width: '100%',
        background: colors.light,
        border: `1px solid ${colors.border}`,
        borderRadius: 5,
        padding: compact ? '2px 5px' : '3px 7px',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all var(--transition-fast)',
        overflow: 'hidden',
        minWidth: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = colors.bg
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = colors.light
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
        {isRun && activity.distance > 0
          ? `${formatDistanceShort(activity.distance, distanceUnit)}${!compact && activity.average_speed > 0 ? ` @ ${secondsToPaceString(speedToSecondsPerMile(activity.average_speed))}/mi` : ''}`
          : colors.label}
      </span>
    </button>
  )
}
