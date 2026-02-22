import { AnimatePresence, motion } from 'framer-motion'
import { parseISO } from 'date-fns'
import { useAppStore } from '../../store/useAppStore'
import { useActivities } from '../../hooks/useActivities'
import { useCalendarRange } from '../../hooks/useCalendarRange'
import WeekView from './WeekView'
import MonthView from './MonthView'
import QuarterView from './QuarterView'
import SixMonthView from './SixMonthView'
import YearView from './YearView'

export default function CalendarRoot() {
  const currentView = useAppStore((s) => s.currentView)
  const anchorDate = useAppStore((s) => s.anchorDate)
  const activitiesByDate = useActivities()
  const { anchor } = useCalendarRange()

  const sharedProps = { anchor, activitiesByDate }

  const viewMap: Record<string, React.ReactNode> = {
    week: <WeekView {...sharedProps} />,
    month: <MonthView {...sharedProps} showHeader />,
    quarter: <QuarterView {...sharedProps} />,
    '6month': <SixMonthView {...sharedProps} />,
    year: <YearView {...sharedProps} />,
  }

  return (
    <div style={{
      height: '100%',
      padding: currentView === 'year' ? 0 : 16,
      overflow: 'hidden',
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
          style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        >
          {viewMap[currentView]}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
