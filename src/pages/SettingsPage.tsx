import { useEffect, useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { fetchMe, logout as logoutApi, disconnectStrava } from '../api/auth'
import { useAppStore } from '../store/useAppStore'

export default function SettingsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const user = useAppStore((s) => s.user)
  const stravaConnected = useAppStore((s) => s.stravaConnected)
  const setStravaConnected = useAppStore((s) => s.setStravaConnected)
  const logout = useAppStore((s) => s.logout)
  const [disconnecting, setDisconnecting] = useState(false)

  const stravaStatus = searchParams.get('strava')

  // Refresh Strava connection status after returning from the OAuth flow
  useEffect(() => {
    if (!stravaStatus) return
    fetchMe().then((me) => {
      if (me) setStravaConnected(me.stravaConnected)
    })
    searchParams.delete('strava')
    setSearchParams(searchParams, { replace: true })
  }, [stravaStatus])

  async function handleLogout() {
    await logoutApi()
    logout()
    navigate('/login', { replace: true })
  }

  async function handleDisconnectStrava() {
    setDisconnecting(true)
    try {
      await disconnectStrava()
      setStravaConnected(false)
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <div style={{
      maxWidth: 560,
      margin: '0 auto',
      padding: '32px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 24,
    }}>
      <div>
        <Link to="/" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)' }}>← Back</Link>
        <h1 style={{
          fontSize: 'var(--font-size-2xl)',
          fontWeight: 'var(--font-weight-bold)',
          color: 'var(--color-text-primary)',
          margin: '8px 0 0',
        }}>Settings</h1>
      </div>

      {stravaStatus === 'error' && (
        <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: '#fef2f2', color: '#ef4444', fontSize: 'var(--font-size-sm)' }}>
          Something went wrong connecting to Strava. Please try again.
        </div>
      )}

      <section style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}>
        <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Account
        </div>
        <div style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-text-primary)', fontWeight: 600 }}>
          {user?.username}
        </div>
      </section>

      <section style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
      }}>
        <div>
          <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--color-text-primary)' }}>Strava</div>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)' }}>
            {stravaConnected ? 'Connected — activities sync automatically.' : 'Not connected. Connect to import your activities.'}
          </div>
        </div>
        {stravaConnected ? (
          <button
            onClick={handleDisconnectStrava}
            disabled={disconnecting}
            style={secondaryButtonStyle}
          >
            {disconnecting ? 'Disconnecting…' : 'Disconnect'}
          </button>
        ) : (
          <a href="/api/auth/strava-connect" style={primaryButtonStyle}>Connect Strava</a>
        )}
      </section>

      <button onClick={handleLogout} style={{ ...secondaryButtonStyle, alignSelf: 'flex-start' }}>
        Log out
      </button>
    </div>
  )
}

const primaryButtonStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 'var(--radius-md)',
  border: 'none',
  background: 'var(--color-strava)',
  color: '#fff',
  fontSize: 'var(--font-size-sm)',
  fontWeight: 600,
  textDecoration: 'none',
  whiteSpace: 'nowrap',
}

const secondaryButtonStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
  color: 'var(--color-text-secondary)',
  fontSize: 'var(--font-size-sm)',
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}
