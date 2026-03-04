import { useState } from 'react'
import { parseISO, format } from 'date-fns'
import { useAppStore } from '../../store/useAppStore'
import { useCalendarRange } from '../../hooks/useCalendarRange'
import { getDateRange } from '../../utils/dateUtils'
import { useIsMobile } from '../../hooks/useIsMobile'
import ViewToggle from '../ui/ViewToggle'
import ActivityFilters from '../ui/ActivityFilters'
import type { AppMode, HabitView } from '../../store/types'

// ── Tab SVG Icons (same style as SideNav) ────────────────────────────────────

function IconCalendar({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function IconGrid({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

function IconDashboard({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="3" y1="20" x2="21" y2="20" />
    </svg>
  )
}

function IconReview({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  )
}

function IconWeekly({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <path d="M8 15l2 2 4-4" />
    </svg>
  )
}

// ── Tab Definitions ───────────────────────────────────────────────────────────

const TRAINING_TABS: { mode: AppMode; label: string; Icon: React.FC<{ color: string }> }[] = [
  { mode: 'calendar',  label: 'Calendar',  Icon: IconCalendar },
  { mode: 'grid',      label: 'Grid',      Icon: IconGrid },
  { mode: 'dashboard', label: 'Dashboard', Icon: IconDashboard },
  { mode: 'review',    label: 'Review',    Icon: IconReview },
]

const HABIT_TABS: { mode: HabitView; label: string; Icon: React.FC<{ color: string }> }[] = [
  { mode: 'week',      label: 'Weekly',    Icon: IconWeekly },
  { mode: 'grid',      label: 'Grid',      Icon: IconGrid },
  { mode: 'dashboard', label: 'Dashboard', Icon: IconDashboard },
]

interface HeaderProps {
  onOpenSideNav?: () => void
}

export default function Header({ onOpenSideNav }: HeaderProps) {
  const isMobile = useIsMobile()
  if (isMobile) return <MobileHeader onOpenSideNav={onOpenSideNav} />
  return <DesktopHeader />
}

// ── Desktop Header ──────────────────────────────────────────────────────────

function DesktopHeader() {
  const isLoading = useAppStore((s) => s.isLoading)
  const navigate = useAppStore((s) => s.navigate)
  const goToToday = useAppStore((s) => s.goToToday)
  const distanceUnit = useAppStore((s) => s.distanceUnit)
  const setDistanceUnit = useAppStore((s) => s.setDistanceUnit)
  const activeApp = useAppStore((s) => s.activeApp)
  const appMode = useAppStore((s) => s.appMode)
  const setAppMode = useAppStore((s) => s.setAppMode)
  const habitView = useAppStore((s) => s.habitView)
  const setHabitView = useAppStore((s) => s.setHabitView)
  const showPlan = useAppStore((s) => s.showPlan)
  const toggleShowPlan = useAppStore((s) => s.toggleShowPlan)
  const { label } = useCalendarRange()

  const isTraining = activeApp === 'training'
  const isCalendarMode = isTraining && appMode === 'calendar'
  const isGridMode = isTraining && appMode === 'grid'
  const showCalendarNav = isTraining && (appMode === 'calendar' || appMode === 'grid')
  const showFilters = isTraining && (appMode === 'calendar' || appMode === 'grid' || appMode === 'dashboard' || appMode === 'review')

  // Grid view uses quarter navigation — compute a quarter label from the anchor
  const anchorDate = useAppStore((s) => s.anchorDate)
  const currentView = useAppStore((s) => s.currentView)
  const anchor = parseISO(anchorDate)
  const gridLabel = `Q${Math.ceil((anchor.getMonth() + 1) / 3)} ${format(anchor, 'yyyy')}`
  const navLabel = isGridMode ? gridLabel : label

  // Hide "Today" button when the current view already contains today
  const today = new Date()
  const isViewingToday = isGridMode
    ? anchor.getFullYear() === today.getFullYear()
    : (() => { const { start, end } = getDateRange(currentView, anchor); return today >= start && today <= end })()

  return (
    <header style={{
      height: 60,
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '0 12px',
      background: 'var(--color-surface)',
      borderBottom: '1px solid var(--color-border)',
      flexShrink: 0,
      position: 'relative',
      zIndex: 10,
      overflow: 'visible',
      minWidth: 0,
    }}>
      {/* View tabs */}
      <div style={{
          display: 'flex',
          background: 'var(--color-bg)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 3,
          gap: 1,
          flexShrink: 0,
        }}>
          {isTraining ? (
            TRAINING_TABS.map(({ mode, label: mLabel }) => (
              <button key={mode} onClick={() => setAppMode(mode)} style={tabStyle(appMode === mode)}>
                {mLabel}
              </button>
            ))
          ) : (
            HABIT_TABS.map(({ mode, label: mLabel }) => (
              <button key={mode} onClick={() => setHabitView(mode)} style={tabStyle(habitView === mode)}>
                {mLabel}
              </button>
            ))
          )}
        </div>

      {showCalendarNav && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 4 }}>
          <NavButton onClick={() => navigate('prev')} label="Previous period">‹</NavButton>
          {!isViewingToday && (
            <button onClick={goToToday} style={{
              padding: '4px 10px', borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)',
              color: 'var(--color-text-secondary)', background: 'transparent',
              border: '1px solid var(--color-border)', cursor: 'pointer', whiteSpace: 'nowrap',
            }}>Today</button>
          )}
          <span style={{
            fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-text-primary)', minWidth: 90, textAlign: 'center',
            letterSpacing: '-0.2px', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
          }}>
            {isLoading && <Spinner />}
            {navLabel}
          </span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <NavButton onClick={() => navigate('next')} label="Next period">›</NavButton>
        </div>
      )}

      <div style={{ flex: 1 }} />

      {showFilters && (
        <div style={{ flexShrink: 1, minWidth: 0, overflow: 'hidden' }}>
          <ActivityFilters />
        </div>
      )}

      {/* Plan overlay toggle — available in calendar and grid modes */}
      {isTraining && (appMode === 'calendar' || appMode === 'grid') && (
        <>
          <div style={{ width: 1, height: 28, background: 'var(--color-border)' }} />
          <button
            onClick={toggleShowPlan}
            title={showPlan ? 'Hide training plan overlay' : 'Show training plan overlay'}
            style={{
              padding: '4px 10px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: showPlan ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
              color: showPlan ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              background: showPlan ? 'var(--color-accent-light)' : 'transparent',
              border: showPlan ? '1.5px solid var(--color-accent)' : '1.5px dashed var(--color-border)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all var(--transition-fast)',
            }}
          >
            Plan
          </button>
        </>
      )}

      {isCalendarMode && (
        <>
          <ViewToggle />
          <div style={{ width: 1, height: 28, background: 'var(--color-border)' }} />
        </>
      )}

      {isTraining && (
        <button onClick={() => setDistanceUnit(distanceUnit === 'mi' ? 'km' : 'mi')} style={{
          padding: '4px 10px', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-sm)',
          fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)',
          background: 'transparent', border: '1px solid var(--color-border)', cursor: 'pointer', minWidth: 42,
        }} title="Toggle distance unit">{distanceUnit}</button>
      )}
    </header>
  )
}

