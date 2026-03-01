import { useMemo } from 'react'
import { format, parseISO, differenceInDays, isWithinInterval, addDays } from 'date-fns'
import { useAppStore } from '../../store/useAppStore'
import { useIsMobile } from '../../hooks/useIsMobile'
import { RACE_DISTANCE_LABELS } from '../../utils/coachUtils'
import CoachProgressBar from './CoachProgressBar'
import CoachWeekCard from './CoachWeekCard'
import CoachWeekDetail from './CoachWeekDetail'
import CoachDayDetailPanel from './CoachDayDetailPanel'

export default function CoachPlanOverview() {
  const coachPlan = useAppStore((s) => s.coachPlan)
  const coachSelectedWeek = useAppStore((s) => s.coachSelectedWeek)
  const setCoachSelectedWeek = useAppStore((s) => s.setCoachSelectedWeek)
  const coachSelectedDate = useAppStore((s) => s.coachSelectedDate)
  const setCoachSelectedDate = useAppStore((s) => s.setCoachSelectedDate)
  const isMobile = useIsMobile()

  const currentWeekIndex = useMemo(() => {
    if (!coachPlan) return 0
    const today = new Date()
    return coachPlan.weeks.findIndex((week) => {
      const start = parseISO(week.weekStart)
      const end = addDays(start, 6)
      return isWithinInterval(today, { start, end })
    })
  }, [coachPlan])

  if (!coachPlan) return null

  const raceDate = parseISO(coachPlan.raceDate)
  const daysUntilRace = differenceInDays(raceDate, new Date())

  // Find the selected day for the detail panel
  const selectedDay = coachSelectedDate
    ? coachPlan.weeks.flatMap((w) => w.days).find((d) => d.date === coachSelectedDate)
    : null
  const selectedWeekForDay = coachSelectedDate
    ? coachPlan.weeks.find((w) => w.days.some((d) => d.date === coachSelectedDate))
    : null

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 16, flex: 1,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        flexWrap: 'wrap', gap: 8,
      }}>
        <div>
          <h2 style={{
            margin: 0, fontSize: isMobile ? 18 : 22,
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--color-text-primary)',
            letterSpacing: '-0.3px',
          }}>
            {RACE_DISTANCE_LABELS[coachPlan.raceDistance]}
          </h2>
          <p style={{
            margin: '2px 0 0', fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)',
          }}>
            Race day: {format(raceDate, 'MMMM d, yyyy')}
          </p>
        </div>
        <div style={{
          padding: '6px 14px', borderRadius: 'var(--radius-md)',
          background: daysUntilRace <= 14 ? '#fef2f2' : 'var(--color-accent-light)',
          border: `1px solid ${daysUntilRace <= 14 ? '#fecaca' : 'var(--color-accent)'}`,
        }}>
          <span style={{
            fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)',
            color: daysUntilRace <= 14 ? '#ef4444' : 'var(--color-accent)',
          }}>
            {daysUntilRace}
          </span>
          <span style={{
            fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)',
            marginLeft: 4,
          }}>
            days to go
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <CoachProgressBar weeks={coachPlan.weeks} currentWeekIndex={currentWeekIndex} />

      {/* Week list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {coachPlan.weeks.map((week) => (
          <div key={week.weekNumber}>
            <CoachWeekCard
              week={week}
              isExpanded={coachSelectedWeek === week.weekNumber}
              isCurrent={week.weekNumber - 1 === currentWeekIndex}
              onClick={() =>
                setCoachSelectedWeek(
                  coachSelectedWeek === week.weekNumber ? null : week.weekNumber
                )
              }
            />
            {coachSelectedWeek === week.weekNumber && (
              <div style={{ marginTop: 6 }}>
                <CoachWeekDetail week={week} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Day detail panel */}
      {selectedDay && selectedWeekForDay && (
        <CoachDayDetailPanel
          day={selectedDay}
          week={selectedWeekForDay}
          onClose={() => setCoachSelectedDate(null)}
        />
      )}
    </div>
  )
}
