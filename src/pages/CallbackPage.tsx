import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { exchangeCode } from '../api/auth'
import { useAppStore } from '../store/useAppStore'

export default function CallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const store = useAppStore()
  const [error, setError] = useState<string | null>(null)
  const didRun = useRef(false)

  useEffect(() => {
    if (didRun.current) return
    didRun.current = true

    const code = searchParams.get('code')
    const errorParam = searchParams.get('error')

    if (errorParam || !code) {
      setError(errorParam ?? 'Missing authorization code from Strava')
      return
    }

    exchangeCode(code)
      .then((data) => {
        store.setToken(data.access_token, data.refresh_token, data.expires_at)
        store.setAthlete(data.athlete)
        navigate('/', { replace: true })
      })
      .catch((err: Error) => {
        setError(err.message)
      })
  }, [])

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 16,
      }}>
        <div style={{ fontSize: 32 }}>⚠️</div>
        <p style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>Connection failed</p>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>{error}</p>
        <a
          href="/login"
          style={{
            color: 'var(--color-accent)',
            fontWeight: 500,
            fontSize: 'var(--font-size-sm)',
          }}
        >
          Try again
        </a>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: 16,
    }}>
      <div className="spinner" style={{
        width: 32,
        height: 32,
        border: '3px solid var(--color-border)',
        borderTopColor: 'var(--color-accent)',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
      <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Connecting to Strava…
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
