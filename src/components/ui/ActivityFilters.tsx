import { useAppStore } from '../../store/useAppStore'
import { ACTIVITY_COLORS } from '../../utils/activityColors'
import type { ActivityType } from '../../utils/activityColors'

const TYPES: { type: ActivityType; label: string; emoji: string }[] = [
  { type: 'Run', label: 'Runs', emoji: '🏃' },
  { type: 'WeightTraining', label: 'Weights', emoji: '🏋️' },
  { type: 'Yoga', label: 'Yoga', emoji: '🧘' },
  { type: 'Tennis', label: 'Tennis', emoji: '🎾' },
]

export default function ActivityFilters() {
  const enabledTypes = useAppStore((s) => s.enabledTypes)
  const toggleActivityType = useAppStore((s) => s.toggleActivityType)

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {TYPES.map(({ type, label, emoji }) => {
        const active = enabledTypes.includes(type)
        const colors = ACTIVITY_COLORS[type]
        return (
          <button
            key={type}
            onClick={() => toggleActivityType(type)}
            title={`Toggle ${label}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 11px',
              borderRadius: 'var(--radius-full)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-medium)',
              border: `1.5px solid ${active ? colors.hex : 'var(--color-border)'}`,
              background: active ? colors.light : 'var(--color-surface)',
              color: active ? colors.hex : 'var(--color-text-secondary)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
              userSelect: 'none',
            }}
          >
            <span style={{ fontSize: 13 }}>{emoji}</span>
            {label}
          </button>
        )
      })}
    </div>
  )
}