// ── Mobile Header ────────────────────────────────────────────────────────────

function MobileHeader({ onOpenSideNav }: { onOpenSideNav?: () => void }) {
  const distanceUnit = useAppStore((s) => s.distanceUnit)
  const setDistanceUnit = useAppStore((s) => s.setDistanceUnit)
  const activeApp = useAppStore((s) => s.activeApp)
  const appMode = useAppStore((s) => s.appMode)
  const showPlan = useAppStore((s) => s.showPlan)
  const toggleShowPlan = useAppStore((s) => s.toggleShowPlan)
  const isTraining = activeApp === 'training'
  const isCalendarMode = isTraining && appMode === 'calendar'
  const showFilters = isTraining && (appMode === 'calendar' || appMode === 'grid' || appMode === 'dashboard' || appMode === 'review')
  const [showMore, setShowMore] = useState(false)

  const appLabel = activeApp === 'training' ? 'Training' : 'Habits'
  const appEmoji = activeApp === 'training' ? '🏃' : '✅'

  return (
    <>
      <header style={{
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        flexShrink: 0,
        position: 'relative',
        zIndex: 10,
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}>
        {/* Row 1: hamburger + app name + settings */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px' }}>
          {/* Hamburger / side nav opener */}
          <button
            onClick={onOpenSideNav}
            style={{
              width: 32, height: 32, borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)', background: 'transparent',
              fontSize: 16, color: 'var(--color-text-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}
          >☰</button>

          {/* Current app indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
            <span style={{ fontSize: 16 }}>{appEmoji}</span>
            <span style={{
              fontWeight: 700, fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-primary)', letterSpacing: '-0.3px',
            }}>{appLabel}</span>
          </div>

          <div style={{ flex: 1 }} />

          {/* More settings button */}
          <button onClick={() => setShowMore(v => !v)} style={{
            width: 32, height: 32, borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)', background: showMore ? 'var(--color-bg)' : 'transparent',
            color: 'var(--color-text-secondary)', fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>⋯</button>
        </div>
      </header>

      {/* Expandable menu */}
      {showMore && (
        <div style={{
          padding: '8px 12px', background: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex', flexDirection: 'column', gap: 8, zIndex: 9, flexShrink: 0,
        }}>
          {showFilters && (
            <div style={{ overflow: 'auto' }}>
              <ActivityFilters />
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {isCalendarMode && <ViewToggle />}
            {/* Plan overlay toggle */}
            {isTraining && (appMode === 'calendar' || appMode === 'grid') && (
              <button
                onClick={toggleShowPlan}
                style={{
                  padding: '5px 12px',
                  borderRadius: 7,
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: showPlan ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
                  color: showPlan ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  background: showPlan ? 'var(--color-accent-light)' : 'transparent',
                  border: showPlan ? '1.5px solid var(--color-accent)' : '1.5px dashed var(--color-border)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all var(--transition-fast)',
                }}
              >
                Plan
              </button>
            )}
            {isTraining && (
              <button onClick={() => setDistanceUnit(distanceUnit === 'mi' ? 'km' : 'mi')} style={{
                padding: '4px 10px', borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--font-size-sm)', fontWeight: 500,
                color: 'var(--color-text-secondary)', background: 'transparent',
                border: '1px solid var(--color-border)', cursor: 'pointer',
              }}>{distanceUnit}</button>
            )}
          </div>
        </div>
      )}
    </>
  )
}

// ── Mobile Bottom Tab Bar ────────────────────────────────────────────────────

export function MobileTabBar() {
  const activeApp = useAppStore((s) => s.activeApp)
  const appMode = useAppStore((s) => s.appMode)
  const setAppMode = useAppStore((s) => s.setAppMode)
  const habitView = useAppStore((s) => s.habitView)
  const setHabitView = useAppStore((s) => s.setHabitView)

  const isTraining = activeApp === 'training'
  const tabs = isTraining ? TRAINING_TABS : HABIT_TABS
  const currentMode = isTraining ? appMode : habitView
  const setMode = isTraining
    ? (mode: string) => setAppMode(mode as AppMode)
    : (mode: string) => setHabitView(mode as HabitView)

  return (
    <nav style={{
      display: 'flex', alignItems: 'stretch',
      background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)',
      flexShrink: 0, paddingBottom: 'env(safe-area-inset-bottom, 0px)', zIndex: 10,
    }}>
      {tabs.map(({ mode, label, Icon }) => {
        const active = currentMode === mode
        const iconColor = active ? 'var(--color-accent)' : 'var(--color-text-tertiary)'
        return (
          <button key={mode} onClick={() => setMode(mode)} style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 2,
            padding: '6px 4px 4px', background: 'transparent', border: 'none',
            cursor: 'pointer', minHeight: 48, position: 'relative',
          }}>
            <Icon color={iconColor} />
            <span style={{
              fontSize: 10, fontWeight: active ? 700 : 500,
              color: active ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
              letterSpacing: '-0.1px',
            }}>{label}</span>
            {active && (
              <div style={{
                position: 'absolute', top: 0, left: '20%', right: '20%',
                height: 2, borderRadius: 1, background: 'var(--color-accent)',
              }} />
            )}
          </button>
        )
      })}
    </nav>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function Spinner({ size = 10 }: { size?: number }) {
  return (
    <span style={{
      width: size, height: size,
      border: `${Math.max(1.5, size / 5)}px solid var(--color-border)`,
      borderTopColor: 'var(--color-accent)',
      borderRadius: '50%',
      display: 'inline-block',
      animation: 'spin 0.7s linear infinite',
      flexShrink: 0,
    }} />
  )
}

function tabStyle(active: boolean): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: 4, padding: '5px 8px', borderRadius: 7,
    fontSize: 12,
    fontWeight: active ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
    color: active ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
    background: active ? 'var(--color-accent)' : 'transparent',
    transition: 'all var(--transition-fast)', whiteSpace: 'nowrap',
    boxShadow: active ? '0 1px 3px rgba(99,102,241,0.3)' : 'none',
    border: 'none', cursor: 'pointer',
  }
}

function NavButton({ onClick, label, children, disabled }: { onClick: () => void; label: string; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button onClick={onClick} aria-label={label} disabled={disabled} style={{
      width: 28, height: 28, borderRadius: 'var(--radius-sm)',
      background: 'transparent', border: '1px solid var(--color-border)',
      color: disabled ? 'var(--color-border)' : 'var(--color-text-secondary)', fontSize: 20, lineHeight: 1,
      cursor: disabled ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 300,
    }}>{children}</button>
  )
}
