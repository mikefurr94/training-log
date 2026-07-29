import { apiFetch } from './client'
import type { AuthUser } from '../store/types'

interface MeResponse extends AuthUser {
  stravaConnected: boolean
}

// Plain fetch (not apiFetch) — a 401 here means "wrong credentials", not
// "session expired", so it shouldn't trigger the logout/redirect behavior.
export async function signup(username: string, password: string): Promise<AuthUser> {
  const res = await fetch('/api/auth/signup', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? 'Signup failed')
  return data
}

export async function login(username: string, password: string): Promise<AuthUser> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? 'Login failed')
  return data
}

export async function logout(): Promise<void> {
  await apiFetch('/api/auth/logout', { method: 'POST' })
}

/**
 * Returns the current session's user + Strava connection status, or null if
 * not logged in. Plain fetch (not apiFetch) — an unauthenticated 401 here is
 * the normal state for a logged-out visitor, handled declaratively by
 * RequireAuth, not by apiFetch's redirect-on-401 side effect.
 */
export async function fetchMe(): Promise<MeResponse | null> {
  const res = await fetch('/api/auth/me', { credentials: 'include' })
  if (!res.ok) return null
  return res.json()
}

export async function disconnectStrava(): Promise<void> {
  const res = await apiFetch('/api/auth/strava-disconnect', { method: 'POST' })
  if (!res.ok) throw new Error('Failed to disconnect Strava')
}
