import { getPlannedActivityEmoji, getPlannedActivityLabel } from '../../utils/planningUtils'
import type { PlannedActivity } from '../../store/types'

interface Props {
  activity: PlannedActivity
  onEdit: () => void
  onDelete: () => void
}

export default function PlannedActivityItem({ activity, onEdit, onDelete }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 8px',
        borderRadius: 8,
        background: 'var(--color-bg)',
        border: '1px solid var(--color-border)',
        fontSize: 'var(--font-size-xs)',
      }}
    >
      <span style={{ fontSize: 13, flexShrink: 0 }}>
        {getPlannedActivityEmoji(activity)}
      </span>
      <span
        title={getPlannedActivityLabel(activity)}
        style={{
          flex: 1,
          color: 'var(--color-text-primary)',
          fontWeight: 'var(--font-weight-medium)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontSize: 12,
        }}
      >
        {getPlannedActivityLabel(activity)}
      </span>
      {activity.notes && (
        <span
          title={activity.notes}
          style={{
            color: 'var(--color-text-tertiary)',
            fontSize: 10,
            maxWidth: 60,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {activity.notes}
        </span>
      )}
      <button
        onClick={onEdit}
        title="Edit"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-text-tertiary)',
          fontSize: 12,
          padding: '0 2px',
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        ✎
      </button>
      <button
        onClick={onDelete}
        title="Remove"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-text-tertiary)',
          fontSize: 14,
          padding: '0 2px',
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  )
}
