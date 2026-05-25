import { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useIsMobile } from '../../hooks/useIsMobile'
import { useGoogleCalendar } from '../../hooks/useGoogleCalendar'
import type { AppMode, FeatureFlags } from '../../store/types'

export const SIDEBAR_WIDTH = 64

export default function SideNav() {
  const isMobile = useIsMobile()
  if (isMobile) return null
  return <DesktopSidebar />
}

// ── SVG Icons ─────────────────────────────────────────────────────────────────

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

function IconPredictor({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
      <line x1="12" y1="2" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="2" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="22" y2="12" />
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

function IconCalendarSync({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <path d="M9 16l2 2 4-4" />
    </svg>
  )
}

function IconAdmin({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

// ── Admin Panel ───────────────────────────────────────────────────────────────

function AdminPanel({ onClose }: { onClose: () => void }) {
  const featureFlags = useAppStore((s) => s.featureFlags)
  const setFeatureFlag = useAppStore((s) => s.setFeatureFlag)

  const flags: { key: keyof FeatureFlags; label: string; description: string }[] = [
    { key: 'chatEnabled', label: 'AI Chat', description: 'Coach chat interface' },
  ]

  return (
    <div style={{
      position: 'fixed',
      left: SIDEBAR_WIDTH + 8, bottom: 12, zIndex: 100,
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 10,
      padding: '12px 14px',
      width: 220,
      boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-tertiary)', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
          Feature Flags
        </span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', padding: 2, lineHeight: 1 }}>✕</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {flags.map(({ key, label, description }) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>{label}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{description}</div>
            </div>
            <button
              onClick={() => setFeatureFlag(key, !featureFlags[key])}
              style={{
                width: 38, height: 22, borderRadius: 11,
                background: featureFlags[key] ? 'var(--color-accent)' : 'var(--color-border)',
                border: 'none', cursor: 'pointer', flexShrink: 0,
                position: 'relative', transition: 'background 200ms ease',
              }}
            >
              <div style={{
                position: 'absolute', top: 3, left: featureFlags[key] ? 19 : 3,
                width: 16, height: 16, borderRadius: '50%',
                background: 'white',
                transition: 'left 200ms ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Nav items ─────────────────────────────────────────────────────────────────

const NAV_ITEMS: { mode: AppMode; label: string; Icon: React.FC<{ color: string }> }[] = [
  { mode: 'calendar',  label: 'Calendar',  Icon: IconCalendar },
  { mode: 'grid',      label: 'Grid',      Icon: IconGrid },
  { mode: 'dashboard', label: 'Dashboard', Icon: IconDashboard },
  { mode: 'review',    label: 'Review',    Icon: IconReview },
  { mode: 'predictor', label: 'Predictor', Icon: IconPredictor },
]

// ── Desktop sidebar ───────────────────────────────────────────────────────────

function DesktopSidebar() {
  const appMode = useAppStore((s) => s.appMode)
  const setAppMode = useAppStore((s) => s.setAppMode)
  const athlete = useAppStore((s) => s.athlete)
  const logout = useAppStore((s) => s.logout)
  const theme = useAppStore((s) => s.theme)
  const toggleTheme = useAppStore((s) => s.toggleTheme)
  const { connected: gcalConnected, connect: connectGcal, disconnect: disconnectGcal } = useGoogleCalendar()
  const [hoveredMode, setHoveredMode] = useState<AppMode | null>(null)
  const [themeHovered, setThemeHovered] = useState(false)
  const [gcalHovered, setGcalHovered] = useState(false)
  const [avatarHovered, setAvatarHovered] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [adminHovered, setAdminHovered] = useState(false)

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
      {NAV_ITEMS.map(({ mode, label, Icon }) => {
        const active = appMode === mode
        const hovered = hoveredMode === mode
        const iconColor = active
          ? 'var(--color-accent)'
          : hovered
            ? 'var(--color-text-primary)'
            : 'var(--color-text-tertiary)'

        return (
          <button
            key={mode}
            onClick={() => setAppMode(mode)}
            onMouseEnter={() => setHoveredMode(mode)}
            onMouseLeave={() => setHoveredMode(null)}
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
              transition: 'background 150ms ease',
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

      {adminOpen && <AdminPanel onClose={() => setAdminOpen(false)} />}

      <button
        onClick={() => setAdminOpen((v) => !v)}
        onMouseEnter={() => setAdminHovered(true)}
        onMouseLeave={() => setAdminHovered(false)}
        title="Feature flags"
        style={{
          width: 36, height: 36, borderRadius: 8,
          color: adminOpen ? 'var(--color-accent)' : adminHovered ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
          background: adminOpen ? 'var(--color-accent-light)' : adminHovered ? 'var(--color-border-light, rgba(0,0,0,0.06))' : 'transparent',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 150ms ease, color 150ms ease',
        }}
      >
        <IconAdmin color={adminOpen ? 'var(--color-accent)' : adminHovered ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)'} />
      </button>

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

      <button
        onClick={() => {
          if (gcalConnected) {
            if (confirm('Disconnect Google Calendar?')) disconnectGcal()
          } else {
            connectGcal()
          }
        }}
        onMouseEnter={() => setGcalHovered(true)}
        onMouseLeave={() => setGcalHovered(false)}
        title={gcalConnected ? 'Google Calendar connected — click to disconnect' : 'Connect Google Calendar'}
        style={{
          width: 36, height: 36, borderRadius: 8,
          color: gcalConnected ? 'var(--color-accent)' : gcalHovered ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
          background: gcalHovered ? 'var(--color-border-light, rgba(0,0,0,0.06))' : 'transparent',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 150ms ease, color 150ms ease',
          position: 'relative',
        }}
      >
        <IconCalendarSync color={gcalConnected ? 'var(--color-accent)' : gcalHovered ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)'} />
        {gcalConnected && (
          <div style={{
            position: 'absolute', bottom: 4, right: 4,
            width: 6, height: 6, borderRadius: '50%',
            background: '#22c55e',
            border: '1.5px solid var(--color-surface)',
          }} />
        )}
      </button>

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
