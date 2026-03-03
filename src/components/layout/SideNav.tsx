import { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useIsMobile } from '../../hooks/useIsMobile'
import type { ActiveApp } from '../../store/types'

export const SIDEBAR_WIDTH = 64

interface Props {
  open: boolean
  onClose: () => void
}

export default function SideNav({ open, onClose }: Props) {
  const isMobile = useIsMobile()
  if (isMobile) return <MobileDrawer open={open} onClose={onClose} />
  return <DesktopSidebar />
}

// ── SVG Icons ─────────────────────────────────────────────────────────────────

function IconTraining({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {/* Activity waveform */}
      <polyline points="2 12 6 12 8 4 11 20 14 9 16 14 18 14 22 14" />
    </svg>
  )
}

function IconHabits({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {/* Check-list */}
      <path d="M9 11l3 3 8-8" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  )
}

function IconTheme({ isDark }: { isDark: boolean }) {
  return isDark ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

const NAV_ITEMS: { app: ActiveApp; label: string; Icon: React.FC<{ color: string }> }[] = [
  { app: 'training', label: 'Training', Icon: IconTraining },
  { app: 'habits',   label: 'Habits',   Icon: IconHabits },
]

// ── Desktop: persistent slim sidebar ──────────────────────────────────────────

function DesktopSidebar() {
  const activeApp = useAppStore((s) => s.activeApp)
  const setActiveApp = useAppStore((s) => s.setActiveApp)
  const athlete = useAppStore((s) => s.athlete)
  const logout = useAppStore((s) => s.logout)
  const theme = useAppStore((s) => s.theme)
  const toggleTheme = useAppStore((s) => s.toggleTheme)
  const [hoveredApp, setHoveredApp] = useState<ActiveApp | null>(null)
  const [themeHovered, setThemeHovered] = useState(false)
  const [avatarHovered, setAvatarHovered] = useState(false)

  return (
    <nav style={{
      width: SIDEBAR_WIDTH,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      background: 'var(--color-surface)',
      borderRight: '1px solid var(--color-border)',
      paddingTop: 12,
      paddingBottom: 12,
      gap: 2,
      zIndex: 11,
    }}>
      {NAV_ITEMS.map(({ app, label, Icon }) => {
        const active = activeApp === app
        const hovered = hoveredApp === app
        const iconColor = active
          ? 'var(--color-accent)'
          : hovered
            ? 'var(--color-text-primary)'
            : 'var(--color-text-tertiary)'

        return (
          <button
            key={app}
            onClick={() => setActiveApp(app)}
            onMouseEnter={() => setHoveredApp(app)}
            onMouseLeave={() => setHoveredApp(null)}
            title={label}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              width: SIDEBAR_WIDTH - 12,
              padding: '9px 4px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              background: active
                ? 'var(--color-accent-light)'
                : hovered
                  ? 'var(--color-border-light, rgba(0,0,0,0.06))'
                  : 'transparent',
              transition: 'background 150ms ease, color 150ms ease',
            }}
          >
            <Icon color={iconColor} />
            <span style={{
              fontSize: 9,
              fontWeight: active ? 700 : 500,
              color: iconColor,
              letterSpacing: '0.1px',
              lineHeight: 1.2,
              transition: 'color 150ms ease',
            }}>{label}</span>
          </button>
        )
      })}

      <div style={{ flex: 1 }} />

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        onMouseEnter={() => setThemeHovered(true)}
        onMouseLeave={() => setThemeHovered(false)}
        title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        style={{
          width: 36, height: 36, borderRadius: 8,
          color: themeHovered ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
          background: themeHovered ? 'var(--color-border-light, rgba(0,0,0,0.06))' : 'transparent',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 150ms ease, color 150ms ease',
        }}
      >
        <IconTheme isDark={theme === 'light'} />
      </button>

      {/* Avatar / logout */}
      {athlete && (
        <button
          title={`${athlete.firstname} ${athlete.lastname} — click to disconnect`}
          onClick={() => { if (confirm('Disconnect from Strava and clear all data?')) logout() }}
          onMouseEnter={() => setAvatarHovered(true)}
          onMouseLeave={() => setAvatarHovered(false)}
          style={{
            width: 32, height: 32, borderRadius: '50%', overflow: 'hidden',
            border: `2px solid ${avatarHovered ? 'var(--color-accent)' : 'var(--color-border)'}`,
            cursor: 'pointer', padding: 0, marginTop: 4,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--color-accent-light)',
            transition: 'border-color 150ms ease',
          }}
        >
          {athlete.profile_medium ? (
            <img src={athlete.profile_medium} alt={athlete.firstname} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: 14, color: 'var(--color-accent)' }}>{athlete.firstname?.[0]}</span>
          )}
        </button>
      )}
    </nav>
  )
}

