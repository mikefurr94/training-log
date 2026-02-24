import { AnimatePresence, motion } from 'framer-motion'
import { useAppStore } from '../../store/useAppStore'
import { useActivities } from '../../hooks/useActivities'
import { useCalendarRange } from '../../hooks/useCalendarRange'
import { useCalendarData } from '../../hooks/useCalendarData'
import { usePlannedActivitiesByDate } from '../../hooks/usePlannedActivitiesByDate'
import { useWeather } from '../../hooks/useWeather'
import { useIsMobile } from '../../hooks/useIsMobile'
import WeekView from './WeekView'
import MonthView from './MonthView'
import QuarterView from './QuarterView'
import SixMonthView from './SixMonthView'
import YearView from './YearView'

export default function CalendarRoot() {
  const currentView = useAppStore((s) => s.currentView)
  const anchorDate = useAppStore((s) => s.anchorDate)
  const showPlan = useAppStore((s) => s.showPlan)
  useCalendarData() // proactively fetch YTD + 16 weeks on mount
  const activitiesByDate = useActivities()
  const { anchor, start, end } = useCalendarRange()
  const isMobile = useIsMobile()
  const weatherByDate = useWeather()

  // Always call the hook (React rules) but pass empty object when plan is off
  const rawPlannedByDate = usePlannedActivitiesByDate(start, end)
  const plannedByDate = showPlan ? rawPlannedByDate : {}

  const sharedProps = { anchor, activitiesByDate, plannedByDate, weatherByDate }

  const viewMap: Record<string, React.ReactNode> = {
    week: <WeekView {...sharedProps} />,
    month: <MonthView {...sharedProps} showHeader />,
    quarter: <QuarterView {...sharedProps} />,
    '6month': <SixMonthView {...sharedProps} />,
    year: <YearView anchor={anchor} activitiesByDate={activitiesByDate} />,
  }

  const padding = currentView === 'year' ? 0 : isMobile ? 8 : 16

  return (
    <div style={{
      height: '100%',
      padding,
      overflow: isMobile ? 'auto' : 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={`${currentView}-${anchorDate}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          style={{ flex: 1, overflow: isMobile ? 'visible' : 'hidden', display: 'flex', flexDirection: 'column' }}
        >
          {viewMap[currentView]}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
