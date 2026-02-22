import React from 'react'

export default function LoginPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f8f9fa 0%, #eef2ff 100%)',
    }}>
      <div style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-lg)',
        padding: '48px 56px',
        maxWidth: 420,
        width: '100%',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--space-6)',
      }}>
        {/* Logo */}
        <div style={{
          width: 56,
          height: 56,
          background: 'var(--color-accent-light)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
          marginBottom: 4,
        }}>
          🏃
        </div>

        <div>
          <h1 style={{
            fontSize: 'var(--font-size-2xl)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--color-text-primary)',
            letterSpacing: '-0.5px',
            marginBottom: 8,
          }}>
            Training Log
          </h1>
          <p style={{
            fontSize: 'var(--font-size-base)',
            color: 'var(--color-text-secondary)',
            lineHeight: 'var(--line-height-normal)',
          }}>
            A beautiful calendar view of your Strava activities — runs, lifts, and more.
          </p>
        </div>

        <a
          href="/api/auth/strava"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'var(--color-strava)',
            color: '#ffffff',
            borderRadius: 'var(--radius-md)',
            padding: '12px 24px',
            fontSize: 'var(--font-size-base)',
            fontWeight: 'var(--font-weight-semibold)',
            textDecoration: 'none',
            transition: 'background var(--transition-fast)',
            width: '100%',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-strava-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-strava)')}
        >
          <StravaIcon />
          Connect with Strava
        </a>

        <p style={{
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-text-tertiary)',
          lineHeight: 'var(--line-height-normal)',
        }}>
          Read-only access to your activities. Nothing is ever written or modified.
        </p>
      </div>
    </div>
  )
}

function StravaIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
    </svg>
  )
}
