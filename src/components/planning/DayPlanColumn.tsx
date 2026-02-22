import { useState } from 'react'
import { format, startOfWeek } from 'date-fns'
import { useAppStore } from '../../store/useAppStore'
import type { PlannedActivity, WeekDayIndex } from '../../store/types'
import PlannedActivityItem from './PlannedActivityItem'
import ActivityPlanModal from './ActivityPlanModal'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface Props {
  date: Date
  dayIndex: WeekDayIndex
  activities: PlannedActivity[]
  /** If set, edits apply as a week override instead of the template */
  overrideWeekStart?: Date
  /** If true, show the date below the day name */
  showDate?: boolean
}

export default function DayPlanColumn({
  date,
  dayIndex,
  activities,
  overrideWeekStart,
  showDate = false,
}: Props) {
  const setDayTemplate = useAppStore((s) => s.setDayTemplate)
  const setDayOverride = useAppStore((s) => s.setDayOverride)

  // Subscribe to store state directly so mutations always read fresh data,
  // never a stale prop snapshot from a previous render.
  const weekTemplate = useAppStore((s) => s.weekTemplate)
  const weekOverrides = useAppStore((s) => s.weekOverrides)

  const [showModal, setShowModal] = useState(false)
  const [editingActivity, setEditingActivity] = useState<PlannedActivity | null>(null)

  /** Always read the live store value for this day before mutating */
  function getCurrentActivities(): PlannedActivity[] {
    if (overrideWeekStart) {
      const weekStartStr = format(
        startOfWeek(overrideWeekStart, { weekStartsOn: 1 }),
        'yyyy-MM-dd'
      )
      const override = weekOverrides.find((o) => o.weekStart === weekStartStr)
      if (override && override.days[dayIndex] !== undefined) {
        return override.days[dayIndex]!
      }
      // Fall back to template if no override for this day
      return weekTemplate.days[dayIndex] ?? []
    }
    return weekTemplate.days[dayIndex] ?? []
  }

  function save(updated: PlannedActivity[]) {
    if (overrideWeekStart) {
      setDayOverride(overrideWeekStart, dayIndex, updated)
    } else {
      setDayTemplate(dayIndex, updated)
    }
  }

  function handleAdd(activity: PlannedActivity) {
    save([...getCurrentActivities(), activity])
    setShowModal(false)
  }

  function handleEdit(activity: PlannedActivity) {
    save(getCurrentActivities().map((a) => (a.id === activity.id ? activity : a)))
    setEditingActivity(null)
  }

  function handleDelete(id: string) {
    save(getCurrentActivities().filter((a) => a.id !== id))
  }

  const isToday =
    format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')

  return (
    <>
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
        }}
      >
        {/* Day header */}
        <div
          style={{
            padding: '8px 10px 6px',
            borderBottom: '1px solid var(--color-border)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: isToday ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
            }}
          >
            {DAY_LABELS[dayIndex]}
          </div>
          {showDate && (
            <div
              style={{
                fontSize: 13,
                fontWeight: isToday ? 700 : 500,
                color: isToday ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                marginTop: 1,
              }}
            >
              {format(date, 'MMM d')}
            </div>
          )}
        </div>

        {/* Activity list */}
        <div
          style={{
            flex: 1,
            padding: '8px 8px 6px',
            display: 'flex',
            flexDirection: 'column',
            gap: 5,
            minHeight: 140,
          }}
        >
          {activities.map((activity) => (
            <PlannedActivityItem
              key={activity.id}
              activity={activity}
              onEdit={() => setEditingActivity(activity)}
              onDelete={() => handleDelete(activity.id)}
            />
          ))}
        </div>

        {/* Add button */}
        <div style={{ padding: '0 8px 8px' }}>
          <button
            onClick={() => setShowModal(true)}
            style={{
              width: '100%',
              padding: '4px 0',
              borderRadius: 'var(--radius-sm)',
              background: 'transparent',
              border: '1px dashed var(--color-border)',
              color: 'var(--color-text-tertiary)',
              fontSize: 11,
              cursor: 'pointer',
              fontWeight: 500,
              transition: 'all var(--transition-fast)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-accent)'
              e.currentTarget.style.color = 'var(--color-accent)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)'
              e.currentTarget.style.color = 'var(--color-text-tertiary)'
            }}
          >
            + Add
          </button>
        </div>
      </div>

      {/* Add modal */}
      {showModal && (
        <ActivityPlanModal
          onSave={handleAdd}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* Edit modal */}
      {editingActivity && (
        <ActivityPlanModal
          initial={editingActivity}
          onSave={handleEdit}
          onClose={() => setEditingActivity(null)}
        />
      )}
    </>
  )
}
