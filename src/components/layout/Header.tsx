import { useState, useRef, useEffect } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useCalendarRange } from '../../hooks/useCalendarRange'
import ViewToggle from '../ui/ViewToggle'
import ActivityFilters from '../ui/ActivityFilters'
import type { AppMode, HabitView } from '../../store/types'

const TRAINING_TABS: { mode: AppMode; label: string }[] = [
  { mode: 'calendar',  label: 'Calendar'  },
  { mode: 'grid',      label: 'Grid'      },
  { mode: 'dashboard', label: 'Dashboard' },
  { mode: 'planner',   label: 'Planner'   },
  { mode: 'review',    label: 'Review'    },
]

const HABIT_TABS: { mode: HabitView; label: string }[] = [
  { mode: 'week',      label: 'Weekly'    },
  { mode: 'grid',      label: 'Grid'      },
  { mode: 'dashboard', label: 'Dashboard' },
]

export default function Header() {
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
  const { label } = useCalendarRange()

  const isTraining = activeApp === 'training'
  const isCalendarMode = isTraining && appMode === 'calendar'
  const showCalendarNav = isTraining && (appMode === 'calendar' || appMode === 'grid')
  const showFilters = isTraining && (appMode === 'calendar' || appMode === 'grid' || appMode === 'dashboard' || appMode === 'review')

  return (
    <header style={{
      height: 60,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '0 16px',
      background: 'var(--color-surface)',
      borderBottom: '1px solid var(--color-border)',
      flexShrink: 0,
      position: 'relative',
      zIndex: 10,
      overflow: 'visible',
      minWidth: 0,
    }}>
      {/* App switcher */}
      <AppSwitcher activeApp={activeApp} onSwitch={setActiveApp} />

      {/* Divider */}
      <div style={{ width: 1, height: 24, background: 'var(--color-border)', marginLeft: 2 }} />

      {/* Mode tabs */}
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
            <button
              key={mode}
              onClick={() => setAppMode(mode)}
              style={tabStyle(appMode === mode)}
            >
              {mLabel}
            </button>
          ))
        ) : (
          HABIT_TABS.map(({ mode, label: mLabel }) => (
            <button
              key={mode}
              onClick={() => setHabitView(mode)}
              style={tabStyle(habitView === mode)}
            >
              {mLabel}
            </button>
          ))
        )}
      </div>

      {/* Period nav — shown in calendar and grid modes */}
      {showCalendarNav && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 4 }}>
          <NavButton onClick={() => navigate('prev')} label="Previous period">‹</NavButton>

          <button
            onClick={goToToday}
            style={{
              padding: '4px 10px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--color-text-secondary)',
              background: 'transparent',
              border: '1px solid var(--color-border)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Today
          </button>

          <span style={{
            fontSize: 'var(--font-size-sm)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-text-primary)',
            minWidth: 90,
            textAlign: 'center',
            letterSpacing: '-0.2px',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            whiteSpace: 'nowrap',
          }}>
            {isLoading && (
              <span style={{
                width: 10, height: 10,
                border: '2px solid var(--color-border)',
                borderTopColor: 'var(--color-accent)',
                borderRadius: '50%',
                display: 'inline-block',
                animation: 'spin 0.7s linear infinite',
                flexShrink: 0,
              }} />
            )}
            {label}
          </span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

          <NavButton onClick={() => navigate('next')} label="Next period">›</NavButton>
        </div>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Activity filters — training only */}
      {showFilters && (
        <div style={{ flexShrink: 1, minWidth: 0, overflow: 'hidden' }}>
          <ActivityFilters />
        </div>
      )}

      {/* Divider */}
      <div style={{ width: 1, height: 28, background: 'var(--color-border)' }} />

      {/* Calendar view toggle — only in calendar mode */}
      {isCalendarMode && (
        <>
          <ViewToggle />
          <div style={{ width: 1, height: 28, background: 'var(--color-border)' }} />
        </>
      )}

      {/* Unit toggle — training only */}
      {isTraining && (
        <button
          onClick={() => setDistanceUnit(distanceUnit === 'mi' ? 'km' : 'mi')}
          style={{
            padding: '4px 10px',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--font-size-sm)',
            fontWeight: 'var(--font-weight-medium)',
            color: 'var(--color-text-secondary)',
            background: 'transparent',
            border: '1px solid var(--color-border)',
            cursor: 'pointer',
            minWidth: 42,
          }}
          title="Toggle distance unit"
        >
          {distanceUnit}
        </button>
      )}

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        style={{
          padding: '4px 10px',
          borderRadius: 'var(--radius-sm)',
          fontSize: 16,
          color: 'var(--color-text-secondary)',
          background: 'transparent',
          border: '1px solid var(--color-border)',
          cursor: 'pointer',
          minWidth: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {theme === 'light' ? '🌙' : '☀️'}
      </button>

      {/* Athlete avatar */}
      {athlete && (
        <button
          title={`${athlete.firstname} ${athlete.lastname} — click to disconnect`}
          onClick={() => {
            if (confirm('Disconnect from Strava and clear all data?')) logout()
          }}
          style={{
            width: 32, height: 32,
            borderRadius: '50%',
            overflow: 'hidden',
            border: '2px solid var(--color-border)',
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
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

// ── App switcher dropdown ────────────────────────────────────────────────────

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
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '4px 8px 4px 4px',
          borderRadius: 'var(--radius-sm)',
          border: 'none',
          background: open ? 'var(--color-bg)' : 'transparent',
          cursor: 'pointer',
          transition: 'background 120ms ease',
        }}
      >
        <span style={{ fontSize: 20 }}>{emoji}</span>
        <span style={{
          fontWeight: 'var(--font-weight-bold)',
          fontSize: 'var(--font-size-base)',
          color: 'var(--color-text-primary)',
          letterSpacing: '-0.3px',
        }}>
          {label}
        </span>
        <span style={{
          fontSize: 10,
          color: 'var(--color-text-tertiary)',
          marginLeft: 2,
          transition: 'transform 150ms ease',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        }}>
          ▾
        </span>
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)',
          padding: 4,
          minWidth: 180,
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}>
          <DropdownItem
            emoji="🏃"
            label="Training Log"
            active={isTraining}
            onClick={() => { onSwitch('training'); setOpen(false) }}
          />
          <DropdownItem
            emoji="✅"
            label="Habit Log"
            active={!isTraining}
            onClick={() => { onSwitch('habits'); setOpen(false) }}
          />
        </div>
      )}
    </div>
  )
}

