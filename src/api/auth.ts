import { useAppStore } from '../store/useAppStore'
import type { StravaAthlete } from '../store/types'

interface TokenResponse {
  access_token: string
  refresh_token: string
  expires_at: number
  athlete: StravaAthlete
}

interface RefreshResponse {
  access_token: string
  refresh_token: string
  expires_at: number
}

// Exchange the OAuth code for tokens (called from CallbackPage)
export async function exchangeCode(code: string): Promise<TokenResponse> {
  const res = await fetch(`/api/auth/callback?code=${encodeURIComponent(code)}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? 'Token exchange failed')
  }
  return res.json()
}

// Get a valid access token, refreshing if necessary
export async function getValidToken(): Promise<string> {
  const store = useAppStore.getState()
  const { accessToken, refreshToken, tokenExpiresAt } = store

  if (!accessToken || !refreshToken) {
    throw new Error('Not authenticated')
  }

  // Refresh if token expires within 5 minutes
  const now = Math.floor(Date.now() / 1000)
  if (tokenExpiresAt && tokenExpiresAt - now < 300) {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })

    if (!res.ok) {
      store.logout()
      throw new Error('Token refresh failed — please reconnect Strava')
    }

    const data: RefreshResponse = await res.json()
    store.updateTokens(data.access_token, data.refresh_token, data.expires_at)
    return data.access_token
  }

  return accessToken
}

export function logout(): void {
  useAppStore.getState().logout()
}
