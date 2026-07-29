import { useAppStore } from '../store/useAppStore'

/**
 * Fetch wrapper for our own backend. Always sends the session cookie, and
 * treats a 401 as "no longer logged in" — clears local auth state and sends
 * the user back to /login rather than letting every caller handle it.
 */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(path, { ...init, credentials: 'include' })

  if (res.status === 401) {
    useAppStore.getState().logout()
    if (window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
  }

  return res
}
