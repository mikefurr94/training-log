import { useState, useMemo } from 'react'
import { startOfWeek, addWeeks, addDays, format } from 'date-fns'
import { useAppStore } from '../store/useAppStore'
import { useWeekPlan } from '../hooks/useWeekPlan'
import DayPlanColumn from '../components/planning/DayPlanColumn'
import KeyDateBadge from '../components/planning/KeyDateBadge'
import KeyDateModal from '../components/planning/KeyDateModal'
import type { WeekDayIndex, PlannedActivity, KeyDate } from '../store/types'

type PlannerTab = 'week' | 'template'

// Mon-Sun day order to match Monday-start weeks (JS dayIndex: Mon=1...Sat=6, Sun=0)
const MON_TO_SUN_ORDER: WeekDayIndex[] = [1, 2, 3, 4, 5, 6, 0]

export default function PlannerPage() {
  const [activeTab, setActiveTab] = useState<PlannerTab>('week')
  const today = useMemo(() => new Date(), [])
  const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 })
  const week2Start = addWeeks(thisWeekStart, 1)
  const week3Start = addWeeks(thisWeekStart, 2)
  const week4Start = addWeeks(thisWeekStart, 3)

  return (
    <div
      style={{
        height: '100%',
        overflow: 'auto',
        padding: '24px 24px 40px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      {/* Tab toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <TabBtn active={activeTab === 'week'} onClick={() => setActiveTab('week')}>
          4-Week Plan
        </TabBtn>
        <TabBtn active={activeTab === 'template'} onClick={() => setActiveTab('template')}>
          📋 Template
        </TabBtn>
      </div>

      {/* Content */}
      {activeTab === 'week' ? (
        <>
          <WeekSection weekStart={thisWeekStart} label="This Week" />
          <WeekSection weekStart={week2Start} label="Next Week" />
          <WeekSection weekStart={week3Start} label="Week 3" />
          <WeekSection weekStart={week4Start} label="Week 4" />
        </>
      ) : (
        <TemplateSection weekStart={null} />
      )}
    </div>
  )
}

// ── Tab button ───────────────────────────────────────────────────────────────

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 16px',
        borderRadius: 'var(--radius-sm)',
        fontSize: 'var(--font-size-sm)',
        fontWeight: active ? 600 : 500,
        color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
        background: active ? 'var(--color-accent-light)' : 'transparent',
        border: active ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
        cursor: 'pointer',
        transition: 'all 120ms ease',
      }}
    >
      {children}
    </button>
  )
}

// ── Template section ────────────────────────────────────────────────────────

function TemplateSection({ weekStart }: { weekStart: null }) {
  const weekTemplate = useAppStore((s) => s.weekTemplate)

  return (
    <section>
      <SectionHeader
        label="Weekly Template"
        subtitle="Your default plan — repeats every week unless you customize a specific week."
      />
      <WeekGrid
        days={MON_TO_SUN_ORDER.map((dayIndex) => ({
          dayIndex,
          date: new Date(0), // unused in template (no showDate)
          activities: weekTemplate.days[dayIndex] ?? [],
        }))}
        overrideWeekStart={undefined}
        showDate={false}
      />
    </section>
  )
}

// ── Per-week section ─────────────────────────────────────────────────────────

function WeekSection({ weekStart, label }: { weekStart: Date; label: string }) {
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

  const dateRange = `${format(weekStart, 'MMM d')} – ${format(addWeeks(weekStart, 1), 'MMM d, yyyy')}`

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 12 }}>
        <SectionHeader
          label={label}
          subtitle={dateRange}
          inline
        />

        {/* Key date badges */}
        {weekKeyDates.length > 0 && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {weekKeyDates.map((kd) => (
              <KeyDateBadge key={kd.id} keyDate={kd} onClick={() => setEditingKeyDate(kd)} />
            ))}
          </div>
        )}

        {hasOverride && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
            <span
              style={{
                fontSize: 11,
                color: 'var(--color-accent)',
                fontWeight: 600,
                background: 'var(--color-accent-light)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
              }}
            >
              Custom override
            </span>
            <button
              onClick={() => clearWeekOverride(weekStart)}
              style={{
                fontSize: 11,
                color: 'var(--color-text-secondary)',
                background: 'transparent',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-full)',
                padding: '2px 8px',
                cursor: 'pointer',
              }}
            >
              Reset to template
            </button>
          </div>
        )}

        {!hasOverride && (
          <div style={{ marginLeft: 'auto' }} />
        )}

        {/* Add event button */}
        <button
          onClick={() => setShowKeyDateModal(true)}
          style={{
            fontSize: 11,
            color: 'var(--color-text-tertiary)',
            background: 'transparent',
            border: '1px dashed var(--color-border)',
            borderRadius: 'var(--radius-full)',
            padding: '2px 10px',
            cursor: 'pointer',
          }}
        >
          + Event
        </button>
      </div>

      <WeekGrid
        days={weekPlan.map((d) => ({
          dayIndex: d.dayIndex,
          date: d.date,
          activities: d.activities,
        }))}
        overrideWeekStart={weekStart}
        showDate
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
    </section>
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
}: {
  days: DayEntry[]
  overrideWeekStart?: Date
  showDate: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 0,
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        background: 'var(--color-surface)',
      }}
    >
      {days.map((day, i) => (
        <div
          key={day.dayIndex}
          style={{
            flex: 1,
            minWidth: 0,
            borderRight: i < 6 ? '1px solid var(--color-border)' : 'none',
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

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({
  label,
  subtitle,
  inline = false,
}: {
  label: string
  subtitle?: string | null
  inline?: boolean
}) {
  return (
    <div style={{ marginBottom: inline ? 0 : 12 }}>
      <div
        style={{
          fontSize: inline ? 'var(--font-size-sm)' : 'var(--font-size-base)',
          fontWeight: 'var(--font-weight-semibold)',
          color: 'var(--color-text-primary)',
          letterSpacing: '-0.2px',
        }}
      >
        {label}
      </div>
      {subtitle && (
        <div
          style={{
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-tertiary)',
            marginTop: 2,
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  )
}
