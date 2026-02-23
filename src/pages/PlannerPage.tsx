import { useState } from 'react'
import { startOfWeek, addDays, format, parseISO } from 'date-fns'
import { useAppStore } from '../store/useAppStore'
import { useWeekPlan } from '../hooks/useWeekPlan'
import { useIsMobile } from '../hooks/useIsMobile'
import DayPlanColumn from '../components/planning/DayPlanColumn'
import KeyDateBadge from '../components/planning/KeyDateBadge'
import KeyDateModal from '../components/planning/KeyDateModal'
import type { WeekDayIndex, PlannedActivity, KeyDate } from '../store/types'

// Mon-Sun day order to match Monday-start weeks (JS dayIndex: Mon=1...Sat=6, Sun=0)
const MON_TO_SUN_ORDER: WeekDayIndex[] = [1, 2, 3, 4, 5, 6, 0]

export default function PlannerPage() {
  const plannerAnchor = useAppStore((s) => s.plannerAnchor)
  const plannerTab = useAppStore((s) => s.plannerTab)
  const isMobile = useIsMobile()

  const weekStart = startOfWeek(parseISO(plannerAnchor), { weekStartsOn: 1 })

  const padding = isMobile ? 8 : 16

  return (
    <div style={{
      height: '100%',
      padding,
      overflow: 'auto',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {plannerTab === 'week' ? (
        <WeekSection weekStart={weekStart} isMobile={isMobile} />
      ) : (
        <TemplateSection isMobile={isMobile} />
      )}
    </div>
  )
}

// ── Template section ────────────────────────────────────────────────────────

function TemplateSection({ isMobile }: { isMobile: boolean }) {
  const weekTemplate = useAppStore((s) => s.weekTemplate)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
      <div style={{
        fontSize: 'var(--font-size-xs)',
        color: 'var(--color-text-tertiary)',
        padding: isMobile ? '4px 4px' : '4px 0',
      }}>
        Your default plan — repeats every week unless you customize a specific week.
      </div>
      <WeekGrid
        days={MON_TO_SUN_ORDER.map((dayIndex) => ({
          dayIndex,
          date: new Date(0),
          activities: weekTemplate.days[dayIndex] ?? [],
        }))}
        overrideWeekStart={undefined}
        showDate={false}
        isMobile={isMobile}
      />
    </div>
  )
}

// ── Per-week section ─────────────────────────────────────────────────────────

function WeekSection({ weekStart, isMobile }: { weekStart: Date; isMobile: boolean }) {
  const weekOverrides = useAppStore((s) => s.weekOverrides)
  const clearWeekOverride = useAppStore((s) => s.clearWeekOverride)
  const keyDates = useAppStore((s) => s.keyDates)
  const addKeyDate = useAppStore((s) => s.addKeyDate)
  const updateKeyDate = useAppStore((s) => s.updateKeyDate)
  const deleteKeyDate = useAppStore((s) => s.deleteKeyDate)
  const weekPlan = useWeekPlan(weekStart)
  const [showKeyDateModal, setShowKeyDateModal] = useState(false)
  const [editingKeyDate, setEditingKeyDate] = useState<KeyDate | null>(null)

  const weekStartStr = format(weekStart, 'yyyy-MM-dd')
  const weekEndStr = format(addDays(weekStart, 6), 'yyyy-MM-dd')
  const hasOverride = weekOverrides.some((o) => o.weekStart === weekStartStr)

  const weekKeyDates = keyDates.filter(
    (kd) => kd.date >= weekStartStr && kd.date <= weekEndStr
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 8 : 12, flex: 1 }}>
      {/* Toolbar row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        flexWrap: 'wrap', padding: isMobile ? '4px 4px' : '4px 0',
      }}>
        {/* Key date badges */}
        {weekKeyDates.length > 0 && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {weekKeyDates.map((kd) => (
              <KeyDateBadge key={kd.id} keyDate={kd} onClick={() => setEditingKeyDate(kd)} />
            ))}
          </div>
        )}

        {hasOverride && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 11, color: 'var(--color-accent)', fontWeight: 600,
              background: 'var(--color-accent-light)', padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
            }}>
              Custom override
            </span>
            <button onClick={() => clearWeekOverride(weekStart)} style={{
              fontSize: 11, color: 'var(--color-text-secondary)', background: 'transparent',
              border: '1px solid var(--color-border)', borderRadius: 'var(--radius-full)',
              padding: '2px 8px', cursor: 'pointer',
            }}>
              Reset to template
            </button>
          </div>
        )}

        <div style={{ flex: 1 }} />

        <button onClick={() => setShowKeyDateModal(true)} style={{
          fontSize: 11, color: 'var(--color-text-tertiary)', background: 'transparent',
          border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-full)',
          padding: '2px 10px', cursor: 'pointer',
        }}>
          + Event
        </button>
      </div>

      {/* Week grid */}
      <WeekGrid
        days={weekPlan.map((d) => ({
          dayIndex: d.dayIndex,
          date: d.date,
          activities: d.activities,
        }))}
        overrideWeekStart={weekStart}
        showDate
        isMobile={isMobile}
      />

      {/* Key date modals */}
      {showKeyDateModal && (
        <KeyDateModal
          defaultDate={weekStartStr}
          onSave={(kd) => { addKeyDate(kd); setShowKeyDateModal(false) }}
          onClose={() => setShowKeyDateModal(false)}
        />
      )}
      {editingKeyDate && (
        <KeyDateModal
          initial={editingKeyDate}
          onSave={(kd) => { updateKeyDate(kd.id, kd); setEditingKeyDate(null) }}
          onDelete={() => { deleteKeyDate(editingKeyDate.id); setEditingKeyDate(null) }}
          onClose={() => setEditingKeyDate(null)}
        />
      )}
    </div>
  )
}

// ── Shared week grid ─────────────────────────────────────────────────────────

interface DayEntry {
  dayIndex: WeekDayIndex
  date: Date
  activities: PlannedActivity[]
}

function WeekGrid({
  days,
  overrideWeekStart,
  showDate,
  isMobile,
}: {
  days: DayEntry[]
  overrideWeekStart?: Date
  showDate: boolean
  isMobile: boolean
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      gap: 0,
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
      background: 'var(--color-surface)',
      flex: isMobile ? undefined : 1,
      minHeight: isMobile ? undefined : 0,
    }}>
      {days.map((day, i) => (
        <div
          key={day.dayIndex}
          style={{
            flex: isMobile ? undefined : 1,
            minWidth: 0,
            borderRight: !isMobile && i < 6 ? '1px solid var(--color-border)' : 'none',
            borderBottom: isMobile && i < 6 ? '1px solid var(--color-border)' : 'none',
          }}
        >
          <DayPlanColumn
            date={day.date}
            dayIndex={day.dayIndex}
            activities={day.activities}
            overrideWeekStart={overrideWeekStart}
            showDate={showDate}
          />
        </div>
      ))}
    </div>
  )
}
