import { useAppStore } from '../../store/useAppStore'
import CoachCalendarView from './CoachCalendarView'
import CoachDayDetailPanel from './CoachDayDetailPanel'

export default function CoachPlanOverview() {
  const coachPlan = useAppStore((s) => s.coachPlan)
  const coachSelectedDate = useAppStore((s) => s.coachSelectedDate)
  const setCoachSelectedDate = useAppStore((s) => s.setCoachSelectedDate)

  if (!coachPlan) return null

  const selectedDay = coachSelectedDate
    ? coachPlan.weeks.flatMap((w) => w.days).find((d) => d.date === coachSelectedDate)
    : null
  const selectedWeekForDay = coachSelectedDate
    ? coachPlan.weeks.find((w) => w.days.some((d) => d.date === coachSelectedDate))
    : null

  return (
    <>
      <CoachCalendarView
        plan={coachPlan}
        onDayClick={(date) => setCoachSelectedDate(date)}
      />

      {selectedDay && selectedWeekForDay && (
        <CoachDayDetailPanel
          day={selectedDay}
          week={selectedWeekForDay}
          onClose={() => setCoachSelectedDate(null)}
        />
      )}
    </>
  )
}
