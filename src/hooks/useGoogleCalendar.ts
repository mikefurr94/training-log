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
  const user = useAppStore((s) => s.user)
  const connected = useAppStore((s) => s.googleCalendarConnected)
  const setConnected = useAppStore((s) => s.setGoogleCalendarConnected)

  // Check connection status on mount + when URL has ?gcal=connected
  useEffect(() => {
    if (!user) return

    // Check if we just came back from OAuth
    const params = new URLSearchParams(window.location.search)
    if (params.get('gcal') === 'connected') {
      setConnected(true)
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname)
      return
    }

    // Otherwise check with server
    checkGoogleCalendarConnection().then(setConnected).catch(() => setConnected(false))
  }, [user])

  const connect = useCallback(async () => {
    const url = await getGoogleAuthUrl()
    window.location.href = url
  }, [])

  const disconnect = useCallback(async () => {
    await disconnectGoogleCalendar()
    setConnected(false)
  }, [])

  const syncActivity = useCallback(async (activity: PlannedActivity, date: string) => {
    if (!connected) return
    try {
      await syncActivityToCalendar(activity, date)
    } catch (err) {
      console.error('Failed to sync to Google Calendar:', err)
    }
  }, [connected])

  const deleteActivity = useCallback(async (activityId: string) => {
    if (!connected) return
    try {
      await deleteCalendarEvent(activityId)
    } catch (err) {
      console.error('Failed to delete Google Calendar event:', err)
    }
  }, [connected])

  return {
    connected,
    connect,
    disconnect,
    syncActivity,
    deleteActivity,
  }
}
