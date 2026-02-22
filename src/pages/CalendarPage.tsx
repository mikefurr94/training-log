import { AnimatePresence, motion } from 'framer-motion'
import Header from '../components/layout/Header'
import CalendarRoot from '../components/calendar/CalendarRoot'
import GridView from '../components/calendar/GridView'
import ActivityPanel from '../components/activity/ActivityPanel'
import DashboardPage from './DashboardPage'
import PlannerPage from './PlannerPage'
import WeekReviewPage from './WeekReviewPage'
import HabitWeekView from '../components/habits/HabitWeekView'
import HabitGridView from '../components/habits/HabitGridView'
import HabitDashboard from '../components/habits/HabitDashboard'
import { useAppStore } from '../store/useAppStore'
import { useActivities } from '../hooks/useActivities'
import { useCalendarRange } from '../hooks/useCalendarRange'

// Separate component so hooks run inside the calendar data context
function GridContainer() {
  const activitiesByDate = useActivities()
  const { anchor } = useCalendarRange()
  return <GridView anchor={anchor} activitiesByDate={activitiesByDate} />
}

export default function CalendarPage() {
  const error = useAppStore((s) => s.error)
  const setError = useAppStore((s) => s.setError)
  const activeApp = useAppStore((s) => s.activeApp)
  const appMode = useAppStore((s) => s.appMode)
  const habitView = useAppStore((s) => s.habitView)

  const isTraining = activeApp === 'training'
  const viewKey = isTraining ? appMode : habitView

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden',
      background: 'var(--color-bg)',
    }}>
      <Header />

      {error && (
        <div style={{
          background: 'var(--color-status-missed-bg)',
          borderBottom: '1px solid var(--color-status-missed-border)',
          color: 'var(--color-status-missed-text)',
          fontSize: 'var(--font-size-sm)',
          padding: '8px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} style={{ color: 'var(--color-status-missed-text)', fontWeight: 600, fontSize: 18, lineHeight: 1 }}>×</button>
        </div>
      )}

      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={viewKey}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          >
            {/* Training views */}
            {isTraining && appMode === 'calendar' && <CalendarRoot />}

            {isTraining && appMode === 'grid' && (
              <div style={{ flex: 1, overflow: 'auto' }}>
                <GridContainer />
              </div>
            )}

            {isTraining && appMode === 'dashboard' && (
              <div style={{ flex: 1, overflow: 'auto' }}>
                <DashboardPage />
              </div>
            )}

            {isTraining && appMode === 'planner' && (
              <div style={{ flex: 1, overflow: 'auto' }}>
                <PlannerPage />
              </div>
            )}

            {isTraining && appMode === 'review' && (
              <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <WeekReviewPage />
              </div>
            )}

            {/* Habit views */}
            {!isTraining && habitView === 'week' && (
              <div style={{ flex: 1, overflow: 'auto', padding: '24px 24px 40px' }}>
                <HabitWeekView />
              </div>
            )}

            {!isTraining && habitView === 'grid' && (
              <div style={{ flex: 1, overflow: 'auto', padding: '24px 24px 40px' }}>
                <HabitGridView />
              </div>
            )}

            {!isTraining && habitView === 'dashboard' && (
              <div style={{ flex: 1, overflow: 'auto', padding: '24px 24px 40px' }}>
                <HabitDashboard />
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <ActivityPanel />
      </div>
    </div>
  )
}
