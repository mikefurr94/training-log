import { useEffect, useRef } from 'react'
import { startOfYear, startOfWeek, subWeeks, min } from 'date-fns'
import { useAppStore } from '../store/useAppStore'
import { fetchAllActivitiesInRange } from '../api/strava'

/**
 * Proactively ensures activitiesByDate is populated for the full range the
 * calendar grid needs on page load:
 *   - Start of the current year (covers the year heatmap + all monthly views)
 *   - Up to 16 weeks back from today (so the week view always has context)
 *
 * Uses the same markRangeFetched / isRangeFetched caching as useActivities so
 * it never makes duplicate requests, and plays nicely with useDashboardData.
 */
export function useCalendarData() {
  const store = useAppStore()
  const fetchingRef = useRef(false)

  useEffect(() => {
    if (!store.accessToken) return
    if (fetchingRef.current) return

    const today = new Date()
    const yearStart = startOfYear(today)
    const sixteenWeeksAgo = startOfWeek(subWeeks(today, 15), { weekStartsOn: 1 })
    const rangeStart = min([yearStart, sixteenWeeksAgo])
    const rangeEnd = today

    if (store.isRangeFetched(rangeStart, rangeEnd)) return

    fetchingRef.current = true
    store.setLoading(true)
    store.setError(null)

    fetchAllActivitiesInRange(rangeStart, rangeEnd)
      .then((activities) => {
        store.addActivities(activities)
        store.markRangeFetched(rangeStart, rangeEnd)
      })
      .catch((err: Error) => {
        store.setError(err.message)
      })
      .finally(() => {
        store.setLoading(false)
        fetchingRef.current = false
      })
  }, [store.accessToken])
}
