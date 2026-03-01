import { useState } from 'react'
import { getActivityColor } from '../../utils/activityColors'
import { getPlannedActivityLabel } from '../../utils/planningUtils'
import type { PlannedActivity } from '../../store/types'
import type { ActivityType } from '../../utils/activityColors'

interface Props {
  activity: PlannedActivity
  compact?: boolean
  onClick?: (e: React.MouseEvent) => void
  onDragStart?: (e: React.DragEvent) => void
  onDragEnd?: (e: React.DragEvent) => void
}

export default function PlannedBadge({ activity, compact = false, onClick, onDragStart, onDragEnd }: Props) {
  const type = activity.type as ActivityType
  const colors = getActivityColor(type)
  const [isDragging, setIsDragging] = useState(false)

  let label = getPlannedActivityLabel(activity)
  if (activity.type === 'WeightTraining') {
    label = activity.workoutType
  }

  const draggable = !!onDragStart

  return (
    <button
      draggable={draggable}
      onClick={onClick}
      title={getPlannedActivityLabel(activity)}
      onDragStart={(e) => {
        setIsDragging(true)
        onDragStart?.(e)
      }}
      onDragEnd={(e) => {
        setIsDragging(false)
        onDragEnd?.(e)
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: compact ? 3 : 4,
        width: '100%',
        background: 'transparent',
        border: `1.5px dashed ${colors.hex}80`,
        borderRadius: 5,
        padding: compact ? '2px 5px' : '3px 7px',
        cursor: draggable ? 'grab' : onClick ? 'pointer' : 'default',
        textAlign: 'left',
        transition: 'all var(--transition-fast)',
        overflow: 'hidden',
        minWidth: 0,
        opacity: isDragging ? 0.4 : 1,
      }}
      onMouseEnter={(e) => {
        if (onClick || draggable) {
          e.currentTarget.style.background = `${colors.hex}14`
          e.currentTarget.style.borderColor = colors.hex
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.borderColor = `${colors.hex}80`
      }}
    >
      <span style={{ fontSize: compact ? 10 : 11, flexShrink: 0, opacity: 0.7 }}>{colors.emoji}</span>
      <span style={{
        fontSize: compact ? 10 : 'var(--font-size-xs)',
        fontWeight: 'var(--font-weight-medium)',
        color: colors.hex,
        opacity: 0.8,
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
