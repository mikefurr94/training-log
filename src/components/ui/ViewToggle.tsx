import { useAppStore } from '../../store/useAppStore'
import type { CalendarView } from '../../utils/dateUtils'

const VIEWS: { value: CalendarView; label: string }[] = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
  { value: '6month', label: '6 Mo' },
  { value: 'year', label: 'Year' },
]

export default function ViewToggle() {
  const currentView = useAppStore((s) => s.currentView)
  const setView = useAppStore((s) => s.setView)

  return (
    <div style={{
      display: 'flex',
      background: 'var(--color-bg)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      padding: 3,
      gap: 1,
    }}>
      {VIEWS.map(({ value, label }) => {
        const active = currentView === value
        return (
          <button
            key={value}
            onClick={() => setView(value)}
            style={{
              padding: '5px 12px',
              borderRadius: 7,
              fontSize: 'var(--font-size-sm)',
              fontWeight: active ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
              color: active ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
              background: active ? 'var(--color-accent)' : 'transparent',
              transition: 'all var(--transition-fast)',
              whiteSpace: 'nowrap',
              letterSpacing: active ? '-0.1px' : 'normal',
              boxShadow: active ? '0 1px 3px rgba(99,102,241,0.3)' : 'none',
            }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
