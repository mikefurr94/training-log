import { useState, useRef, useEffect } from 'react'
import { parseISO, format } from 'date-fns'
import { useAppStore } from '../../store/useAppStore'
import { useCalendarRange } from '../../hooks/useCalendarRange'
import { getDateRange } from '../../utils/dateUtils'
import { useIsMobile } from '../../hooks/useIsMobile'
import ViewToggle from '../ui/ViewToggle'
import ActivityFilters from '../ui/ActivityFilters'
import type { AppMode, HabitView } from '../../store/types'

const TRAINING_TABS: { mode: AppMode; label: string; icon: string }[] = [
  { mode: 'calendar',  label: 'Calendar',  icon: '📅' },
  { mode: 'grid',      label: 'Grid',      icon: '▦' },
  { mode: 'dashboard', label: 'Dashboard', icon: '📊' },
  { mode: 'review',    label: 'Review',    icon: '📈' },
  { mode: 'planner',   label: 'Template',  icon: '📋' },
]

const HABIT_TABS: { mode: HabitView; label: string; icon: string }[] = [
  { mode: 'week',      label: 'Weekly',    icon: '📋' },
  { mode: 'grid',      label: 'Grid',      icon: '▦' },
  { mode: 'dashboard', label: 'Dashboard', icon: '📊' },
]

export default function Header() {
  const isMobile = useIsMobile()
  if (isMobile) return <MobileHeader />
  return <DesktopHeader />
}

// ── Desktop Header ──────────────────────────────────────────────────────────

function DesktopHeader() {
  const athlete = useAppStore((s) => s.athlete)
  const isLoading = useAppStore((s) => s.isLoading)
  const navigate = useAppStore((s) => s.navigate)
  const goToToday = useAppStore((s) => s.goToToday)
  const logout = useAppStore((s) => s.logout)
  const distanceUnit = useAppStore((s) => s.distanceUnit)
  const setDistanceUnit = useAppStore((s) => s.setDistanceUnit)
  const activeApp = useAppStore((s) => s.activeApp)
  const setActiveApp = useAppStore((s) => s.setActiveApp)
  const appMode = useAppStore((s) => s.appMode)
  const setAppMode = useAppStore((s) => s.setAppMode)
  const habitView = useAppStore((s) => s.habitView)
  const setHabitView = useAppStore((s) => s.setHabitView)
  const theme = useAppStore((s) => s.theme)
  const toggleTheme = useAppStore((s) => s.toggleTheme)
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
      <AppSwitcher activeApp={activeApp} onSwitch={setActiveApp} />
      <div style={{ width: 1, height: 24, background: 'var(--color-border)', marginLeft: 2 }} />

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

      <div style={{ width: 1, height: 28, background: 'var(--color-border)' }} />

      {/* Plan overlay toggle — available in calendar and grid modes */}
      {isTraining && (appMode === 'calendar' || appMode === 'grid') && (
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

      <button onClick={toggleTheme} title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} style={{
        padding: '4px 10px', borderRadius: 'var(--radius-sm)', fontSize: 16,
        color: 'var(--color-text-secondary)', background: 'transparent',
        border: '1px solid var(--color-border)', cursor: 'pointer', minWidth: 36,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{theme === 'light' ? '🌙' : '☀️'}</button>

      {athlete && (
        <button
          title={`${athlete.firstname} ${athlete.lastname} — click to disconnect`}
          onClick={() => { if (confirm('Disconnect from Strava and clear all data?')) logout() }}
          style={{
            width: 32, height: 32, borderRadius: '50%', overflow: 'hidden',
            border: '2px solid var(--color-border)', cursor: 'pointer', padding: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--color-accent-light)',
          }}
        >
          {athlete.profile_medium ? (
            <img src={athlete.profile_medium} alt={athlete.firstname} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: 14, color: 'var(--color-accent)' }}>{athlete.firstname?.[0]}</span>
          )}
        </button>
      )}
    </header>
  )
}

// ── Mobile Header ────────────────────────────────────────────────────────────

