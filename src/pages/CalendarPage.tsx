import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Header, { MobileTabBar } from '../components/layout/Header'
import SideNav from '../components/layout/SideNav'
import CalendarRoot from '../components/calendar/CalendarRoot'
import GridView from '../components/calendar/GridView'
import ActivityPanel from '../components/activity/ActivityPanel'
import PlannedActivityPanel from '../components/planning/PlannedActivityPanel'
import DashboardPage from './DashboardPage'
import PlannerPage from './PlannerPage'
import WeekReviewPage from './WeekReviewPage'
import HabitWeekView from '../components/habits/HabitWeekView'
import HabitGridView from '../components/habits/HabitGridView'
import HabitDashboard from '../components/habits/HabitDashboard'
import { useAppStore } from '../store/useAppStore'
import { useActivities } from '../hooks/useActivities'
import { useCalendarRange } from '../hooks/useCalendarRange'
import { useIsMobile } from '../hooks/useIsMobile'
import MobilePeriodNav from '../components/ui/MobilePeriodNav'
// Coach functionality is now integrated into PlannerPage (Plan tab)

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
  const isMobile = useIsMobile()
  const [sideNavOpen, setSideNavOpen] = useState(false)

  const isTraining = activeApp === 'training'
  const viewKey = isTraining ? appMode : activeApp

  const mobilePadding = isMobile ? '12px 12px 20px' : '24px 24px 40px'

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      height: '100vh',
      overflow: 'hidden',
      background: 'var(--color-bg)',
    }}>
      {/* Side navigation */}
      <SideNav open={sideNavOpen} onClose={() => setSideNavOpen(false)} />

      {/* Main column */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minWidth: 0,
        overflow: 'hidden',
      }}>
        <Header onOpenSideNav={() => setSideNavOpen(true)} />

        {error && (
          <div style={{
            background: 'var(--color-status-missed-bg)',
            borderBottom: '1px solid var(--color-status-missed-border)',
            color: 'var(--color-status-missed-text)',
            fontSize: 'var(--font-size-sm)',
            padding: isMobile ? '6px 12px' : '8px 24px',
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
                  {isMobile && <div style={{ padding: '8px 12px 0' }}><MobilePeriodNav /></div>}
                  <GridContainer />
                </div>
              )}

              {isTraining && appMode === 'dashboard' && (
                <div style={{ flex: 1, overflow: 'auto' }}>
                  <DashboardPage />
                </div>
              )}

              {isTraining && appMode === 'planner' && (
                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <PlannerPage />
                </div>
              )}

              {isTraining && appMode === 'review' && (
                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <WeekReviewPage />
                </div>
              )}

              {/* Habit views */}
              {activeApp === 'habits' && habitView === 'week' && (
                <div style={{ flex: 1, overflow: 'auto', padding: mobilePadding }}>
                  <HabitWeekView />
                </div>
              )}

              {activeApp === 'habits' && habitView === 'grid' && (
                <div style={{ flex: 1, overflow: 'auto', padding: mobilePadding }}>
                  <HabitGridView />
                </div>
              )}

              {activeApp === 'habits' && habitView === 'dashboard' && (
                <div style={{ flex: 1, overflow: 'auto', padding: mobilePadding }}>
                  <HabitDashboard />
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <ActivityPanel />
          <PlannedActivityPanel />
        </div>

        {/* Bottom tab bar on mobile */}
        {isMobile && <MobileTabBar />}
      </div>
    </div>
  )
}