// ── Mobile: slide-out drawer ──────────────────────────────────────────────────

function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const activeApp = useAppStore((s) => s.activeApp)
  const setActiveApp = useAppStore((s) => s.setActiveApp)
  const athlete = useAppStore((s) => s.athlete)
  const logout = useAppStore((s) => s.logout)
  const theme = useAppStore((s) => s.theme)
  const toggleTheme = useAppStore((s) => s.toggleTheme)
  const [hoveredApp, setHoveredApp] = useState<ActiveApp | null>(null)

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.35)',
            zIndex: 50,
          }}
        />
      )}

      {/* Drawer panel */}
      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: 220,
        background: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)',
        zIndex: 51,
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 250ms cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex', flexDirection: 'column',
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 16px 12px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{
            fontSize: 'var(--font-size-sm)', fontWeight: 700,
            color: 'var(--color-text-primary)', letterSpacing: '-0.3px',
          }}>Navigation</span>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 6,
            border: '1px solid var(--color-border)', background: 'transparent',
            fontSize: 14, color: 'var(--color-text-secondary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}>✕</button>
        </div>

        {/* Nav items */}
        <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV_ITEMS.map(({ app, label, Icon }) => {
            const active = activeApp === app
            const hovered = hoveredApp === app
            const iconColor = active
              ? 'var(--color-accent)'
              : hovered
                ? 'var(--color-text-primary)'
                : 'var(--color-text-secondary)'

            return (
              <button
                key={app}
                onClick={() => { setActiveApp(app); onClose() }}
                onMouseEnter={() => setHoveredApp(app)}
                onMouseLeave={() => setHoveredApp(null)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px',
                  borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: active
                    ? 'var(--color-accent-light)'
                    : hovered
                      ? 'var(--color-border-light, rgba(0,0,0,0.06))'
                      : 'transparent',
                  width: '100%', textAlign: 'left',
                  transition: 'background 150ms ease',
                }}
              >
                <Icon color={iconColor} />
                <span style={{
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: active ? 700 : 500,
                  color: iconColor,
                  transition: 'color 150ms ease',
                }}>{label}</span>
                {active && (
                  <svg style={{ marginLeft: 'auto' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>

        <div style={{ flex: 1 }} />

        {/* Bottom: theme + avatar */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center', gap: 8,
          paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
        }}>
          <button
            onClick={toggleTheme}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            style={{
              width: 34, height: 34, borderRadius: 8,
              color: 'var(--color-text-secondary)', background: 'transparent',
              border: '1px solid var(--color-border)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <IconTheme isDark={theme === 'light'} />
          </button>

          {athlete && (
            <button
              title={`${athlete.firstname} ${athlete.lastname}`}
              onClick={() => { if (confirm('Disconnect from Strava?')) logout() }}
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
                <span style={{ fontSize: 12, color: 'var(--color-accent)' }}>{athlete.firstname?.[0]}</span>
              )}
            </button>
          )}
        </div>
      </div>
    </>
  )
}
