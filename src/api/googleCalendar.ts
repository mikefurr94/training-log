// Frontend API calls for Google Calendar integration

/** Get the Google OAuth authorization URL */
export async function getGoogleAuthUrl(athleteId: number): Promise<string> {
  const res = await fetch(`/api/google-auth?athlete_id=${athleteId}`)
  if (!res.ok) throw new Error('Failed to get auth URL')
  const data = await res.json()
  return data.url
}

/** Check if Google Calendar is connected for this athlete */
export async function checkGoogleCalendarConnection(athleteId: number): Promise<boolean> {
  const res = await fetch(`/api/google-calendar-sync?athlete_id=${athleteId}`)
  if (!res.ok) return false
  const data = await res.json()
  return data.connected
}

/** Disconnect Google Calendar */
export async function disconnectGoogleCalendar(athleteId: number): Promise<void> {
  const res = await fetch(`/api/google-calendar-sync?athlete_id=${athleteId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Failed to disconnect')
}

/** Sync a planned activity to Google Calendar (create or update) */
export async function syncActivityToCalendar(
  athleteId: number,
  activity: { id: string; type: string; [key: string]: unknown },
  date: string, // 'YYYY-MM-DD'
): Promise<void> {
  const res = await fetch(`/api/google-calendar-sync?athlete_id=${athleteId}`, {
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
export async function deleteCalendarEvent(
  athleteId: number,
  activityId: string,
): Promise<void> {
  const res = await fetch(`/api/google-calendar-sync?athlete_id=${athleteId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activity: { id: activityId }, action: 'delete' }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to delete calendar event')
  }
}
