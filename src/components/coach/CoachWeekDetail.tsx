import type { CoachWeek } from '../../store/types'
import { useAppStore } from '../../store/useAppStore'
import { useIsMobile } from '../../hooks/useIsMobile'
import CoachDayCard from './CoachDayCard'

interface Props {
  week: CoachWeek
}

export default function CoachWeekDetail({ week }: Props) {
  const isMobile = useIsMobile()
  const setCoachSelectedDate = useAppStore((s) => s.setCoachSelectedDate)

  function handleActivityClick(date: string, _activityId: string) {
    setCoachSelectedDate(date)
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
      background: 'var(--color-surface)',
    }}>
      {week.days.map((day) => (
        <CoachDayCard
          key={day.date}
          day={day}
          onActivityClick={(activityId) => handleActivityClick(day.date, activityId)}
        />
      ))}
    </div>
  )
}
