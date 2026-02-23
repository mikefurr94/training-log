import { useAppStore } from '../store/useAppStore'
import { useIsMobile } from '../hooks/useIsMobile'
import DayPlanColumn from '../components/planning/DayPlanColumn'
import type { WeekDayIndex, PlannedActivity } from '../store/types'

// Mon-Sun day order to match Monday-start weeks (JS dayIndex: Mon=1...Sat=6, Sun=0)
const MON_TO_SUN_ORDER: WeekDayIndex[] = [1, 2, 3, 4, 5, 6, 0]

export default function PlannerPage() {
  const isMobile = useIsMobile()
  const padding = isMobile ? 8 : 16

  return (
    <div style={{
      height: '100%',
      padding,
      overflow: isMobile ? 'auto' : 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <TemplateSection isMobile={isMobile} />
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
        Your default weekly plan — repeats every week unless you customize a specific week via the calendar.
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
