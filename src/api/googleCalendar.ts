// Frontend API calls for Google Calendar integration
import { apiFetch } from './client'

/** Get the Google OAuth authorization URL */
export async function getGoogleAuthUrl(): Promise<string> {
  const res = await apiFetch('/api/google-calendar?path=auth')
  if (!res.ok) throw new Error('Failed to get auth URL')
  const data = await res.json()
  return data.url
}

/** Check if Google Calendar is connected for the current user */
export async function checkGoogleCalendarConnection(): Promise<boolean> {
  const res = await apiFetch('/api/google-calendar?path=sync')
  if (!res.ok) return false
  const data = await res.json()
  return data.connected
}

/** Disconnect Google Calendar */
export async function disconnectGoogleCalendar(): Promise<void> {
  const res = await apiFetch('/api/google-calendar?path=sync', { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to disconnect')
}

/** Sync a planned activity to Google Calendar (create or update) */
export async function syncActivityToCalendar(
  activity: { id: string; type: string; [key: string]: unknown },
  date: string, // 'YYYY-MM-DD'
): Promise<void> {
  const res = await apiFetch('/api/google-calendar?path=sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activity, date, action: 'upsert' }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to sync to calendar')
  }
}

/** Delete a planned activity's calendar event */
export async function deleteCalendarEvent(activityId: string): Promise<void> {
  const res = await apiFetch('/api/google-calendar?path=sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activity: { id: activityId }, action: 'delete' }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to delete calendar event')
  }
}