function MobileHeader() {
  const athlete = useAppStore((s) => s.athlete)
  const logout = useAppStore((s) => s.logout)
  const distanceUnit = useAppStore((s) => s.distanceUnit)
  const setDistanceUnit = useAppStore((s) => s.setDistanceUnit)
  const activeApp = useAppStore((s) => s.activeApp)
  const setActiveApp = useAppStore((s) => s.setActiveApp)
  const appMode = useAppStore((s) => s.appMode)
  const theme = useAppStore((s) => s.theme)
  const toggleTheme = useAppStore((s) => s.toggleTheme)
  const showPlan = useAppStore((s) => s.showPlan)
  const toggleShowPlan = useAppStore((s) => s.toggleShowPlan)
  const isTraining = activeApp === 'training'
  const isCalendarMode = isTraining && appMode === 'calendar'
  const showFilters = isTraining && (appMode === 'calendar' || appMode === 'grid' || appMode === 'dashboard' || appMode === 'review')
  const [showMore, setShowMore] = useState(false)

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
        {/* Row 1: app switcher + settings */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px' }}>
          {/* App switcher (tap to toggle) */}
          <button
            onClick={() => setActiveApp(isTraining ? 'habits' : 'training')}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '4px 8px',
              borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--color-bg)',
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 16 }}>{isTraining ? '🏃' : '✅'}</span>
            <span style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', letterSpacing: '-0.3px' }}>
              {isTraining ? 'Training' : 'Habits'}
            </span>
            <span style={{ fontSize: 9, color: 'var(--color-text-tertiary)', marginLeft: 1 }}>⇄</span>
          </button>

          <div style={{ flex: 1 }} />

        {/* Settings */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <button onClick={() => setShowMore(v => !v)} style={{
            width: 32, height: 32, borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)', background: showMore ? 'var(--color-bg)' : 'transparent',
            color: 'var(--color-text-secondary)', fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>⋯</button>

          {athlete && (
            <button onClick={() => { if (confirm('Disconnect from Strava?')) logout() }} style={{
              width: 28, height: 28, borderRadius: '50%', overflow: 'hidden',
              border: '2px solid var(--color-border)', cursor: 'pointer', padding: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--color-accent-light)', minHeight: 28, minWidth: 28,
            }}>
              {athlete.profile_medium ? (
                <img src={athlete.profile_medium} alt={athlete.firstname} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: 12, color: 'var(--color-accent)' }}>{athlete.firstname?.[0]}</span>
              )}
            </button>
          )}
        </div>{/* end settings */}
        </div>{/* end row 1 */}
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
            <button onClick={toggleTheme} style={{
              padding: '4px 10px', borderRadius: 'var(--radius-sm)', fontSize: 14,
              color: 'var(--color-text-secondary)', background: 'transparent',
              border: '1px solid var(--color-border)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{theme === 'light' ? '🌙' : '☀️'}</button>
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
      {tabs.map(({ mode, label, icon }) => {
        const active = currentMode === mode
        return (
          <button key={mode} onClick={() => setMode(mode)} style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 2,
            padding: '6px 4px 4px', background: 'transparent', border: 'none',
            cursor: 'pointer', minHeight: 48, position: 'relative',
          }}>
            <span style={{ fontSize: 18, lineHeight: 1, opacity: active ? 1 : 0.5 }}>{icon}</span>
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

// ── App switcher dropdown (desktop) ──────────────────────────────────────────

function AppSwitcher({ activeApp, onSwitch }: { activeApp: string; onSwitch: (app: 'training' | 'habits') => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const isTraining = activeApp === 'training'
  const label = isTraining ? 'Training Log' : 'Habit Log'
  const emoji = isTraining ? '🏃' : '✅'

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button onClick={() => setOpen((v) => !v)} style={{
        display: 'flex', alignItems: 'center', gap: 7, padding: '4px 8px 4px 4px',
        borderRadius: 'var(--radius-sm)', border: 'none',
        background: open ? 'var(--color-bg)' : 'transparent', cursor: 'pointer',
        transition: 'background 120ms ease',
      }}>
        <span style={{ fontSize: 20 }}>{emoji}</span>
        <span style={{ fontWeight: 'var(--font-weight-bold)', fontSize: 'var(--font-size-base)', color: 'var(--color-text-primary)', letterSpacing: '-0.3px' }}>{label}</span>
        <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginLeft: 2, transition: 'transform 150ms ease', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0,
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
          padding: 4, minWidth: 180, zIndex: 100,
          display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          <DropdownItem emoji="🏃" label="Training Log" active={isTraining} onClick={() => { onSwitch('training'); setOpen(false) }} />
          <DropdownItem emoji="✅" label="Habit Log" active={!isTraining} onClick={() => { onSwitch('habits'); setOpen(false) }} />
        </div>
      )}
    </div>
  )
}

function DropdownItem({ emoji, label, active, onClick }: { emoji: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
      borderRadius: 'var(--radius-sm)', border: 'none',
      background: active ? 'var(--color-accent-light)' : 'transparent',
      cursor: 'pointer', width: '100%', textAlign: 'left', transition: 'background 120ms ease',
    }}>
      <span style={{ fontSize: 16 }}>{emoji}</span>
      <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: active ? 600 : 500, color: active ? 'var(--color-accent)' : 'var(--color-text-primary)' }}>{label}</span>
      {active && <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-accent)' }}>✓</span>}
    </button>
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

function NavButton({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-label={label} style={{
      width: 28, height: 28, borderRadius: 'var(--radius-sm)',
      background: 'transparent', border: '1px solid var(--color-border)',
      color: 'var(--color-text-secondary)', fontSize: 20, lineHeight: 1,
      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 300,
    }}>{children}</button>
  )
}