function DropdownItem({ emoji, label, active, onClick }: { emoji: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        borderRadius: 'var(--radius-sm)',
        border: 'none',
        background: active ? 'var(--color-accent-light)' : 'transparent',
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left',
        transition: 'background 120ms ease',
      }}
    >
      <span style={{ fontSize: 16 }}>{emoji}</span>
      <span style={{
        fontSize: 'var(--font-size-sm)',
        fontWeight: active ? 600 : 500,
        color: active ? 'var(--color-accent)' : 'var(--color-text-primary)',
      }}>
        {label}
      </span>
      {active && (
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-accent)' }}>✓</span>
      )}
    </button>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function tabStyle(active: boolean): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '5px 9px',
    borderRadius: 7,
    fontSize: 'var(--font-size-sm)',
    fontWeight: active ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
    color: active ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
    background: active ? 'var(--color-accent)' : 'transparent',
    transition: 'all var(--transition-fast)',
    whiteSpace: 'nowrap',
    boxShadow: active ? '0 1px 3px rgba(99,102,241,0.3)' : 'none',
    border: 'none',
    cursor: 'pointer',
  }
}

function NavButton({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      style={{
        width: 28, height: 28,
        borderRadius: 'var(--radius-sm)',
        background: 'transparent',
        border: '1px solid var(--color-border)',
        color: 'var(--color-text-secondary)',
        fontSize: 20,
        lineHeight: 1,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 300,
      }}
    >
      {children}
    </button>
  )
}
