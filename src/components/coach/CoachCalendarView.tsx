import { useMemo } from 'react'
import { format, parseISO, isSameMonth, isSameDay, isToday, startOfMonth } from 'date-fns'
import { buildMonthGrid } from '../../utils/dateUtils'
import { getActivityColor } from '../../utils/activityColors'
import { PHASE_COLORS } from '../../utils/coachUtils'
import { useAppStore } from '../../store/useAppStore'
import { useIsMobile } from '../../hooks/useIsMobile'
import type { CoachPlan, CoachDay, CoachPlannedActivity } from '../../store/types'
import type { ActivityType } from '../../utils/activityColors'

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface Props {
  plan: CoachPlan
  onDayClick?: (date: string) => void
}

export default function CoachCalendarView({ plan, onDayClick }: Props) {
  const isMobile = useIsMobile()
  const raceDate = parseISO(plan.raceDate)

  // Read current month from store
  const coachCalendarMonth = useAppStore((s) => s.coachCalendarMonth)
  const planStart = startOfMonth(parseISO(plan.planStartDate))
  const planEnd = startOfMonth(raceDate)

  const currentMonth = useMemo(() => {
    if (coachCalendarMonth) return startOfMonth(parseISO(coachCalendarMonth))
    const todayM = startOfMonth(new Date())
    if (todayM < planStart) return planStart
    if (todayM > planEnd) return planEnd
    return todayM
  }, [coachCalendarMonth, plan.planStartDate, plan.raceDate])

  // Build lookups: date string -> CoachDay, date string -> phase
  const daysByDate = useMemo(() => {
    const map: Record<string, CoachDay> = {}
    for (const week of plan.weeks) {
      for (const day of week.days) {
        map[day.date] = day
      }
    }
    return map
  }, [plan.weeks])

  const phaseByDate = useMemo(() => {
    const map: Record<string, string> = {}
    for (const week of plan.weeks) {
      for (const day of week.days) {
        map[day.date] = week.phase
      }
    }
    return map
  }, [plan.weeks])

  const weeks = buildMonthGrid(currentMonth)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
      {/* Day-of-week headers */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4,
      }}>
        {DAY_HEADERS.map((d) => (
          <div key={d} style={{
            fontSize: 'var(--font-size-xs)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-text-tertiary)',
            textAlign: 'center',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            padding: '4px 0',
          }}>
            {isMobile ? d[0] : d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{
        flex: 1, display: 'grid',
        gridTemplateRows: `repeat(${weeks.length}, 1fr)`,
        gap: 4,
      }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{
            display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4,
          }}>
            {week.map((date) => {
              const key = format(date, 'yyyy-MM-dd')
              const coachDay = daysByDate[key]
              const phase = phaseByDate[key]
              const isRace = isSameDay(date, raceDate)
              const outsideMonth = !isSameMonth(date, currentMonth)
              const inPlan = !!coachDay
              const today = isToday(date)

              return (
                <CoachDayCell
                  key={key}
                  date={date}
                  coachDay={coachDay}
                  phase={phase}
                  isRaceDay={isRace}
                  outsideMonth={outsideMonth}
                  inPlan={inPlan}
                  isToday={today}
                  isMobile={isMobile}
                  onClick={() => inPlan && onDayClick?.(key)}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Day Cell ──────────────────────────────────────────────────────────────────

interface DayCellProps {
  date: Date
  coachDay?: CoachDay
  phase?: string
  isRaceDay: boolean
  outsideMonth: boolean
  inPlan: boolean
  isToday: boolean
  isMobile: boolean
  onClick: () => void
}

function CoachDayCell({
  date, coachDay, phase, isRaceDay, outsideMonth, inPlan, isToday: today, isMobile, onClick,
}: DayCellProps) {
  const activities = coachDay?.activities ?? []
  const nonRestActivities = activities.filter((a) => a.type !== 'Rest')
  const isRestDay = activities.length > 0 && nonRestActivities.length === 0

  const MAX_BADGES = isMobile ? 2 : 3
  const visible = nonRestActivities.slice(0, MAX_BADGES)
  const overflow = nonRestActivities.length - MAX_BADGES

  return (
    <div
      onClick={onClick}
      style={{
        padding: isMobile ? '4px 4px' : '6px 8px',
        background: isRaceDay
          ? '#fef2f2'
          : today
          ? 'var(--color-today-bg)'
          : outsideMonth
          ? 'var(--color-outside-month)'
          : inPlan
          ? 'var(--color-surface)'
          : 'var(--color-outside-month)',
        borderRadius: 'var(--radius-sm)',
        opacity: outsideMonth ? 0.35 : inPlan ? 1 : 0.4,
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        minHeight: isMobile ? 60 : 90,
        cursor: inPlan ? 'pointer' : 'default',
        transition: 'background var(--transition-fast)',
        overflow: 'hidden',
        border: isRaceDay
          ? '2px solid #ef4444'
          : today
          ? '1px solid var(--color-accent)'
          : '1px solid transparent',
      }}
    >
      {/* Date number */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div style={{
          fontSize: isMobile ? 'var(--font-size-xs)' : 'var(--font-size-sm)',
          fontWeight: today ? 'var(--font-weight-bold)' : 'var(--font-weight-medium)',
          color: isRaceDay
            ? '#ef4444'
            : today
            ? 'var(--color-accent)'
            : outsideMonth
            ? 'var(--color-text-tertiary)'
            : 'var(--color-text-secondary)',
          lineHeight: 1,
        }}>
          {today && !isMobile ? (
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 22, height: 22, borderRadius: '50%',
              background: 'var(--color-accent)', color: '#fff',
              fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-bold)',
            }}>
              {format(date, 'd')}
            </span>
          ) : (
            format(date, 'd')
          )}
        </div>
        {/* Phase dot */}
        {inPlan && phase && !isRaceDay && !isMobile && (
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: PHASE_COLORS[phase] ?? 'var(--color-border)',
          }} />
        )}
      </div>

      {/* Race day label */}
      {isRaceDay && (
        <div style={{
          fontSize: isMobile ? 9 : 10,
          fontWeight: 700,
          color: '#ef4444',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          lineHeight: 1,
        }}>
          Race Day
        </div>
      )}

      {/* Rest day indicator */}
      {isRestDay && !isRaceDay && (
        <div style={{
          fontSize: isMobile ? 9 : 10,
          color: 'var(--color-text-tertiary)',
          fontStyle: 'italic',
        }}>
          Rest
        </div>
      )}

      {/* Activity badges */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
        {visible.map((activity) => (
          <CoachActivityBadge key={activity.id} activity={activity} isMobile={isMobile} />
        ))}
        {overflow > 0 && (
          <div style={{
            fontSize: 10, color: 'var(--color-text-tertiary)',
            padding: '1px 4px', fontWeight: 500,
          }}>
            +{overflow} more
          </div>
        )}
      </div>
    </div>
  )
}

// ── Activity Badge ────────────────────────────────────────────────────────────

function CoachActivityBadge({ activity, isMobile }: { activity: CoachPlannedActivity; isMobile: boolean }) {
  const colors = getActivityColor(activity.type as ActivityType)
  const distText = activity.targetDistanceMiles ? `${activity.targetDistanceMiles} mi` : ''

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: isMobile ? 3 : 4,
      width: '100%',
      background: colors.light,
      border: `1px solid ${colors.border}`,
      borderRadius: 5,
      padding: isMobile ? '2px 4px' : '3px 7px',
      overflow: 'hidden',
      minWidth: 0,
    }}>
      <span style={{ fontSize: isMobile ? 9 : 11, flexShrink: 0 }}>{colors.emoji}</span>
      <span style={{
        fontSize: isMobile ? 9 : 'var(--font-size-xs)',
        fontWeight: 'var(--font-weight-medium)',
        color: colors.bg,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        minWidth: 0, lineHeight: 1.2, letterSpacing: '-0.1px',
      }}>
        {distText || activity.label}
      </span>
    </div>
  )
}
