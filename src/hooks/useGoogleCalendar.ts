import { useEffect, useCallback } from 'react'
import { useAppStore } from '../store/useAppStore'
import {
  checkGoogleCalendarConnection,
  getGoogleAuthUrl,
  syncActivityToCalendar,
  deleteCalendarEvent,
  disconnectGoogleCalendar,
} from '../api/googleCalendar'
import type { PlannedActivity } from '../store/types'

/**
 * Hook for Google Calendar integration.
 * Checks connection status on mount and provides sync helpers.
 */
export function useGoogleCalendar() {
  const athlete = useAppStore((s) => s.athlete)
  const connected = useAppStore((s) => s.googleCalendarConnected)
  const setConnected = useAppStore((s) => s.setGoogleCalendarConnected)

  // Check connection status on mount + when URL has ?gcal=connected
  useEffect(() => {
    if (!athlete?.id) return

    // Check if we just came back from OAuth
    const params = new URLSearchParams(window.location.search)
    if (params.get('gcal') === 'connected') {
      setConnected(true)
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname)
      return
    }

    // Otherwise check with server
    checkGoogleCalendarConnection(athlete.id).then(setConnected).catch(() => setConnected(false))
  }, [athlete?.id])

  const connect = useCallback(async () => {
    if (!athlete?.id) return
    const url = await getGoogleAuthUrl(athlete.id)
    window.location.href = url
  }, [athlete?.id])

  const disconnect = useCallback(async () => {
    if (!athlete?.id) return
    await disconnectGoogleCalendar(athlete.id)
    setConnected(false)
  }, [athlete?.id])

  const syncActivity = useCallback(async (activity: PlannedActivity, date: string) => {
    if (!athlete?.id || !connected) return
    try {
      await syncActivityToCalendar(athlete.id, activity, date)
    } catch (err) {
      console.error('Failed to sync to Google Calendar:', err)
    }
  }, [athlete?.id, connected])

  const deleteActivity = useCallback(async (activityId: string) => {
    if (!athlete?.id || !connected) return
    try {
      await deleteCalendarEvent(athlete.id, activityId)
    } catch (err) {
      console.error('Failed to delete Google Calendar event:', err)
    }
  }, [athlete?.id, connected])

  return {
    connected,
    connect,
    disconnect,
    syncActivity,
    deleteActivity,
  }
}
